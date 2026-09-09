# AGENTS.md — Portal de Reclutamiento GEMESEG

Este documento contiene todo el contexto, arquitectura, credenciales, reglas y paleta de la aplicación para que cualquier agente o subagente tenga la información a la mano.

---

## 📌 Visión General del Proyecto
- **Nombre:** Portal de Reclutamiento GEMESEG (reclutamiento.gemeseg.com)
- **Repositorio:** `https://github.com/ljbarzola/Reclutamiento`
- **Ruta local:** `C:\Users\leidy\Documents\RECLUTAMIENTO`
- **Arquitectura:** Backend en NestJS (v11) + Frontend en React 18 (Vite + TypeScript).
- **Persistencia:** Google Drive (Shared Drive) — No utiliza base de datos SQL/NoSQL local.

---

## 🎨 Paleta de Colores de la Marca GEMESEG
- **Azul Oscuro:** `#100F31` (Fondos principales, headers, títulos)
- **Azul Claro:** `#12375F` (Gradientes, bordes secundarios, botones secundarios)
- **Naranja:** `#EE3B1B` (Botones de acción principal / CTA, badges de contraste, hovers destacados)
- **Gris Claro:** `#E6E6E6` (Fondo de cuerpo, contenedores secundarios, tarjetas secundarias)

---

## ☁️ Google Cloud & Firebase Context
- **Google Cloud Project ID:** `reclutamiento-505320`
- **Firebase Project ID:** `reclutamiento-505320` (Hosting)
- **Service Account Email:** `gemeseg-servicio-reclutamiento@reclutamiento-505320.iam.gserviceaccount.com`
- **Google Drive Folder ID (Shared Drive):** `1VM4Ypbbs0xOBvt-TSLQqQuSrTEUp_Bru`
- **Credenciales Locales:** `backend/reclutamiento-505320-181ae2819102.json` (apuntado por `GOOGLE_SERVICE_ACCOUNT_FILE` en `backend/.env`).
- **Credenciales Producción:** `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` inyectado en Cloud Run.

---

## 🛠️ Reglas Importantes de Google Drive API
1. La carpeta raíz está en un **Shared Drive (Unidades Compartidas)**.
2. Toda llamada a la API de Drive (`files.list`, `files.get`, `files.create`) **OBLIGATORIAMENTE** debe incluir:
   ```ts
   supportsAllDrives: true,
   includeItemsFromAllDrives: true
   ```
3. La lectura del contenido de los archivos de Drive con `alt: 'media'` puede devolver directamente un objeto JSON o un string. Se debe validar:
   ```ts
   const job = typeof content === 'string' ? JSON.parse(content) : content;
   ```
4. Los nombres y textos que llegan por `multipart/form-data` pueden llegar mal codificados (Latin-1). Usar `fixUtf8Encoding` antes de persistir en Drive.
5. **Estructura de carpetas (no colocar candidatos en la raíz):**
   - Raíz Shared Drive
     - JSON de vacantes (`*.json` con `mimeType='application/json'`)
     - Carpeta por puesto: se busca o crea con el nombre exacto de `puesto` (`getOrCreateJobFolder`)
       - Carpeta del candidato: `[APELLIDO NOMBRE] -[Cédula]`
         - Archivos adjuntos (uno por archivo, renombrados con `{NombreRequerido} - {original}`)
         - `candidato.json` — metadata de la postulación (estructura Option B con `datosFormulario`)

### Schema de vacante (`JobVacancy`)
Los JSON de vacantes en la raíz deben incluir:

```ts
{
  id: number;
  puesto: string;
  descripcion: string;
  camposRequeridos: string[];
  archivosRequeridos: string[];
  createdAt: string;
}
```

### Schema de candidato (`candidato.json` — Option B)
```ts
{
  datosFormulario: Record<string, string>;  // claves = camposRequeridos exactos
  puesto: string;
  puestoId: number;
  fechaPostulacion: string;
  archivos: { nombre: string; tipo: string }[];
}
```

**Reglas importantes:**
- Las claves de `datosFormulario` deben coincidir exactamente con `camposRequeridos` (mismo texto, mayúsculas/acentos).
- Solo "Nombre completo", "Cédula", "Teléfono" y "Email" tienen reconocimiento flexible.
- El sistema hace **merge** (lee antes de escribir): no sobreescribe datos que RRHH haya editado desde MejoraGemeseg.
- Los archivos nuevos se **agregan** al array; no se borran documentos de postulaciones pasadas.

---

## 🔌 API & Backend
- **Puerto local backend:** `3000`
- **Prefijo global de API:** `/api`
- **Swagger:** `http://localhost:3000/docs` (solo en desarrollo)
- **Endpoints:**
  - `GET /api/health` — Health check de Cloud Run
  - `GET /api/recruitment/jobs` — Lista de vacantes en JSON desde Google Drive
  - `GET /api/recruitment/jobs/:id` — Vacante específica por ID
  - `POST /api/recruitment/applications/submit` — `multipart/form-data` con campos de candidato + `files`. Campos adicionales:
    - `extraFields`: JSON string con campos adicionales del formulario

---

## 📤 Flujo de Postulación

- **individual (default):** el candidato sube 1–2 archivos por cada documento requerido → backend busca/crea carpeta del puesto → busca/crea carpeta del candidato → lee `candidato.json` existente si lo hay → sube archivos nuevos → crea/actualiza `candidato.json` con estructura Option B (merge de `datosFormulario` + adición de archivos).

---

## 💻 Frontend & UI/UX Guidelines
- **Puerto local frontend:** `5174` (`http://localhost:5174`) — definido en `frontend/vite.config.ts`
- **Favicon:** `/favicon/favicon.svg` y `/favicon/favicon-96x96.png`
- **Logos disponibles en `/public`:**
  - `logo-gemeseg-bgblue.png` (usar sobre fondas oscuros/azules)
  - `logo-gemeseg-bgorange.png` (usar sobre fondos naranjas)
  - `logo-gemeseg-bgwhite.png` (usar sobre fondos claros/blancos)
  - `logo-gemeseg-bgwhite2.png` (variante clara)
- **Componentes de carga:**
  - Individual (`DocumentUploader.tsx`): 1–2 archivos por requerimiento, drag & drop, vista previa. Formatos: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.jpg`, `.jpeg`, `.png`. Máximo 15MB por archivo. Hasta 5 documentos adicionales.
- **Criterios de Diseño:**
  - Diseño moderno, limpio, corporativo y altamente profesional.
  - Tarjetas de vacantes atractivas con badges de estado, resumen de requisitos, botón de postulación en naranja (`#EE3B1B`).
  - Modales fluidos con transiciones suaves, encabezados destacados, pestañas o secciones claras.
  - Omitir redundancia entre la información básica solicitada (Nombre, Cédula, Teléfono, Email) y la sección de "Información Requerida".

---

## 🚨 Reglas de Flujo y Trabajo
- **NO hacer `git commit` ni `git push`** hasta que el usuario inspeccione y confirme explícitamente que está satisfecho con la interfaz y funcionalidad.
- Mantener siempre ejecutándose el backend (`http://localhost:3000`) y frontend (`http://localhost:5174`) para verificación local rápida.

---

## 🔒 Seguridad

### Headers de Seguridad
- **Helmet.js** habilitado en `main.ts`
- **Rate Limiting:** 20 peticiones por 60 segundos (global via `@nestjs/throttler`)

### Validación de Archivos
- **FileFilter en Multer:** Solo MIME types permitidos (PDF, JPEG, PNG, Word, Excel)
- **Frontend:** Validación de extensiones + tamaño (15MB)

### Información No Expuesta
- `palabrasClave` de vacantes: NO se devuelven al frontend
- `driveLink` de Google Drive: NO se devuelve al frontend
- Email de Service Account: NO se expone en health endpoint
- Swagger: solo en desarrollo

### CORS
- Orígenes: `localhost:3000`, `localhost:5173`, `reclutamiento.gemeseg.com`, dominios Firebase

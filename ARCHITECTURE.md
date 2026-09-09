# ARCHITECTURE.md — Portal de Reclutamiento GEMESEG

## Visión General

- **Frontend:** React 18 + Vite + TypeScript (puerto 5174)
- **Backend:** NestJS v11 + TypeScript (puerto 3000)
- **Persistencia:** Google Drive (Shared Drive)
- **Producción:** Firebase Hosting + Cloud Run

---

## Estructura de Carpetas en Google Drive

```
Shared Drive Root (1VM4Ypbbs0xOBvt-TSLQqQuSrTEUp_Bru)
├── Puesto_Guardia_2.json          ← JSON de vacante (mimeType: application/json)
├── Puesto_Administrador.json      ← Otro JSON de vacante
│
├── Guardia 2/                     ← getOrCreateJobFolder(puesto)
│   ├── PEREZ JUAN -09999999/      ← findOrCreateCandidateFolder(nombre, cedula)
│   │   ├── Cedula - cedula.pdf    ← Archivos subidos (modo individual)
│   │   ├── Hoja de Vida - hv.docx
│   │   └── candidato.json         ← Metadata de la postulación (Option B)
│   │
│   └── MARIA LOPEZ -0501234567/
│       ├── cv_completo.pdf
│       └── candidato.json
│
└── Administrador/
    └── ...
```

---

## Schema de `candidato.json` (Option B)

```json
{
  "datosFormulario": {
    "Nombre completo": "PEREZ JUAN",
    "Cédula": "09999999",
    "Teléfono": "+593 99 123 4567",
    "Email": "juan@email.com",
    "Antecedentes Penales": "SI",
    "Título de Bachiller": "NO"
  },
  "puesto": "Guardia 2",
  "puestoId": 2,
  "fechaPostulacion": "2026-09-08T15:30:00.000Z",
  "archivos": [
    { "nombre": "Cedula - cedula.pdf", "tipo": "application/pdf" },
    { "nombre": "Hoja de Vida - hv.docx", "tipo": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
  ]
}
```

### Reglas de `datosFormulario`
- Las claves dentro de `datosFormulario` deben coincidir **exactamente** (mismo texto, mayúsculas/acentos) con el nombre de cada `campoRequerido` configurado en el JSON de la vacante.
- Solo "Nombre completo", "Cédula", "Teléfono" y "Email" tienen reconocimiento flexible.
- Los campos personalizados necesitan el nombre exacto.

### Merge (no sobrescribir)
- Si ya existe un `candidato.json` en la carpeta del candidato, el sistema lo **lee** antes de escribir.
- Los campos de `datosFormulario` nuevos se agregan; los existentes se mantienen.
- Los archivos nuevos se **agregan** al array `archivos`; los anteriores NO se borran.
- La `fechaPostulacion` original se preserva.

---

## Endpoints del Backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/health` | Health check (solo `{ status: 'ok' }`) |
| `GET` | `/api/recruitment/jobs` | Lista vacantes (sin `palabrasClave`) |
| `GET` | `/api/recruitment/jobs/:id` | Vacante por ID |
| `POST` | `/api/recruitment/applications/submit` | Envía postulación con documentos |

### Eliminados (Fase 2)
- `POST /api/recruitment/applications/validate-pdf` — eliminado junto con el modo PDF

---

## Seguridad Implementada

### Headers de Seguridad
- **Helmet.js** habilitado en `main.ts` — configura headers HTTP seguros (X-Content-Type-Options, X-Frame-Options, CSP, etc.)

### Rate Limiting
- **@nestjs/throttler** configurado en `app.module.ts`
- Límite: 20 peticiones por ventana de 60 segundos
- Aplicado globalmente vía `APP_GUARD`

### Autenticación
- Los endpoints son públicos (el portal es de acceso abierto para postulantes)
- Las credenciales de Google Drive están exclusivamente en el backend

### Validación de Archivos
- **FileFilter en Multer:** Solo acepta MIME types permitidos (PDF, JPEG, PNG, Word, Excel)
- **Tamaño máximo:** 50MB por archivo
- **Frontend:** Validación adicional de extensiones y tamaño (15MB por archivo)

### Sanitización
- Nombres de archivo: se eliminan caracteres peligrosos (`/\:*?"<>|`)
- Queries de Google Drive: se escapan comillas simples
- `ValidationPipe` con `whitelist: true` y `forbidNonWhitelisted: true`

### Información No Expuesta
- `palabrasClave` de vacantes: NO se devuelven al frontend
- `driveLink` de Google Drive: NO se devuelve al frontend
- Email de Service Account: NO se expone en el health endpoint
- Swagger: solo disponible en desarrollo (`NODE_ENV !== 'production'`)
- Archivos temporales de uploads: NO se sirven como estáticos

### CORS
- Orígenes permitidos: `localhost:3000`, `localhost:5173`, `reclutamiento.gemeseg.com`, dominios Firebase
- `credentials: true`

---

## Eliminación del Modo PDF

A partir de esta versión, **solo existe el modo de carga individual** (archivos por archivo).

### Archivos eliminados
- `frontend/src/pages/recruitment/PdfUploader.tsx`

### Código eliminado
- Backend: endpoint `validate-pdf`, método `validatePdf()`, método `submitPdfApplication()`, interfaces `DocumentValidation` y `PdfValidationResult`
- Frontend: toggle de modo de carga, estados de PDF, método `validatePdf()` del servicio
- DTO: campos `uploadMode` y `validationReport`

---

## Límites de Archivos

| Tipo | Límite |
|------|--------|
| Archivos por documento requerido | 2 |
| Archivos en "Documentos Adicionales" | 5 |
| Tamaño por archivo (frontend) | 15MB |
| Tamaño por archivo (backend) | 50MB |

---

## Variables de Entorno

### Backend (`.env`)
```
NODE_ENV=development
PORT=3000
GOOGLE_SERVICE_ACCOUNT_FILE='./reclutamiento-505320-181ae2819102.json'
GOOGLE_DRIVE_RECRUITMENT_FOLDER_ID='1VM4Ypbbs0xOBvt-TSLQqQuSrTEUp_Bru'
MAX_FILE_SIZE_MB='50'
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:3000
```

---

## Flujo de Postulación

1. Candidato visita `reclutamiento.gemeseg.com`
2. Selecciona una vacante → se abren los detalles
3. Llena el formulario (nombre, cédula, email, teléfono + campos extras si existen)
4. Sube documentos uno por uno (drag & drop o selector de archivos)
5. Envía la postulación
6. Backend:
   a. Busca/crea carpeta del puesto en Drive
   b. Busca/crea carpeta del candidato (formato: `APELLIDO NOMBRE -cedula`)
   c. Si ya existe `candidato.json` → lee y hace merge
   d. Sube archivos nuevos
   e. Crea/actualiza `candidato.json` con estructura Option B
7. RRHH desde MejoraGemeseg puede editar `candidato.json` manualmente
8. La sincronización con MejoraGemeseg es manual (RRHH pulse "Sincronizar")

---

## Cambios Recientes

### v2.0 — Sincronización con MejoraGemeseg + Seguridad
- **Nuevo schema `candidato.json`** con `datosFormulario` (Option B)
- **Merge de datos:** no se sobreescribe `candidato.json` existente
- **Adición de archivos:** no se borran documentos de postulaciones pasadas
- **Eliminación del modo PDF:** solo carga individual
- **Límite de docs adicionales:** cambiado de 2 a 5
- **Seguridad:** Helmet, rate limiting, fileFilter en Multer, sin exposición de links de Drive ni palabrasClave
- **Swagger:** solo en desarrollo
- **Health endpoint:** solo retorna `{ status: 'ok' }`

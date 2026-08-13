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
4. Las carpetas de candidatos se nombran con el formato: `[Nombre] - [Cédula]`.
5. En la carpeta del candidato se sube un archivo `candidato.json` con la metadata de la postulación y los archivos adjuntos.

---

## 🔌 API & Backend
- **Puerto local backend:** `3000`
- **Prefijo global de API:** `/api`
- **Endpoints:**
  - `GET /api/health` — Health check de Cloud Run
  - `GET /api/recruitment/jobs` — Retorna la lista de vacantes en JSON desde Google Drive
  - `GET /api/recruitment/jobs/:id` — Retorna la vacante específica por ID
  - `POST /api/recruitment/applications/submit` — Recibe `multipart/form-data` (campos de candidato + `files`) y crea carpeta + sube archivos a Google Drive.

---

## 💻 Frontend & UI/UX Guidelines
- **Puerto local frontend:** `5173` (`http://localhost:5173`)
- **Favicon:** `/favicon/favicon.svg` y `/favicon/favicon-96x96.png`
- **Logos disponibles en `/public`:**
  - `logo-gemeseg-bgblue.png` (usar sobre fondas oscuros/azules)
  - `logo-gemeseg-bgorange.png` (usar sobre fondos naranjas)
  - `logo-gemeseg-bgwhite.png` (usar sobre fondos claros/blancos)
  - `logo-gemeseg-bgwhite2.png` (variante clara)
- **Criterios de Diseño:**
  - Diseño moderno, limpio, corporativo y altamente profesional.
  - Tarjetas de vacantes atractivas con badges de estado, resumen de requisitos, botón de postulación en naranja (`#EE3B1B`).
  - Modales fluidos con transiciones suaves, encabezados destacados, pestañas o secciones claras.
  - Carga de documentos **estructurada por cada documento requerido** (permitiendo 1 o 2 archivos por cada requerimiento, con drag & drop individual y vista previa).
  - Omitir redundancia entre la información básica solicitada (Nombre, Cédula, Teléfono, Email) y la sección de "Información Requerida".

---

## 🚨 Reglas de Flujo y Trabajo
- **NO hacer `git commit` ni `git push`** hasta que el usuario inspeccione y confirme explícitamente que está satisfecho con la interfaz y funcionalidad.
- Mantener siempre ejecutándose el backend (`http://localhost:3000`) y frontend (`http://localhost:5173`) para verificación local rápida.

# Portal de Reclutamiento Automatizado - GEMESEG

URL Final: reclutamiento.gemeseg.com

## Descripción

Portal público de reclutamiento que permite a los candidatos:
- Ver puestos de trabajo activos
- Completar información de contacto
- Subir documentos requeridos
- Envío automático a Google Drive
- Notificación por email a RRHH

## Stack Tecnológico

### Backend
- **Framework:** NestJS v11 + TypeScript
- **Persistencia:** Google Drive (Shared Drive) — no se utiliza base de datos SQL/NoSQL. Las vacantes se leen como archivos `.json` en Drive y cada postulación crea una carpeta de candidato con sus documentos.
- **APIs:** Google Drive API, Gmail API

### Frontend
- **Framework:** React 18 + Vite
- **Formularios:** React Hook Form + Zod
- **HTTP:** Axios

## Estructura

```
recruitment/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   └── recruitment/
│   │   │       ├── recruitment.module.ts
│   │   │       ├── recruitment.controller.ts
│   │   │       ├── recruitment.service.ts
│   │   │       └── dto/
│   │   │           └── submit-application.dto.ts
│   │   ├── google/
│   │   │   ├── google.module.ts
│   │   │   ├── google-drive.service.ts
│   │   │   └── google-email.service.ts
│   │   ├── health.controller.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── recruitment/
│   │   │       ├── RecruitmentPage.tsx
│   │   │       ├── JobsList.tsx
│   │   │       ├── JobDetail.tsx
│   │   │       ├── ApplicationForm.tsx
│   │   │       ├── DocumentUploader.tsx
│   │   │       └── SuccessModal.tsx
│   │   ├── services/
│   │   │   └── recruitment.service.ts
│   │   ├── types/
│   │   │   └── recruitment.ts
│   │   └── styles.css
│   └── package.json
└── README.md
```

## Instalación

### Backend
```bash
cd backend
npm install
# Configurar variables de entorno (ver sección abajo)
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
# Configurar VITE_API_URL
npm run dev
```

## Variables de Entorno

### Backend
```bash
# Credenciales del Service Account (usar una de las tres opciones)
GOOGLE_SERVICE_ACCOUNT_JSON='...'            # JSON crudo
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64='...'     # JSON en base64 (usado en Cloud Run)
GOOGLE_SERVICE_ACCOUNT_FILE='...'            # Ruta a un archivo .json local

GOOGLE_DRIVE_RECRUITMENT_FOLDER_ID='...'     # Carpeta raíz del Shared Drive de reclutamiento
GMAIL_SEND_EMAIL='reclutamiento@gemeseg.com' # Cuenta del dominio que envía el correo (impersonada por el Service Account)
RRHH_EMAIL='sistemas@gemeseg.com'            # Destinatario de la notificación de nueva postulación
```

### Frontend
```bash
VITE_API_URL=http://localhost:3000
```

## API Endpoints

- `GET /api/health` - Health check (Cloud Run) y estado de configuración de Drive/Gmail
- `GET /api/recruitment/jobs` - Listar puestos activos
- `GET /api/recruitment/jobs/:id` - Detalle de puesto
- `POST /api/recruitment/applications/submit` - Enviar aplicación

## Configuración Google Cloud

1. Crear proyecto en Google Cloud Console
2. Habilitar Drive API y Gmail API
3. Crear Service Account y descargar JSON
4. Crear carpeta /Reclutamiento en un Shared Drive
5. Compartir la carpeta con el email del Service Account
6. Para la notificación por email: en el Admin Console de Google Workspace, habilitar **Domain-Wide Delegation** para el Client ID del Service Account con el scope `https://www.googleapis.com/auth/gmail.send`, de forma que pueda enviar correo impersonando a `GMAIL_SEND_EMAIL`.

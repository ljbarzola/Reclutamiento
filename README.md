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
- **ORM:** Prisma v7 (con `@prisma/adapter-pg`)
- **Base de datos:** PostgreSQL 17 (Supabase)
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
│   │   │       ├── recruitment.service.drive.ts
│   │   │       ├── recruitment.service.email.ts
│   │   │       └── dto/
│   │   ├── prisma/
│   │   └── main.ts
│   └── prisma/
│       └── schema.prisma
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
cp .env.example .env
# Configurar variables de entorno
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Configurar VITE_API_URL
npm run dev
```

## Variables de Entorno

### Backend
```bash
DATABASE_URL=postgresql://...
GOOGLE_SERVICE_ACCOUNT_JSON='...'
GOOGLE_DRIVE_RECRUITMENT_FOLDER_ID='...'
GMAIL_SEND_EMAIL='reclutamiento@gemeseg.com'
RRHH_EMAIL='sistemas@gemeseg.com'
```

### Frontend
```bash
VITE_API_URL=http://localhost:3000
```

## API Endpoints

- `GET /api/recruitment/jobs` - Listar puestos activos
- `GET /api/recruitment/jobs/:id` - Detalle de puesto
- `POST /api/recruitment/applications/submit` - Enviar aplicación

## Configuración Google Cloud

1. Crear proyecto en Google Cloud Console
2. Habilitar Drive API y Gmail API
3. Crear Service Account y descargar JSON
4. Crear carpeta /Reclutamiento en Drive
5. Compartir carpeta con email del Service Account

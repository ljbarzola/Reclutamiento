export interface CampoRequerido {
  nombre: string;
  tipo: string;
  obligatorio: boolean;
}

export interface ArchivoRequerido {
  nombre: string;
  extensiones: string[];
  obligatorio: boolean;
}

export interface Job {
  id: number;
  puesto: string;
  descripcion: string;
  camposRequeridos: CampoRequerido[];
  archivosRequeridos: ArchivoRequerido[];
  createdAt: string;
  abierta: boolean;
}

export interface CandidateData {
  datosFormulario: Record<string, string>;
  puesto: string;
  puestoId: number;
  fechaPostulacion: string;
  archivos: { nombre: string; tipo: string }[];
}

export interface SubmitApplicationResponse {
  success: boolean;
  message: string;
  application: {
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    status: string;
    createdAt: string;
  };
}

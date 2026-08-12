export interface Job {
  id: number;
  puesto: string;
  descripcion: string;
  camposRequeridos: string[];
  archivosRequeridos: string[];
  createdAt: string;
}

export interface CandidateData {
  nombre: string;
  cedula: string;
  telefono: string;
  email: string;
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
    driveLink: string;
    status: string;
    createdAt: string;
  };
}

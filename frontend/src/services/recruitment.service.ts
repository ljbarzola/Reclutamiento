import axios from 'axios';
import { Job, SubmitApplicationResponse } from '../types/recruitment';
import { ErrorPortal } from '../utils/erroresEnvio';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Se conserva el código HTTP y el tipo de fallo (sin respuesta, tiempo agotado)
// para que el formulario pueda decirle al postulante qué pasó.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data as { message?: unknown } | undefined;
    const raw = data?.message;
    const mensajeServidor = Array.isArray(raw)
      ? raw.join(' ')
      : typeof raw === 'string'
        ? raw
        : undefined;
    return Promise.reject(
      new ErrorPortal(
        mensajeServidor || 'Error del servidor',
        error?.response?.status,
        error?.code,
        mensajeServidor,
      ),
    );
  },
);

// Subir los documentos por datos móviles puede tardar varios minutos: el envío
// no usa el corte general de 30 s (Cloud Run corta a los 5 min de todos modos).
const TIEMPO_MAXIMO_ENVIO_MS = 6 * 60 * 1000;

export const recruitmentService = {
  async getActiveJobs(): Promise<Job[]> {
    const response = await api.get<Job[]>('/recruitment/jobs');
    return response.data;
  },

  async getJobById(id: number): Promise<Job> {
    const response = await api.get<Job>(`/recruitment/jobs/${id}`);
    return response.data;
  },

  async submitApplication(
    formData: FormData,
    onProgreso?: (porcentaje: number) => void,
  ): Promise<SubmitApplicationResponse> {
    const response = await api.post<SubmitApplicationResponse>(
      '/recruitment/applications/submit',
      formData,
      {
        timeout: TIEMPO_MAXIMO_ENVIO_MS,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (e) => {
          if (onProgreso && e.total) {
            onProgreso(Math.min(100, Math.round((e.loaded * 100) / e.total)));
          }
        },
      },
    );
    return response.data;
  },
};

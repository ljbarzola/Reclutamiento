import axios from 'axios';
import { Job, SubmitApplicationResponse } from '../types/recruitment';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const recruitmentService = {
  async getActiveJobs(): Promise<Job[]> {
    const response = await api.get<Job[]>('/recruitment/jobs');
    return response.data;
  },

  async getJobById(id: number): Promise<Job> {
    const response = await api.get<Job>(`/recruitment/jobs/${id}`);
    return response.data;
  },

  async submitApplication(formData: FormData): Promise<SubmitApplicationResponse> {
    const response = await api.post<SubmitApplicationResponse>(
      '/recruitment/applications/submit',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },
};

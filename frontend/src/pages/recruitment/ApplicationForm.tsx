import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Job } from '../../types/recruitment';
import { recruitmentService } from '../../services/recruitment.service';
import DocumentUploader from './DocumentUploader';
import SuccessModal from './SuccessModal';

const applicationSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  cedula: z.string().min(10, 'La cédula debe tener al menos 10 caracteres'),
  email: z.string().email('Ingrese un email válido'),
  telefono: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface ApplicationFormProps {
  job: Job;
  onSuccess: () => void;
}

export default function ApplicationForm({ job, onSuccess }: ApplicationFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [applicationResult, setApplicationResult] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
  });

  const onSubmit = async (data: ApplicationFormData) => {
    if (files.length === 0) {
      alert('Por favor suba al menos un documento');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('nombre', data.nombre);
      formData.append('cedula', data.cedula);
      formData.append('email', data.email);
      if (data.telefono) {
        formData.append('telefono', data.telefono);
      }
      formData.append('jobId', job.id.toString());
      
      files.forEach((file) => {
        formData.append('files', file);
      });

      const result = await recruitmentService.submitApplication(formData);
      setApplicationResult(result);
      setShowSuccess(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al enviar la aplicación');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <SuccessModal
        result={applicationResult}
        onClose={() => {
          setShowSuccess(false);
          onSuccess();
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="application-form">
      <h3>Formulario de Aplicación</h3>
      
      <div className="form-group">
        <label htmlFor="nombre">Nombre completo *</label>
        <input
          type="text"
          id="nombre"
          {...register('nombre')}
          placeholder="Ingrese su nombre completo"
        />
        {errors.nombre && (
          <span className="error-text">{errors.nombre.message}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="cedula">Cédula *</label>
        <input
          type="text"
          id="cedula"
          {...register('cedula')}
          placeholder="Ingrese su número de cédula"
        />
        {errors.cedula && (
          <span className="error-text">{errors.cedula.message}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input
          type="email"
          id="email"
          {...register('email')}
          placeholder="correo@ejemplo.com"
        />
        {errors.email && (
          <span className="error-text">{errors.email.message}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="telefono">Teléfono</label>
        <input
          type="tel"
          id="telefono"
          {...register('telefono')}
          placeholder="+593 99 123 4567"
        />
      </div>

      <DocumentUploader
        requiredDocuments={job.archivosRequeridos || []}
        onFilesChange={setFiles}
        files={files}
      />

      <button
        type="submit"
        className="submit-button"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="spinner-small"></span>
            Enviando...
          </>
        ) : (
          'Enviar Aplicación'
        )}
      </button>
    </form>
  );
}

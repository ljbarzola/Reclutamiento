import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Job } from '../../types/recruitment';
import { recruitmentService } from '../../services/recruitment.service';
import DocumentUploader from './DocumentUploader';
import SuccessModal from './SuccessModal';

const applicationSchema = z.object({
  nombre: z.string().min(3, 'Ingrese sus nombres y apellidos completos'),
  cedula: z
    .string()
    .min(10, 'Ingrese un número de cédula o identificación válido (mínimo 10 dígitos)')
    .regex(/^[0-9a-zA-Z-]+$/, 'Formato de identificación no válido'),
  email: z.string().email('Ingrese una dirección de correo electrónico válida'),
  telefono: z.string().min(7, 'Ingrese un número telefónico de contacto válido'),
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
      alert('Por favor adjunte la documentación requerida antes de enviar su postulación.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('nombre', data.nombre.trim());
      formData.append('cedula', data.cedula.trim());
      formData.append('email', data.email.trim());
      formData.append('telefono', data.telefono ? data.telefono.trim() : '');
      formData.append('jobId', job.id.toString());

      files.forEach((file) => {
        formData.append('files', file);
      });

      const result = await recruitmentService.submitApplication(formData);
      setApplicationResult(result);
      setShowSuccess(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ocurrió un error al registrar la postulación.');
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
      <p className="form-instruction">
        Ingrese sus datos personales de contacto tal como figuran en su documento oficial de identidad.
      </p>

      <div className="form-grid-2">
        <div className="form-group">
          <label htmlFor="nombre">
            Nombres y Apellidos Completos <span className="req-star">*</span>
          </label>
          <input
            type="text"
            id="nombre"
            {...register('nombre')}
            className="form-input"
          />
          {errors.nombre && <span className="error-text">{errors.nombre.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="cedula">
            Cédula de Identidad <span className="req-star">*</span>
          </label>
          <input
            type="text"
            id="cedula"
            {...register('cedula')}
            className="form-input"
          />
          {errors.cedula && <span className="error-text">{errors.cedula.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">
            Correo Electrónico <span className="req-star">*</span>
          </label>
          <input
            type="email"
            id="email"
            {...register('email')}
            className="form-input"
          />
          {errors.email && <span className="error-text">{errors.email.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="telefono">
            Teléfono Móvil de Contacto <span className="req-star">*</span>
          </label>
          <input
            type="tel"
            id="telefono"
            {...register('telefono')}
            className="form-input"
          />
          {errors.telefono && <span className="error-text">{errors.telefono.message}</span>}
        </div>
      </div>

      {/* Document Uploader */}
      <DocumentUploader
        requiredDocuments={job.archivosRequeridos || []}
        onFilesChange={setFiles}
      />

      {/* Submit Button */}
      <div className="form-actions">
        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner-small"></span>
              Procesando envío de datos...
            </>
          ) : (
            'Enviar Postulación Oficial'
          )}
        </button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import axios from 'axios';
import { Job, CampoRequerido } from '../../types/recruitment';
import { recruitmentService } from '../../services/recruitment.service';
import DocumentUploader from './DocumentUploader';
import SuccessModal from './SuccessModal';

interface ApplicationFormProps {
  job: Job;
  onSuccess: () => void;
}

type StandardKey = 'nombre' | 'cedula' | 'email' | 'telefono';

// Nombres de campo que, sin importar cómo los haya llamado RRHH en el JSON,
// corresponden a los 4 parámetros fijos que exige el backend (para nombrar
// la carpeta de Drive y enviar la notificación por correo).
const STANDARD_FIELD_MATCHERS: Record<StandardKey, string[]> = {
  nombre: ['nombre', 'nombre completo'],
  cedula: ['cédula', 'cedula'],
  email: ['email', 'correo', 'correo electrónico', 'correo electronico'],
  telefono: ['teléfono', 'telefono'],
};

function matchStandardKey(nombre: string): StandardKey | null {
  const normalized = nombre.trim().toLowerCase();
  for (const key of Object.keys(STANDARD_FIELD_MATCHERS) as StandardKey[]) {
    if (STANDARD_FIELD_MATCHERS[key].includes(normalized)) return key;
  }
  return null;
}

function inputPropsForTipo(tipo: string): {
  type: string;
  inputMode?: 'numeric';
  pattern?: string;
} {
  switch (tipo) {
    case 'NUMERICO':
      return { type: 'text', inputMode: 'numeric', pattern: '[0-9]*' };
    case 'CORREO':
      return { type: 'email' };
    case 'TELEFONO':
      return { type: 'tel' };
    case 'FECHA':
      return { type: 'date' };
    case 'ALFANUMERICO':
    case 'TEXTO':
    default:
      return { type: 'text' };
  }
}

// Reglas permisivas por tipo: solo buscan atajar un valor que claramente no
// calza con el tipo declarado (letras en un campo NUMERICO, un correo sin
// arroba, etc.), sin restringir de más nombres/direcciones reales.
function validateCampoValor(campo: CampoRequerido, valor: string): string | null {
  const value = valor.trim();
  if (!value) {
    return campo.obligatorio ? `${campo.nombre} es un campo obligatorio.` : null;
  }
  switch (campo.tipo) {
    case 'NUMERICO':
      return /^\d+$/.test(value) ? null : `${campo.nombre} debe contener solo números.`;
    case 'CORREO':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? null
        : `${campo.nombre} debe ser un correo electrónico válido.`;
    case 'TELEFONO':
      return /^[\d+\-\s()]+$/.test(value) ? null : `${campo.nombre} debe ser un teléfono válido.`;
    case 'FECHA':
      return !isNaN(Date.parse(value)) ? null : `${campo.nombre} debe ser una fecha válida.`;
    case 'ALFANUMERICO':
      return /^[\p{L}\p{N}\s'.-]+$/u.test(value)
        ? null
        : `${campo.nombre} contiene caracteres no permitidos.`;
    case 'TEXTO':
    default:
      return /^[\p{L}\s'.-]+$/u.test(value) ? null : `${campo.nombre} solo debe contener letras.`;
  }
}

export function getSubmitErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error al registrar la postulación.';
}

export default function ApplicationForm({ job, onSuccess }: ApplicationFormProps) {
  const campos = job.camposRequeridos || [];

  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [docMap, setDocMap] = useState<Record<string, File[]>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [applicationResult, setApplicationResult] = useState<any>(null);

  const handleFieldChange = (nombre: string, value: string) => {
    setValues((prev) => ({ ...prev, [nombre]: value }));
  };

  const handleFilesChange = (allFiles: File[], newDocMap: Record<string, File[]>) => {
    setFiles(allFiles);
    setDocMap(newDocMap);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const errors: Record<string, string> = {};
    for (const campo of campos) {
      const error = validateCampoValor(campo, values[campo.nombre] || '');
      if (error) errors[campo.nombre] = error;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const requiredDocs = job.archivosRequeridos || [];
    const missingDocs = requiredDocs.filter(
      (doc) => doc.obligatorio && (docMap[doc.nombre]?.length || 0) === 0,
    );
    if (missingDocs.length > 0) {
      setSubmitError(
        `Por favor adjunte los siguientes documentos requeridos: ${missingDocs.map((d) => d.nombre).join(', ')}.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const standard: Record<StandardKey, string> = { nombre: '', cedula: '', email: '', telefono: '' };
      const extras: Record<string, string> = {};
      for (const campo of campos) {
        const value = (values[campo.nombre] || '').trim();
        const key = matchStandardKey(campo.nombre);
        if (key) {
          standard[key] = value;
        } else {
          extras[campo.nombre] = value;
        }
      }

      const formData = new FormData();
      formData.append('nombre', standard.nombre);
      formData.append('cedula', standard.cedula);
      formData.append('email', standard.email);
      formData.append('telefono', standard.telefono);
      formData.append('jobId', job.id.toString());
      if (Object.keys(extras).length > 0) {
        formData.append('extraFields', JSON.stringify(extras));
      }
      files.forEach((file) => formData.append('files', file));

      const result = await recruitmentService.submitApplication(formData);
      setApplicationResult(result);
      setShowSuccess(true);
    } catch (error) {
      setSubmitError(getSubmitErrorMessage(error));
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
    <form onSubmit={onSubmit} className="application-form">
      <p className="form-instruction">
        Ingrese sus datos personales de contacto tal como figuran en su documento oficial de identidad.
      </p>

      <div className="form-grid-2">
        {campos.map((campo) => {
          const inputProps = inputPropsForTipo(campo.tipo);
          return (
            <div className="form-group" key={campo.nombre}>
              <label htmlFor={`campo-${campo.nombre}`}>
                {campo.nombre} {campo.obligatorio && <span className="req-star">*</span>}
              </label>
              <input
                id={`campo-${campo.nombre}`}
                className="form-input"
                type={inputProps.type}
                inputMode={inputProps.inputMode}
                pattern={inputProps.pattern}
                value={values[campo.nombre] || ''}
                onChange={(e) => handleFieldChange(campo.nombre, e.target.value)}
              />
              {fieldErrors[campo.nombre] && (
                <span className="error-text">{fieldErrors[campo.nombre]}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Document Uploader */}
      <DocumentUploader requiredDocuments={job.archivosRequeridos || []} onFilesChange={handleFilesChange} />

      {submitError && <span className="error-text">{submitError}</span>}

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

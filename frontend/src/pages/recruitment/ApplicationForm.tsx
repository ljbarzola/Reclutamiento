import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Job, CampoRequerido } from '../../types/recruitment';
import { recruitmentService } from '../../services/recruitment.service';
import DocumentUploader, { UploadMode } from './DocumentUploader';
import SuccessModal from './SuccessModal';

// TODO (futuro): Agregar aria-describedby a cada input apuntando a su mensaje de error
// para mejorar accesibilidad con lectores de pantalla.

interface ApplicationFormProps {
  job: Job;
  onSuccess: () => void;
}

type StandardKey = 'nombre' | 'cedula' | 'email' | 'telefono' | 'nombres' | 'apellidos';

// Nombres de campo que, sin importar cómo los haya llamado RRHH en el JSON,
// corresponden a los parámetros que exige el backend (para nombrar la
// carpeta de Drive y enviar la notificación por correo) o que el propio
// formulario necesita reconocer para su lógica especial (Fase 6: Nombres y
// Apellidos por separado, ver combinación en onSubmit más abajo). "nombre"
// sigue reconociendo "Nombre completo" tal cual, para no romper vacantes
// viejas que aún usan ese campo único.
const STANDARD_FIELD_MATCHERS: Record<StandardKey, string[]> = {
  nombre: ['nombre', 'nombre completo'],
  cedula: ['cédula', 'cedula'],
  email: ['email', 'correo', 'correo electrónico', 'correo electronico'],
  telefono: ['teléfono', 'telefono'],
  nombres: ['nombres'],
  apellidos: ['apellidos'],
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
  placeholder?: string;
  maxLength?: number;
} {
  switch (tipo) {
    case 'NUMERICO':
      return { type: 'text', inputMode: 'numeric', pattern: '[0-9]*' };
    case 'CORREO':
      return { type: 'email' };
    case 'TELEFONO':
      return { type: 'tel' };
    case 'FECHA':
      return { type: 'text', inputMode: 'numeric', placeholder: 'dd/mm/aaaa', maxLength: 10 };
    case 'TEXTO':
    default:
      return { type: 'text' };
  }
}

// Aplica una máscara dd/mm/aaaa mientras el usuario escribe, sin depender
// del selector nativo type="date" (su formato varía según el navegador/SO
// del candidato; en Ecuador el formato siempre debe ser día/mes/año).
function formatFechaInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join('/');
}

// Reglas permisivas por tipo: solo buscan atajar un valor que claramente no
// calza con el tipo declarado (letras en un campo NUMERICO, un correo sin
// arroba, etc.), sin restringir de más nombres/direcciones reales.
// Textos de ayuda bajo el input, hardcodeados para estos 3 campos puntuales
// (por decisión del usuario: no se justifica un mecanismo genérico de
// "descripción por campo" solo para esto). Se matchea igual que
// matchStandardKey, así que reconoce el campo sin importar cómo RRHH haya
// escrito el label ("Apellidos", "apellidos", etc.).
function helpTextForCampo(campo: CampoRequerido): string | null {
  switch (matchStandardKey(campo.nombre)) {
    case 'nombres':
      return 'Ingresa tu(s) nombre(s), tal como figuran en tu cédula.';
    case 'apellidos':
      return 'Ingresa tus dos apellidos, tal como figuran en tu cédula.';
    case 'cedula':
      return 'Ingresa los 10 dígitos de tu cédula, sin espacios ni guiones.';
    default:
      return null;
  }
}

function validateCampoValor(campo: CampoRequerido, valor: string): string | null {
  const value = valor.trim();
  if (!value) {
    return campo.obligatorio ? `${campo.nombre} es un campo obligatorio.` : null;
  }
  if (matchStandardKey(campo.nombre) === 'apellidos') {
    const words = value.split(/\s+/).filter(Boolean);
    if (words.length < 2) return 'Ingresa tus dos apellidos.';
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
    case 'FECHA': {
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
      if (!match) return `${campo.nombre} debe tener el formato dd/mm/aaaa.`;
      const [, dd, mm, yyyy] = match;
      const day = parseInt(dd, 10);
      const month = parseInt(mm, 10);
      const year = parseInt(yyyy, 10);
      const parsed = new Date(year, month - 1, day);
      const isRealDate =
        parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
      return isRealDate ? null : `${campo.nombre} debe ser una fecha válida.`;
    }
    case 'TEXTO':
    default:
      return /^[\p{L}\p{N}\s'.-]+$/u.test(value)
        ? null
        : `${campo.nombre} contiene caracteres no permitidos.`;
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
  const [modoSubida, setModoSubida] = useState<UploadMode>('individual');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [applicationResult, setApplicationResult] = useState<any>(null);
  const [missingDocSlots, setMissingDocSlots] = useState<string[]>([]);
  const [aceptaTratamientoDatos, setAceptaTratamientoDatos] = useState(false);

  const handleFieldChange = (nombre: string, value: string) => {
    setValues((prev) => ({ ...prev, [nombre]: value }));
    if (fieldErrors[nombre]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[nombre];
        return next;
      });
    }
  };

  const handleFieldBlur = (campo: CampoRequerido) => {
    const error = validateCampoValor(campo, values[campo.nombre] || '');
    setFieldErrors((prev) => {
      if (error) return { ...prev, [campo.nombre]: error };
      const next = { ...prev };
      delete next[campo.nombre];
      return next;
    });
  };

  const handleFilesChange = (
    allFiles: File[],
    newDocMap: Record<string, File[]>,
    modo: UploadMode,
  ) => {
    setFiles(allFiles);
    setDocMap(newDocMap);
    setModoSubida(modo);
    setMissingDocSlots((prev) =>
      prev.filter((name) => (newDocMap[name]?.length || 0) === 0),
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setMissingDocSlots([]);

    if (!aceptaTratamientoDatos) {
      setSubmitError('Debe aceptar la Política de Privacidad para continuar.');
      return;
    }

    const errors: Record<string, string> = {};
    for (const campo of campos) {
      const error = validateCampoValor(campo, values[campo.nombre] || '');
      if (error) errors[campo.nombre] = error;
    }
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementById(`campo-${firstErrorKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }

    if (modoSubida === 'archivo_unico') {
      if ((docMap['Archivo Completo']?.length || 0) === 0) {
        setMissingDocSlots(['Archivo Completo']);
        setSubmitError('Por favor adjunte el archivo con su información para continuar.');
        return;
      }
    } else {
      const requiredDocs = job.archivosRequeridos || [];
      const missingDocs = requiredDocs.filter(
        (doc) => doc.obligatorio && (docMap[doc.nombre]?.length || 0) === 0,
      );
      if (missingDocs.length > 0) {
        setMissingDocSlots(missingDocs.map((d) => d.nombre));
        setSubmitError(
          `Por favor adjunte los siguientes documentos requeridos: ${missingDocs.map((d) => d.nombre).join(', ')}.`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const standard: Record<StandardKey, string> = {
        nombre: '',
        cedula: '',
        email: '',
        telefono: '',
        nombres: '',
        apellidos: '',
      };
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

      // Vacante nueva (Fase 6): si el candidato llenó Nombres Y Apellidos por
      // separado, se combinan en "nombre" (el único campo que el backend
      // espera) y además se mandan por separado en extraFields, bajo sus
      // etiquetas exactas, para que MejoraGemeseg pueda mostrarlos en cajas
      // independientes en el editor de datos del postulante. Si la vacante
      // solo tiene "Nombre completo" (vacante vieja), standard.nombres/
      // apellidos quedan vacíos y este bloque no hace nada — comportamiento
      // idéntico al de hoy.
      if (standard.nombres && standard.apellidos) {
        standard.nombre = `${standard.apellidos} ${standard.nombres}`.trim();
        extras['Nombres'] = standard.nombres;
        extras['Apellidos'] = standard.apellidos;
      }

      const formData = new FormData();
      formData.append('nombre', standard.nombre);
      formData.append('cedula', standard.cedula);
      formData.append('email', standard.email);
      formData.append('telefono', standard.telefono);
      formData.append('jobId', job.id.toString());
      formData.append('modoSubida', modoSubida);
      formData.append('aceptaTratamientoDatos', String(aceptaTratamientoDatos));
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
                className={`form-input ${fieldErrors[campo.nombre] ? 'input-error' : ''}`}
                type={inputProps.type}
                inputMode={inputProps.inputMode}
                pattern={inputProps.pattern}
                placeholder={inputProps.placeholder}
                maxLength={inputProps.maxLength}
                value={values[campo.nombre] || ''}
                onChange={(e) =>
                  handleFieldChange(
                    campo.nombre,
                    campo.tipo === 'FECHA' ? formatFechaInput(e.target.value) : e.target.value,
                  )
                }
                onBlur={() => handleFieldBlur(campo)}
              />
              {fieldErrors[campo.nombre] ? (
                <span className="error-text">{fieldErrors[campo.nombre]}</span>
              ) : (
                helpTextForCampo(campo) && (
                  <span className="field-help">{helpTextForCampo(campo)}</span>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Document Uploader */}
      <DocumentUploader requiredDocuments={job.archivosRequeridos || []} onFilesChange={handleFilesChange} missingSlots={missingDocSlots} />

      <div className="consent-checkbox-row">
        <input
          id="acepta-tratamiento-datos"
          type="checkbox"
          checked={aceptaTratamientoDatos}
          onChange={(e) => setAceptaTratamientoDatos(e.target.checked)}
        />
        <label htmlFor="acepta-tratamiento-datos">
          He leído la{' '}
          <Link to="/privacidad" target="_blank" rel="noopener noreferrer">
            Política de Privacidad
          </Link>{' '}
          y acepto que Gemeseg Cía. Ltda. trate mis datos y documentos para evaluar esta postulación,
          los conserve para ese proceso y, si Recursos Humanos lo usa, un sistema de inteligencia
          artificial solo proponga cómo clasificar esos documentos. Puedo revocar este consentimiento.
        </label>
      </div>

      {submitError && <span className="error-text">{submitError}</span>}

      {/* Submit Button */}
      <div className="form-actions">
        <button
          type="submit"
          className="submit-button"
          disabled={isSubmitting || !aceptaTratamientoDatos}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-small"></span>
              Enviando...
            </>
          ) : (
            'Enviar Postulación'
          )}
        </button>
      </div>
    </form>
  );
}

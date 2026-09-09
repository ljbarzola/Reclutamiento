import { Job } from '../../types/recruitment';
import ApplicationForm from './ApplicationForm';

interface JobDetailProps {
  job: Job;
  onClose: () => void;
}

export default function JobDetail({ job, onClose }: JobDetailProps) {
  return (
    <div className="job-detail-overlay" onClick={onClose}>
      <div className="job-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header-banner">
          <div className="header-badge-wrap">
            <span className="badge-active-modal">Convocatoria Abierta</span>
            <span className="badge-job-id">Código de Vacante: #{job.id}</span>
          </div>
          <h2 className="modal-job-title">{job.puesto}</h2>
          <p className="modal-job-subtitle">
            Complete el formulario de registro y adjunte los documentos requeridos.
          </p>
          <button className="modal-close-btn" onClick={onClose} title="Cerrar ventana">
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="job-detail-content">
          {/* Job Overview / Description */}
          {job.descripcion && (
            <div className="modal-section-card">
              <h3 className="section-title">Perfil y Funciones del Puesto</h3>
              <p className="job-description-text">{job.descripcion}</p>
            </div>
          )}

          {/* Application Form */}
          <div className="modal-section-card form-section-card">
            <h3 className="section-title">Formulario de Postulación de Candidato</h3>
            <ApplicationForm job={job} onSuccess={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}

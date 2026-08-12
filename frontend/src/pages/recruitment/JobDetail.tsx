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
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        
        <div className="job-detail-header">
          <h2>{job.puesto}</h2>
        </div>
        
        <div className="job-detail-content">
          {job.descripcion && (
            <div className="job-description-section">
              <h3>Descripción del puesto</h3>
              <p>{job.descripcion}</p>
            </div>
          )}
          
          {job.archivosRequeridos && job.archivosRequeridos.length > 0 && (
            <div className="job-documents-section">
              <h3>Documentos requeridos</h3>
              <ul>
                {job.archivosRequeridos.map((doc, index) => (
                  <li key={index} className="required">
                    <span className="doc-name">{doc}</span>
                    <span className="required-badge">Obligatorio</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.camposRequeridos && job.camposRequeridos.length > 0 && (
            <div className="job-documents-section">
              <h3>Información requerida</h3>
              <ul>
                {job.camposRequeridos.map((campo, index) => (
                  <li key={index}>
                    <span className="doc-name">{campo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <ApplicationForm job={job} onSuccess={onClose} />
        </div>
      </div>
    </div>
  );
}

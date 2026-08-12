import { Job } from '../../types/recruitment';

interface JobsListProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
}

export default function JobsList({ jobs, onSelectJob }: JobsListProps) {
  if (jobs.length === 0) {
    return (
      <div className="jobs-empty">
        <div className="empty-icon">📋</div>
        <h3>No hay puestos disponibles</h3>
        <p>En este momento no tenemos vacantes abiertas. Vuelve a consultar pronto.</p>
      </div>
    );
  }

  return (
    <div className="jobs-container">
      <h2>Puestos Disponibles</h2>
      <p className="jobs-subtitle">Encuentra tu próxima oportunidad profesional</p>
      
      <div className="jobs-grid">
        {jobs.map((job) => (
          <div key={job.id} className="job-card">
            <div className="job-card-header">
              <h3 className="job-title">{job.puesto}</h3>
            </div>
            
            {job.descripcion && (
              <p className="job-description">
                {job.descripcion.length > 150
                  ? `${job.descripcion.substring(0, 150)}...`
                  : job.descripcion}
              </p>
            )}
            
            <div className="job-documents">
              <span className="documents-label">
                Documentos requeridos: {job.archivosRequeridos?.length || 0}
              </span>
            </div>
            
            <button
              className="job-apply-button"
              onClick={() => onSelectJob(job)}
            >
              Ver detalles y aplicar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

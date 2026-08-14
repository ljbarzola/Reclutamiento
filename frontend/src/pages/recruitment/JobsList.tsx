import { useState } from 'react';
import { Job } from '../../types/recruitment';

interface JobsListProps {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectJob: (job: Job) => void;
}

export default function JobsList({ jobs, loading, error, onRetry, onSelectJob }: JobsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredJobs = jobs.filter((job) =>
    job.puesto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.descripcion && job.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderSkeleton = () => (
    <div className="jobs-container">
      <div className="jobs-header-bar">
        <div className="jobs-title-group">
          <h2>Convocatorias Laborales Vigentes</h2>
          <p className="jobs-subtitle">Seleccione la vacante de su interés para revisar el perfil y presentar su postulación</p>
        </div>
      </div>
      <div className="jobs-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-card-header">
              <div className="skeleton-badge"></div>
              <div className="skeleton-badge-id"></div>
            </div>
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line skeleton-text-long"></div>
            <div className="skeleton-line skeleton-text-medium"></div>
            <div className="skeleton-chips">
              <div className="skeleton-chip"></div>
              <div className="skeleton-chip"></div>
              <div className="skeleton-chip"></div>
            </div>
            <div className="skeleton-line skeleton-button"></div>
          </div>
        ))}
      </div>
      <div className="skeleton-loading-label">
        <div className="spinner-small" style={{ borderTopColor: 'var(--azul-claro)', borderColor: 'rgba(18, 55, 95, 0.2)' }}></div>
        <span>Cargando puestos disponibles...</span>
      </div>
    </div>
  );

  if (loading) {
    return renderSkeleton();
  }

  if (error) {
    return (
      <div className="jobs-container">
        <div className="jobs-header-bar">
          <div className="jobs-title-group">
            <h2>Convocatorias Laborales Vigentes</h2>
            <p className="jobs-subtitle">Seleccione la vacante de su interés para revisar el perfil y presentar su postulación</p>
          </div>
        </div>
        <div className="error-card">
          <div className="error-icon-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3>No se pudieron cargar las vacantes</h3>
          <p>{error}</p>
          <button onClick={onRetry} className="retry-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="jobs-empty-card">
        <h3>No hay convocatorias vigentes</h3>
        <p>En este momento no disponemos de vacantes abiertas. Por favor, vuelva a consultar más adelante.</p>
      </div>
    );
  }

  return (
    <div className="jobs-container">
      {/* Search and Header Section */}
      <div className="jobs-header-bar">
        <div className="jobs-title-group">
          <h2>Convocatorias Laborales Vigentes</h2>
          <p className="jobs-subtitle">Seleccione la vacante de su interés para revisar el perfil y presentar su postulación</p>
        </div>

        {jobs.length > 1 && (
          <div className="jobs-search-box">
            <svg className="search-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Buscar por puesto o palabra clave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="jobs-search-input"
            />
            {searchTerm && (
              <button className="clear-search-btn" onClick={() => setSearchTerm('')} title="Limpiar búsqueda">
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty Search Result */}
      {filteredJobs.length === 0 && (
        <div className="jobs-empty-card">
          <h3>Sin resultados</h3>
          <p>No se encontraron convocatorias que coincidan con la búsqueda "{searchTerm}".</p>
          <button className="btn-secondary" onClick={() => setSearchTerm('')}>
            Mostrar todos los puestos
          </button>
        </div>
      )}

      {/* Grid of Jobs */}
      <div className="jobs-grid">
        {filteredJobs.map((job) => {
          const docCount = job.archivosRequeridos?.length || 0;

          return (
            <div key={job.id} className="job-card" onClick={() => onSelectJob(job)}>
              <div className="job-card-header">
                <div className="job-badge-row">
                  <span className="badge-status-active">
                    <span className="dot-live"></span> Convocatoria Abierta
                  </span>
                  <span className="badge-id">Cód: #{job.id}</span>
                </div>
                <h3 className="job-title">{job.puesto}</h3>
              </div>

              <div className="job-card-body">
                {job.descripcion ? (
                  <p className="job-description">
                    {job.descripcion.length > 150
                      ? `${job.descripcion.substring(0, 150)}...`
                      : job.descripcion}
                  </p>
                ) : (
                  <p className="job-description empty-desc">
                    Consulte la información completa y los requisitos exigidos para este puesto.
                  </p>
                )}

                {/* Requirements Summary */}
                {job.archivosRequeridos && job.archivosRequeridos.length > 0 && (
                  <div className="job-reqs-preview">
                    <span className="preview-label">Documentación requerida ({docCount}):</span>
                    <div className="chips-container">
                      {job.archivosRequeridos.slice(0, 3).map((doc, idx) => (
                        <span key={idx} className="doc-preview-chip">
                          {doc}
                        </span>
                      ))}
                      {docCount > 3 && (
                        <span className="doc-preview-chip chip-more">
                          +{docCount - 3} adicionales
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="job-card-footer">
                <button
                  className="job-apply-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectJob(job);
                  }}
                >
                  <span>Postularme a esta vacante</span>
                  <span className="btn-arrow">→</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Job } from '../../types/recruitment';
import { recruitmentService } from '../../services/recruitment.service';
import JobsList from './JobsList';
import JobDetail from './JobDetail';

export default function RecruitmentPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await recruitmentService.getActiveJobs();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los puestos disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
  };

  const handleClose = () => {
    setSelectedJob(null);
  };

  if (loading) {
    return (
      <div className="recruitment-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando puestos disponibles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recruitment-page">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={fetchJobs} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="recruitment-page">
      <header className="recruitment-header">
        <div className="header-content">
          <h1>Portal de Reclutamiento</h1>
          <p>Únete a nuestro equipo</p>
        </div>
      </header>

      <main className="recruitment-main">
        <JobsList jobs={jobs} onSelectJob={handleSelectJob} />
      </main>

      {selectedJob && (
        <JobDetail job={selectedJob} onClose={handleClose} />
      )}
    </div>
  );
}

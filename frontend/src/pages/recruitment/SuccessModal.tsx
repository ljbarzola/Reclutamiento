interface SuccessModalProps {
  result: {
    application: {
      candidateName: string;
      candidateEmail: string;
      jobTitle: string;
      driveLink: string;
      status: string;
      createdAt?: string;
    };
    message: string;
  };
  onClose: () => void;
}

export default function SuccessModal({ result, onClose }: SuccessModalProps) {
  const dateStr = result.application.createdAt
    ? new Date(result.application.createdAt).toLocaleDateString('es-EC', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('es-EC');

  return (
    <div className="success-overlay" onClick={onClose}>
      <div className="success-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="success-icon-wrap">
          <div className="check-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>

        <h2 className="success-title">Postulación Registrada Correctamente</h2>
        <p className="success-subtitle">
          Su información y expedientes han sido ingresados en nuestro sistema para el puesto de{' '}
          <strong>{result.application.jobTitle}</strong>.
        </p>

        <div className="success-details-card">
          <div className="detail-row">
            <span className="detail-label">Candidato:</span>
            <span className="detail-value">{result.application.candidateName}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Correo Electrónico:</span>
            <span className="detail-value">{result.application.candidateEmail}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Puesto Solicitado:</span>
            <span className="detail-value highlight-job">{result.application.jobTitle}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Fecha y Hora de Registro:</span>
            <span className="detail-value">{dateStr}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Estado de la Postulación:</span>
            <span className="badge-status-rec">Registrado en Selección</span>
          </div>
        </div>

        <div className="success-notice">
          <p>
            El Departamento de Recursos Humanos de GEMESEG evaluará la documentación adjunta. En caso de cumplir con los requerimientos exigidos, se le notificará directamente para las entrevistas y pruebas respectivas.
          </p>
        </div>

        <div className="success-actions">
          <button className="btn-confirm-success" onClick={onClose}>
            Aceptar y Finalizar
          </button>
        </div>
      </div>
    </div>
  );
}

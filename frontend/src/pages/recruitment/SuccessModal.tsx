interface SuccessModalProps {
  result: {
    application: {
      candidateName: string;
      candidateEmail: string;
      jobTitle: string;
      driveLink: string;
      status: string;
    };
    message: string;
  };
  onClose: () => void;
}

export default function SuccessModal({ result, onClose }: SuccessModalProps) {
  return (
    <div className="success-overlay" onClick={onClose}>
      <div className="success-modal" onClick={(e) => e.stopPropagation()}>
        <div className="success-icon">✓</div>
        <h2>¡Aplicación Enviada!</h2>
        
        <div className="success-details">
          <p><strong>Candidato:</strong> {result.application.candidateName}</p>
          <p><strong>Email:</strong> {result.application.candidateEmail}</p>
          <p><strong>Puesto:</strong> {result.application.jobTitle}</p>
          <p><strong>Estado:</strong> {result.application.status}</p>
          {result.application.driveLink && (
            <p>
              <strong>Documentos:</strong>{' '}
              <a
                href={result.application.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="drive-link"
              >
                Ver en Google Drive
              </a>
            </p>
          )}
        </div>

        <p className="success-message">
          Hemos recibido tu aplicación. Nuestro equipo de Recursos Humanos
          revisará tu documentación y te contactaremos pronto.
        </p>

        <button className="close-button-success" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

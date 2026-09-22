import { Link } from 'react-router-dom';

export default function PrivacyNotice() {
  return (
    <div className="recruitment-page">
      <header className="recruitment-header">
        <div className="header-content">
          <img src="/logo-gemeseg-bgblue.png" alt="GEMESEG" className="header-logo" />
          <h1>Política de Privacidad</h1>
          <p>Tratamiento de datos personales en el proceso de reclutamiento</p>
        </div>
      </header>

      <main className="recruitment-main">
        <div className="modal-section-card privacy-notice-card">
          <p className="privacy-updated">Última actualización: septiembre de 2026</p>

          <h2 className="privacy-heading">1. Quién es responsable</h2>
          <p>
            El responsable del tratamiento es <strong>Gemeseg Cía. Ltda.</strong> (en adelante, la empresa).
            Puede ejercer sus derechos o hacer consultas sobre esta política en:
          </p>
          <ul className="privacy-list">
            <li>Dirección: Av. Héroes del Cenepa y Cabo Richard Burgos, Loja, Ecuador.</li>
            <li>Teléfono: 07-2588614.</li>
            <li>
              Correo: <a href="mailto:info@gemeseg.com">info@gemeseg.com</a>.
            </li>
          </ul>
          <p>
            Este portal no está dirigido a niñas, niños ni adolescentes. Las postulaciones son de
            personas que se presentan a una vacante.
          </p>

          <h2 className="privacy-heading">2. Qué datos recogemos y para qué</h2>
          <p>
            Los datos los entrega usted en este formulario. La empresa los usa solo para el proceso de
            selección de la vacante a la que postula:
          </p>
          <ul className="privacy-list">
            <li>Identificarlo y contactarlo: nombre, cédula, teléfono y correo.</li>
            <li>Revisar la documentación que la vacante solicita.</li>
            <li>Decidir, por parte del equipo de Recursos Humanos, si continúa en el proceso.</li>
          </ul>
          <p>
            No usamos estos datos para publicidad, no los vendemos y no los entregamos a clientes de
            la empresa. No hay otra finalidad distinta de este reclutamiento.
          </p>
          <p>
            Si una vacante pide un documento que revele pasado judicial, datos de salud o que incluya
            su imagen en un documento de identidad, ese dato se trata únicamente para evaluar esa
            postulación, con el consentimiento que usted marca en el formulario.
          </p>

          <h2 className="privacy-heading">3. Por qué podemos tratarlos</h2>
          <p>
            La base es su consentimiento, libre y previo, al marcar la casilla del formulario. Ese
            consentimiento cubre las finalidades de esta política, incluido el almacenamiento de sus
            archivos y, cuando Recursos Humanos lo usa, el análisis automatizado descrito más abajo.
            Puede revocarlo en cualquier momento, sin explicar el motivo y sin costo, escribiendo a{' '}
            <a href="mailto:info@gemeseg.com">info@gemeseg.com</a>. Lo ya realizado antes de la
            revocación sigue siendo válido. Si revoca el consentimiento durante el proceso, la empresa
            deja de tratar sus datos para esa postulación, salvo que una norma obligue a conservarlos.
          </p>

          <h2 className="privacy-heading">4. Inteligencia artificial</h2>
          <p>
            Recursos Humanos puede pasar sus archivos por un sistema de inteligencia artificial de
            Google. Ese sistema solo propone en qué páginas están los documentos que la vacante pide.
            No contrata, no descarta y no elabora un perfil para decidir si usted es apto. Una persona
            de la empresa revisa esa propuesta y puede corregirla o ignorarla. Si el sistema no está
            disponible, la revisión se hace a mano.
          </p>
          <p>
            Usted puede pedir una explicación de ese resultado, oponerse a que sus documentos pasen
            por ese sistema y pedir que la clasificación la haga solo una persona. Escríbanos al correo
            indicado arriba.
          </p>

          <h2 className="privacy-heading">5. Dónde se guardan y quién más los ve</h2>
          <p>
            La postulación queda en el archivo de reclutamiento de la empresa, alojado en Google Drive.
            Google presta ese servicio de almacenamiento y, cuando se usa la herramienta del apartado
            anterior, el de inteligencia artificial. Google no recibe sus datos para usarlos por su
            cuenta. Esos servicios pueden procesar la información fuera de Ecuador, conforme al
            contrato de servicios de Google con la empresa.
          </p>
          <p>
            El personal de Recursos Humanos que interviene en la vacante accede a la postulación para
            evaluarla. No se comunica su información a otros destinatarios para fines distintos.
          </p>

          <h2 className="privacy-heading">6. Cuánto tiempo se conservan</h2>
          <p>
            La empresa conserva la postulación mientras dura el proceso de selección de esa vacante y,
            una vez cerrado, durante doce meses, para atender sus solicitudes y reclamos ligados a ese
            proceso. Cumplido ese plazo, se eliminan. Si usted pide la eliminación antes, se atiende
            salvo que una norma obligue a conservarlos por más tiempo.
          </p>

          <h2 className="privacy-heading">7. Si no los entrega, o si hay un error</h2>
          <p>
            Sin los datos y documentos que la vacante marca como necesarios, y sin aceptar esta
            política, no se puede enviar la postulación ni evaluarla. No hay otra consecuencia.
          </p>
          <p>
            Si un dato está mal, es posible que no podamos contactarlo o que la postulación no pueda
            considerarse. Puede pedir la corrección por el mismo correo.
          </p>

          <h2 className="privacy-heading">8. Sus derechos</h2>
          <p>Usted puede pedir, sin costo y sin justificar el pedido:</p>
          <ul className="privacy-list">
            <li>Acceder a sus datos y a esta información.</li>
            <li>Rectificar o actualizar los que estén mal o incompletos.</li>
            <li>Eliminarlos cuando ya no hagan falta o cuando revoque el consentimiento.</li>
            <li>Oponerse al tratamiento en los casos que permite la ley.</li>
            <li>Pedir la suspensión del tratamiento mientras se resuelve una objeción.</li>
            <li>Recibir una copia en un formato electrónico de uso común, o pedir que se entregue a otro responsable cuando sea técnicamente posible.</li>
            <li>No quedar sujeto a una decisión de contratación tomada solo por un sistema automatizado. Esta empresa no toma esa decisión de esa forma.</li>
          </ul>
          <p>
            Escriba a <a href="mailto:info@gemeseg.com">info@gemeseg.com</a> indicando su nombre,
            cédula y qué derecho quiere ejercer. Las solicitudes de acceso, rectificación, eliminación
            y oposición se atienden en un plazo de quince días.
          </p>

          <h2 className="privacy-heading">9. Reclamos</h2>
          <p>
            Primero escriba a la empresa, al correo de esta política. Si no queda conforme, puede
            acudir a la Superintendencia de Protección de Datos Personales: correo{' '}
            <a href="mailto:solicitudes@spdp.gob.ec">solicitudes@spdp.gob.ec</a>, trámite de
            solicitudes de titulares en gob.ec, o denuncias en{' '}
            <a href="https://servicios.spdp.gob.ec/denuncia" target="_blank" rel="noopener noreferrer">
              servicios.spdp.gob.ec/denuncia
            </a>
            . También puede presentar la solicitud en el balcón de servicios de la Superintendencia, en
            la Plataforma Gubernamental de Gestión Financiera, Av. Amazonas y Unión Nacional de
            Periodistas, Quito.
          </p>

          <Link to="/" className="btn-secondary privacy-back-link">
            ← Volver al portal de reclutamiento
          </Link>
        </div>
      </main>
    </div>
  );
}

# Pendientes legales — protección de datos (LOPDP)

La página `/privacidad` informa al postulante, en lenguaje claro, los puntos del Art. 12 de la
Ley Orgánica de Protección de Datos Personales que aplican cuando los datos los entrega él mismo.
La casilla del formulario recoge el consentimiento para esas finalidades, incluido el uso de
inteligencia artificial solo para proponer la clasificación de documentos.

Eso no sustituye obligaciones internas de la empresa, que la norma de la Superintendencia
(Resolución SPDP-SPD-2026-0009-R, Art. 5) pide además del aviso al titular:

- Registro de actividades de tratamiento, incluyendo el tratamiento hecho con el sistema de
  inteligencia artificial.
- Gestión de riesgos y evaluación de impacto de ese sistema.
- Medidas de seguridad acordes al tipo de documentos (identidad y, si la vacante lo pide,
  antecedentes u otros datos sensibles).

Esos registros se llevan dentro de la empresa. No se publican en el portal.

## Procedimiento de retención, borrado y solicitudes (borrador, por definir por la empresa)

El aviso de privacidad promete eliminar las postulaciones 12 meses después de cerrada la vacante, atender
solicitudes de eliminación y revocación, y responder en 15 días. Hoy el portal **no tiene** un mecanismo
automático para eso (no hay borrado en el código, ni fecha de cierre de vacante, ni estado de revocación),
por lo que depende de un procedimiento interno que debe quedar escrito:

- Quién recibe las solicitudes (buzón `info@gemeseg.com`) y quién las ejecuta, con registro de fecha de recepción y de respuesta.
- Cómo se registra la fecha de cierre de cada vacante y quién revisa mensualmente las carpetas a eliminar.
- Qué se elimina: carpeta del postulante en Drive (y su papelera), y también las **copias derivadas**: historial de versiones de `candidato.json`, correos de notificación en los buzones de RRHH y registros de Cloud Logging.
- Qué pasa si la persona vuelve a postular después de revocar su consentimiento (hoy el portal marca el consentimiento como aceptado en cada envío y conserva la fecha original).

Estas decisiones y su adecuación a la LOPDP las define la empresa con su asesoría legal.

// Límites de una postulación. Una vacante puede pedir más de 20 documentos
// («Custodio» pide 23) y el formulario permite hasta 2 archivos por documento
// más 5 adicionales: con el tope anterior de 20 archivos, multer rechazaba con
// 400 («Too many files») a quien adjuntaba todo lo que se le pedía.
export const MAX_ARCHIVOS_POR_POSTULACION = 60;

// Campos de texto del formulario (nombre, cédula, correo, teléfono, vacante,
// modo, consentimiento, extraFields) con margen.
export const MAX_CAMPOS_POR_POSTULACION = 30;

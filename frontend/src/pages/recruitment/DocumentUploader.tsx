import { useState, useEffect } from 'react';
import { ArchivoRequerido } from '../../types/recruitment';

export type UploadMode = 'individual' | 'archivo_unico';

interface DocumentUploaderProps {
  requiredDocuments: ArchivoRequerido[];
  onFilesChange: (files: File[], docMap: Record<string, File[]>, modo: UploadMode) => void;
  missingSlots?: string[];
}

const FALLBACK_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
const MAX_FILES_PER_DOC = 2;
const MAX_EXTRA_DOCS = 5;
const MAX_FILES_ARCHIVO_UNICO = 1;
const MAX_EXTRA_DOCS_ARCHIVO_UNICO = 3;

const GENERIC_SLOT: ArchivoRequerido = {
  nombre: 'Documentos Generales',
  extensiones: [],
  obligatorio: false,
};

const ARCHIVO_UNICO_SLOT_NAME = 'Archivo Completo';
const EXTRA_DOCS_SLOT_NAME = 'Documentos Adicionales';

export default function DocumentUploader({
  requiredDocuments,
  onFilesChange,
  missingSlots = [],
}: DocumentUploaderProps) {
  const [modo, setModo] = useState<UploadMode>('individual');
  // Map of docName -> File[]
  const [docMap, setDocMap] = useState<Record<string, File[]>>({});
  const [dragSlot, setDragActiveSlot] = useState<string | null>(null);

  // Initialize empty slots
  const slots = requiredDocuments.length > 0 ? requiredDocuments : [GENERIC_SLOT];

  const handleModoChange = (nuevoModo: UploadMode) => {
    if (nuevoModo === modo) return;
    setModo(nuevoModo);
    setDocMap({});
  };

  // Update parent whenever docMap or modo change
  useEffect(() => {
    const allFiles: File[] = [];
    Object.entries(docMap).forEach(([docName, files]) => {
      files.forEach((file) => {
        const cleanDocName = docName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim();
        const renamedFile = new File([file], `${cleanDocName} - ${file.name}`, {
          type: file.type,
          lastModified: file.lastModified,
        });
        allFiles.push(renamedFile);
      });
    });
    onFilesChange(allFiles, docMap, modo);
  }, [docMap, modo]);

  const extensionsForSlot = (slot: ArchivoRequerido): string[] =>
    slot.extensiones.length > 0
      ? slot.extensiones.map((ext) => (ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`))
      : FALLBACK_EXTENSIONS;

  const validateFile = (file: File, allowedExtensions: string[]): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      alert(`El archivo "${file.name}" no corresponde a un formato permitido (${allowedExtensions.join(', ')}).`);
      return false;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert(`El archivo "${file.name}" excede el tamaño límite permitido de 15MB.`);
      return false;
    }
    return true;
  };

  const addFilesToSlot = (
    slotName: string,
    newFiles: FileList | File[],
    allowedExtensions: string[],
    maxFiles: number = MAX_FILES_PER_DOC,
  ) => {
    const currentSlotFiles = docMap[slotName] || [];
    if (currentSlotFiles.length >= maxFiles) {
      alert(`Ha alcanzado el límite máximo de ${maxFiles} archivos para "${slotName}".`);
      return;
    }

    const availableSlots = maxFiles - currentSlotFiles.length;
    const filesToAdd: File[] = [];

    for (let i = 0; i < Math.min(newFiles.length, availableSlots); i++) {
      const file = newFiles[i];
      if (validateFile(file, allowedExtensions)) {
        filesToAdd.push(file);
      }
    }

    if (filesToAdd.length > 0) {
      setDocMap((prev) => ({
        ...prev,
        [slotName]: [...(prev[slotName] || []), ...filesToAdd],
      }));
    }
  };

  const removeFileFromSlot = (slotName: string, fileIndex: number) => {
    setDocMap((prev) => {
      const current = prev[slotName] || [];
      const updated = current.filter((_, i) => i !== fileIndex);
      return {
        ...prev,
        [slotName]: updated,
      };
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderExtraDocsSlot = (maxExtra: number) => (
    <div
      className="doc-slot-card slot-optional"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
          addFilesToSlot(EXTRA_DOCS_SLOT_NAME, e.dataTransfer.files, FALLBACK_EXTENSIONS, maxExtra);
        }
      }}
    >
      <div className="slot-title-bar">
        <div className="slot-title-info">
          <span className="slot-name">{EXTRA_DOCS_SLOT_NAME}</span>
          <span className="slot-counter">
            {(docMap[EXTRA_DOCS_SLOT_NAME] || []).length} de {maxExtra} archivos
          </span>
        </div>
        <span className="badge-optional">Opcional</span>
      </div>

      {(docMap[EXTRA_DOCS_SLOT_NAME] || []).length > 0 && (
        <div className="slot-files-list">
          {(docMap[EXTRA_DOCS_SLOT_NAME] || []).map((file, fIdx) => (
            <div key={fIdx} className="slot-file-badge">
              <div className="file-details">
                <span className="file-title" title={file.name}>
                  {file.name}
                </span>
                <span className="file-meta">{formatFileSize(file.size)}</span>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                title="Eliminar archivo"
                onClick={() => removeFileFromSlot(EXTRA_DOCS_SLOT_NAME, fIdx)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {(docMap[EXTRA_DOCS_SLOT_NAME] || []).length < maxExtra && (
        <label className="slot-dropzone">
          <input
            type="file"
            className="hidden-file-input"
            accept={FALLBACK_EXTENSIONS.join(',')}
            onChange={(e) => {
              if (e.target.files) {
                addFilesToSlot(EXTRA_DOCS_SLOT_NAME, e.target.files, FALLBACK_EXTENSIONS, maxExtra);
                e.target.value = '';
              }
            }}
          />
          <span className="upload-action-text">+ Seleccionar archivo adicional</span>
        </label>
      )}
    </div>
  );

  return (
    <div className="document-uploader-section">
      <div className="uploader-header">
        <h4 className="uploader-title">Adjuntar Documentos</h4>
        <p className="uploader-subtitle">
          Elija cómo desea adjuntar sus documentos: uno por cada requerimiento, o un solo archivo con toda su información.
        </p>
      </div>

      <span className="uploader-step-label">¿Cómo quieres subir tus documentos?</span>
      <div className="mode-card-group" role="radiogroup" aria-label="Forma de adjuntar documentos">
        <label className={`mode-card ${modo === 'individual' ? 'is-selected' : ''}`}>
          <input
            type="radio"
            name="modoSubida"
            className="mode-card-radio-input"
            checked={modo === 'individual'}
            onChange={() => handleModoChange('individual')}
          />
          <span className="mode-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="12" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <rect x="9" y="7" width="12" height="15" rx="2" fill="var(--white)" stroke="currentColor" strokeWidth="1.6" />
              <line x1="12" y1="11.5" x2="17" y2="11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="12" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="mode-card-body">
            <span className="mode-card-title">Subir documentos por separado</span>
            <span className="mode-card-desc">
              Adjunta cada documento (cédula, hoja de vida, etc.) en su propio espacio.
            </span>
          </span>
          <span className="mode-card-radio" aria-hidden="true" />
        </label>

        <label className={`mode-card ${modo === 'archivo_unico' ? 'is-selected' : ''}`}>
          <input
            type="radio"
            name="modoSubida"
            className="mode-card-radio-input"
            checked={modo === 'archivo_unico'}
            onChange={() => handleModoChange('archivo_unico')}
          />
          <span className="mode-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" />
              <line x1="9" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="11" x2="12" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="mode-card-body">
            <span className="mode-card-title">Subir un solo archivo</span>
            <span className="mode-card-desc">
              Sube un único archivo con toda tu información. Si quieres, puedes anexar hasta 3 archivos más.
            </span>
          </span>
          <span className="mode-card-radio" aria-hidden="true" />
        </label>
      </div>

      <span className="uploader-step-label">Adjunta tus documentos</span>

      {modo === 'archivo_unico' ? (
        <div className="slots-grid">
          {(() => {
            const slotFiles = docMap[ARCHIVO_UNICO_SLOT_NAME] || [];
            const isFull = slotFiles.length >= MAX_FILES_ARCHIVO_UNICO;
            const isDragging = dragSlot === ARCHIVO_UNICO_SLOT_NAME;
            return (
              <div
                className={`doc-slot-card ${isFull ? 'slot-full' : ''} ${isDragging ? 'slot-dragging' : ''} ${missingSlots.includes(ARCHIVO_UNICO_SLOT_NAME) ? 'doc-slot-missing' : ''}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isFull) setDragActiveSlot(ARCHIVO_UNICO_SLOT_NAME);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragSlot === ARCHIVO_UNICO_SLOT_NAME) setDragActiveSlot(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActiveSlot(null);
                  if (!isFull && e.dataTransfer.files) {
                    addFilesToSlot(
                      ARCHIVO_UNICO_SLOT_NAME,
                      e.dataTransfer.files,
                      FALLBACK_EXTENSIONS,
                      MAX_FILES_ARCHIVO_UNICO,
                    );
                  }
                }}
              >
                <div className="slot-title-bar">
                  <div className="slot-title-info">
                    <span className="slot-name">{ARCHIVO_UNICO_SLOT_NAME}</span>
                    <span className="slot-counter">
                      {slotFiles.length} de {MAX_FILES_ARCHIVO_UNICO} archivo
                    </span>
                  </div>
                  {slotFiles.length > 0 ? (
                    <span className="badge-uploaded">Adjuntado</span>
                  ) : (
                    <span className="badge-required">Requerido</span>
                  )}
                </div>

                {slotFiles.length > 0 && (
                  <div className="slot-files-list">
                    {slotFiles.map((file, fIdx) => (
                      <div key={fIdx} className="slot-file-badge">
                        <div className="file-details">
                          <span className="file-title" title={file.name}>
                            {file.name}
                          </span>
                          <span className="file-meta">{formatFileSize(file.size)}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-remove-file"
                          title="Eliminar archivo"
                          onClick={() => removeFileFromSlot(ARCHIVO_UNICO_SLOT_NAME, fIdx)}
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!isFull && (
                  <label className="slot-dropzone">
                    <input
                      type="file"
                      className="hidden-file-input"
                      accept={FALLBACK_EXTENSIONS.join(',')}
                      onChange={(e) => {
                        if (e.target.files) {
                          addFilesToSlot(
                            ARCHIVO_UNICO_SLOT_NAME,
                            e.target.files,
                            FALLBACK_EXTENSIONS,
                            MAX_FILES_ARCHIVO_UNICO,
                          );
                          e.target.value = '';
                        }
                      }}
                    />
                    <span className="upload-action-text">+ Seleccionar archivo</span>
                  </label>
                )}
              </div>
            );
          })()}

          {renderExtraDocsSlot(MAX_EXTRA_DOCS_ARCHIVO_UNICO)}
        </div>
      ) : (
      <div className="slots-grid">
        {slots.map((slot, idx) => {
          const slotName = slot.nombre;
          const allowedExtensions = extensionsForSlot(slot);
          const slotFiles = docMap[slotName] || [];
          const isFull = slotFiles.length >= MAX_FILES_PER_DOC;
          const isDragging = dragSlot === slotName;

          return (
            <div
              key={idx}
              className={`doc-slot-card ${isFull ? 'slot-full' : ''} ${isDragging ? 'slot-dragging' : ''} ${missingSlots.includes(slotName) ? 'doc-slot-missing' : ''}`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isFull) setDragActiveSlot(slotName);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragSlot === slotName) setDragActiveSlot(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActiveSlot(null);
                if (!isFull && e.dataTransfer.files) {
                  addFilesToSlot(slotName, e.dataTransfer.files, allowedExtensions);
                }
              }}
            >
              <div className="slot-title-bar">
                <div className="slot-title-info">
                  <span className="slot-name">{slotName}</span>
                  <span className="slot-counter">
                    {slotFiles.length} de {MAX_FILES_PER_DOC} archivos adjuntos
                  </span>
                </div>
                {slotFiles.length > 0 ? (
                  <span className="badge-uploaded">Adjuntado</span>
                ) : slot.obligatorio ? (
                  <span className="badge-required">Requerido</span>
                ) : (
                  <span className="badge-optional">Opcional</span>
                )}
              </div>

              {/* Uploaded Files List */}
              {slotFiles.length > 0 && (
                <div className="slot-files-list">
                  {slotFiles.map((file, fIdx) => (
                    <div key={fIdx} className="slot-file-badge">
                      <div className="file-details">
                        <span className="file-title" title={file.name}>
                          {file.name}
                        </span>
                        <span className="file-meta">{formatFileSize(file.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-file"
                        title="Eliminar archivo"
                        onClick={() => removeFileFromSlot(slotName, fIdx)}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Dropzone / Button */}
              {!isFull && (
                <label className="slot-dropzone">
                  <input
                    type="file"
                    className="hidden-file-input"
                    accept={allowedExtensions.join(',')}
                    onChange={(e) => {
                      if (e.target.files) {
                        addFilesToSlot(slotName, e.target.files, allowedExtensions);
                        e.target.value = '';
                      }
                    }}
                  />
                  <span className="upload-action-text">
                    {slotFiles.length === 0 ? '+ Seleccionar archivo' : '+ Adjuntar segundo archivo'}
                  </span>
                </label>
              )}
            </div>
          );
        })}

        {renderExtraDocsSlot(MAX_EXTRA_DOCS)}
      </div>
      )}
    </div>
  );
}

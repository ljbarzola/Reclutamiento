import { useState, useEffect } from 'react';

interface DocumentUploaderProps {
  requiredDocuments: string[];
  onFilesChange: (files: File[]) => void;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
const MAX_FILES_PER_DOC = 2;

export default function DocumentUploader({
  requiredDocuments,
  onFilesChange,
}: DocumentUploaderProps) {
  // Map of docName -> File[]
  const [docMap, setDocMap] = useState<Record<string, File[]>>({});
  const [dragSlot, setDragActiveSlot] = useState<string | null>(null);

  // Initialize empty slots
  const slots = requiredDocuments.length > 0 ? requiredDocuments : ['Documentos Generales'];

  // Update parent whenever docMap changes
  useEffect(() => {
    const allFiles: File[] = [];
    Object.entries(docMap).forEach(([docName, files]) => {
      files.forEach((file) => {
        const cleanDocName = docName.replace(/[^a-zA-Z0-0áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim();
        const renamedFile = new File([file], `${cleanDocName} - ${file.name}`, {
          type: file.type,
          lastModified: file.lastModified,
        });
        allFiles.push(renamedFile);
      });
    });
    onFilesChange(allFiles);
  }, [docMap]);

  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      alert(`El archivo "${file.name}" no corresponde a un formato permitido (${ALLOWED_EXTENSIONS.join(', ')}).`);
      return false;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert(`El archivo "${file.name}" excede el tamaño límite permitido de 15MB.`);
      return false;
    }
    return true;
  };

  const addFilesToSlot = (slotName: string, newFiles: FileList | File[]) => {
    const currentSlotFiles = docMap[slotName] || [];
    if (currentSlotFiles.length >= MAX_FILES_PER_DOC) {
      alert(`Ha alcanzado el límite máximo de ${MAX_FILES_PER_DOC} archivos para el requerimiento "${slotName}".`);
      return;
    }

    const availableSlots = MAX_FILES_PER_DOC - currentSlotFiles.length;
    const filesToAdd: File[] = [];

    for (let i = 0; i < Math.min(newFiles.length, availableSlots); i++) {
      const file = newFiles[i];
      if (validateFile(file)) {
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

  return (
    <div className="document-uploader-section">
      <div className="uploader-header">
        <h4 className="uploader-title">Adjuntar Documentos Requeridos</h4>
        <p className="uploader-subtitle">
          Adjunte los archivos requeridos para la validación de su expediente. Se admite de 1 a 2 archivos por cada documento exigido (Formatos: PDF, Word, JPG, PNG. Máx. 15MB por archivo).
        </p>
      </div>

      <div className="slots-grid">
        {slots.map((slotName, idx) => {
          const slotFiles = docMap[slotName] || [];
          const isFull = slotFiles.length >= MAX_FILES_PER_DOC;
          const isDragging = dragSlot === slotName;

          return (
            <div
              key={idx}
              className={`doc-slot-card ${isFull ? 'slot-full' : ''} ${isDragging ? 'slot-dragging' : ''}`}
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
                  addFilesToSlot(slotName, e.dataTransfer.files);
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
                {slotFiles.length === 0 ? (
                  <span className="badge-required">Requerido</span>
                ) : (
                  <span className="badge-uploaded">Adjuntado</span>
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
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files) {
                        addFilesToSlot(slotName, e.target.files);
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

        {/* Optional Slot for Extra Docs */}
        <div
          className="doc-slot-card slot-optional"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) {
              addFilesToSlot('Documentos Adicionales', e.dataTransfer.files);
            }
          }}
        >
          <div className="slot-title-bar">
            <div className="slot-title-info">
              <span className="slot-name">Documentos Adicionales</span>
              <span className="slot-counter">
                {(docMap['Documentos Adicionales'] || []).length} de 2 archivos
              </span>
            </div>
            <span className="badge-optional">Opcional</span>
          </div>

          {(docMap['Documentos Adicionales'] || []).length > 0 && (
            <div className="slot-files-list">
              {(docMap['Documentos Adicionales'] || []).map((file, fIdx) => (
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
                    onClick={() => removeFileFromSlot('Documentos Adicionales', fIdx)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}

          {(docMap['Documentos Adicionales'] || []).length < 2 && (
            <label className="slot-dropzone">
              <input
                type="file"
                className="hidden-file-input"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files) {
                    addFilesToSlot('Documentos Adicionales', e.target.files);
                    e.target.value = '';
                  }
                }}
              />
              <span className="upload-action-text">+ Seleccionar archivo adicional</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

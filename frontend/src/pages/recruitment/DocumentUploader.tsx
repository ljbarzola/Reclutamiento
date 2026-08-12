import { useRef, useState } from 'react';

interface DocumentUploaderProps {
  requiredDocuments: string[];
  onFilesChange: (files: File[]) => void;
  files: File[];
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];

export default function DocumentUploader({
  requiredDocuments,
  onFilesChange,
  files,
}: DocumentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return false;
      }
    }
    return true;
  };

  const handleFiles = (newFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      if (validateFile(file)) {
        validFiles.push(file);
      } else {
        alert(`Archivo no permitido: ${file.name}`);
      }
    }

    onFilesChange([...files, ...validFiles]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="document-uploader">
      <label>Documentos *</label>
      
      <div
        className={`dropzone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={handleChange}
          className="file-input"
        />
        <div className="dropzone-content">
          <span className="dropzone-icon">📄</span>
          <p>Arrastra archivos aquí o haz clic para seleccionar</p>
          <p className="dropzone-hint">
            Formatos permitidos: PDF, Word, Excel, JPG, PNG
          </p>
        </div>
      </div>

      {requiredDocuments.length > 0 && (
        <div className="required-docs-info">
          <p>Documentos requeridos para este puesto:</p>
          <ul>
            {requiredDocuments.map((doc, index) => (
              <li key={index}>
                {doc}
                <span className="required">*</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {files.length > 0 && (
        <div className="uploaded-files">
          <p>Archivos seleccionados:</p>
          <ul>
            {files.map((file, index) => (
              <li key={index} className="file-item">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => removeFile(index)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

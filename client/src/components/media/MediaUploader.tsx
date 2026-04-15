import { useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, FileImage, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  uploadProgress: Record<string, number>;
}

export function MediaUploader({ onUpload, isUploading, uploadProgress }: Props) {
  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      toast.error('Only image and video files under 50MB are allowed.');
      return;
    }

    for (const file of acceptedFiles) {
      try {
        await onUpload(file);
        toast.success(`Encrypted ${file.name} to Vault.`);
      } catch (err) {
        toast.error(`Transfer of ${file.name} aborted.`);
      }
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'video/*': ['.mp4', '.mov']
    },
    maxSize: 50 * 1024 * 1024 // 50MB max
  });

  const uploadIds = Object.keys(uploadProgress);

  return (
    <div className="space-y-4 max-w-2xl w-full">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-3xl p-10 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center
          ${isDragActive ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-base-content/20 hover:border-primary/50 hover:bg-base-200/50 bg-base-100/50 backdrop-blur-md'}`}
      >
        <input {...getInputProps()} />
        <UploadCloud size={48} className={`mb-4 ${isDragActive ? 'text-primary' : 'text-base-content/40'}`} />
        <h3 className="text-xl font-bold mb-2">Drop payload here, or click to browse</h3>
        <p className="text-sm text-base-content/50">Supports Secure JPEG, PNG, WEBP, and MP4 (Max 50MB)</p>
      </div>

      {uploadIds.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase text-base-content/50 tracking-wider">Active Transmissions</h4>
          {uploadIds.map(id => (
            <div key={id} className="bg-base-200/80 backdrop-blur-sm shadow-sm rounded-xl p-4 border border-base-content/5">
               <div className="flex justify-between items-center mb-2">
                 <span className="font-semibold text-sm flex items-center gap-2"><FileImage size={16} /> Encryption Stream {id}</span>
                 <span className="text-primary font-mono text-xs">{uploadProgress[id]}%</span>
               </div>
               <progress className="progress progress-primary w-full bg-base-300" value={uploadProgress[id]} max="100"></progress>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

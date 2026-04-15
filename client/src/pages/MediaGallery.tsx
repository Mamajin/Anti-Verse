import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMediaStore } from '../stores/mediaStore';
import { MediaUploader } from '../components/media/MediaUploader';
import { ArrowLeft, Trash2, ShieldCheck, Download, FlaskConical, Database, ShieldAlert } from 'lucide-react';

export const MediaGallery = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { files, fetchMedia, uploadFile, deleteMedia, isLoading, uploads } = useMediaStore();

  useEffect(() => {
    if (id) fetchMedia(id);
  }, [id, fetchMedia]);

  const activeUploads = Object.keys(uploads).length > 0;

  return (
    <div className="space-y-8 animate-fade-in-up max-w-7xl mx-auto pb-20">
      <button onClick={() => navigate(`/colonies/${id}`)} className="group inline-flex items-center gap-2 text-base-content/40 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest">
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to System Overview
      </button>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Upload Column */}
        <div className="lg:w-1/3 flex flex-col gap-8 sticky top-20 h-fit">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <FlaskConical size={24} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Specimen Archive</span>
            </div>
            <h1 className="text-4xl font-black text-base-content tracking-tighter">Secure Vault</h1>
            <p className="text-base-content/50 font-medium text-sm leading-relaxed">Encrypted media observation records for the active colony bio-system.</p>
          </div>
          <MediaUploader onUpload={(file) => uploadFile(id!, file)} isUploading={activeUploads} uploadProgress={uploads} />
        </div>

        {/* Gallery Column */}
        <div className="lg:w-2/3">
          {isLoading && !activeUploads ? (
            <div className="flex justify-center p-12"><span className="loading loading-spinner text-primary loading-lg"></span></div>
          ) : files.length === 0 ? (
            <div className="p-16 text-center bg-base-200/30 rounded-3xl border border-base-200 text-base-content/50 h-full flex flex-col items-center justify-center">
              <ShieldCheck size={48} className="mb-4 text-base-content/20" />
              Vault is currently sealed empty.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {files.map(file => (
                <div key={file.id} className="group relative rounded-3xl overflow-hidden bg-base-300 aspect-square shadow-md border border-base-content/10">
                  {file.contentType.startsWith('image') ? (
                     <img 
                       src={file.url} 
                       alt={file.filename} 
                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                       loading="lazy" 
                       onError={(e) => {
                         (e.target as HTMLImageElement).src = '/assets/placeholders/specimen-placeholder.png';
                       }}
                     />
                  ) : (
                     <video src={file.url} className="w-full h-full object-cover" controls preload="metadata"></video>
                  )}
                  
                  {/* Status Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    {file.status === 'pending' && <span className="badge badge-warning shadow-md backdrop-blur-md bg-warning/90 border-0">Encrypting</span>}
                  </div>

                  {/* Hover Actions Panel */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                    <div className="text-white">
                      <p className="font-semibold truncate w-32 md:w-40 text-sm" title={file.filename}>{file.filename}</p>
                      <p className="text-xs text-white/70 font-mono">{(file.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <div className="flex gap-2">
                      <a href={file.url} target="_blank" rel="noreferrer" className="btn btn-square btn-sm btn-ghost text-white hover:bg-white/20">
                         <Download size={16} />
                      </a>
                      <button onClick={() => deleteMedia(id!, file.id).catch(()=>{})} className="btn btn-square btn-sm btn-error shadow-lg">
                         <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

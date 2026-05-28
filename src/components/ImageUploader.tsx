import React, { useState, useRef } from 'react';
import { Upload, Camera, FileImage, Image as ImageIcon, Sparkles, X, RotateCw, MonitorPlay, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  onImagesSelected: (images: { fileName: string; base64: string }[]) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // File loading helper to Base64
  const processFiles = (files: FileList) => {
    const selected: { fileName: string; base64: string }[] = [];
    let processedCount = 0;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          selected.push({
            fileName: file.name,
            base64: e.target.result as string
          });
        }
        processedCount++;
        if (processedCount === files.length && selected.length > 0) {
          onImagesSelected(selected);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = ''; // Reset uploader input
    }
  };

  // Live Camera Controls
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("MediaDevices camera access failed:", err);
      // Gracefully show camera simulated option if real camera fails (fallback)
      setCameraError(
        "No se pudo acceder a la cámara o los permisos fueron denegados. Cambiando a simulador."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 800;
      canvas.height = video.videoHeight || 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        onImagesSelected([{
          fileName: `captura_${timestamp}.jpg`,
          base64: dataUrl
        }]);
        stopCamera();
      }
    } catch (err) {
      console.error("Falla al capturar frame:", err);
    }
  };

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Upload Container Zone */}
        <div className="lg:col-span-8">
          <div
            id="drag-drop-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition ${
              isDragging
                ? 'border-teal-500 bg-teal-50/50'
                : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
          >
            <input
              id="upload-file-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className={`p-4 rounded-full mb-3 ${isDragging ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-sm font-semibold text-slate-800">
              Carga tus Placas de Características Siemens
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Arrastra y suelta múltiples imágenes simultáneamente, o haz clic en{' '}
              <button
                type="button"
                id="btn-trigger-upload"
                onClick={() => fileInputRef.current?.click()}
                className="text-teal-600 font-semibold hover:underline"
              >
                examinar tus archivos
              </button>
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-3 uppercase italic">
              Soporta múltiples archivos PNG, JPG, JPEG (Máx 30MB)
            </p>
          </div>
        </div>

        {/* Camera and Quick Capture Actions Pane */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <Camera className="w-3.5 h-3.5" />
                Dispositivo de Captura
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Utiliza tu smartphone o cámara web para capturar de forma inmediata la placa metálica de Siemens en el taller.
              </p>

              {cameraError && (
                <div className="mt-3 p-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs flex items-start gap-1.5 leading-normal">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            <div className="mt-4">
              {!isCameraActive ? (
                <button
                  id="btn-activate-camera"
                  type="button"
                  onClick={startCamera}
                  className="w-full inline-flex items-center gap-2 justify-center py-2.5 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-teal-700 hover:border-teal-300 transition rounded-lg shadow-sm"
                >
                  <Camera className="w-4 h-4 text-teal-600" />
                  Activar Cámara en Vivo
                </button>
              ) : (
                <div className="bg-black/9s rounded-lg overflow-hidden relative shadow-md">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-44 object-cover scale-x-[-1]"
                  />
                  <div className="absolute inset-0 border border-white/20 pointer-events-none flex items-center justify-center">
                    {/* Retro Camera Reticle Frame */}
                    <div className="w-4/5 h-3/5 border border-dashed border-teal-400/50 relative">
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-teal-400"></div>
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-teal-400"></div>
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-teal-400"></div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-teal-400"></div>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-1.5">
                    <button
                      id="btn-cancel-camera"
                      type="button"
                      onClick={stopCamera}
                      className="py-1 px-2.5 bg-black/75 text-white hover:bg-black text-[10px] rounded-md font-semibold font-mono"
                    >
                      Cerrar
                    </button>
                    <button
                      id="btn-capture-camera"
                      type="button"
                      onClick={capturePhoto}
                      className="py-1 px-3 bg-teal-600 text-white hover:bg-teal-700 text-[10px] rounded-md font-bold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-300 animate-spin" />
                      CAPTURAR FOTO
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-slate-200/60 pt-3">
              <span className="text-[10px] font-bold text-slate-500 block uppercase mb-1">💡 Consejos para el OCR:</span>
              <ul className="text-[10px] text-slate-500 list-disc list-inside space-y-1">
                <li>Enfoca directamente a la chapa evitando reflejos.</li>
                <li>Limpia grasa o polvo de los datos MLFB.</li>
              </ul>
            </div>

          </div>
        </div>
        
      </div>
    </div>
  );
};

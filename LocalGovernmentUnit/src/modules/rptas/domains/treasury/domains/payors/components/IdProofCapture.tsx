import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/modules/rptas/ui/dialog';
import { Button } from '@/modules/rptas/ui/button';
import { Camera, Upload, IdCard, RefreshCw, AlertTriangle, Check } from 'lucide-react';

export interface CapturedId {
  file: File;
  previewUrl: string;
}

interface IdProofCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (result: CapturedId) => void;
}

type Stage = 'capture' | 'preview';

/**
 * Capture or upload a photo of a valid ID to keep as proof of identity. No OCR —
 * the image is stored as-is and the operator types the fields manually.
 */
const IdProofCapture: React.FC<IdProofCaptureProps> = ({ open, onOpenChange, onCapture }) => {
  const [stage, setStage] = useState<Stage>('capture');
  const [cameraOn, setCameraOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [captured, setCaptured] = useState<CapturedId | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }, []);

  const resetAll = useCallback(() => {
    stopCamera();
    setStage('capture');
    setErrorMsg('');
    setCaptured((prev) => {
      if (prev?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, [stopCamera]);

  useEffect(() => {
    if (!open) resetAll();
    return () => stopCamera();
  }, [open, resetAll, stopCamera]);

  const startCamera = useCallback(async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setErrorMsg('Camera unavailable. Check permissions or use “Upload image” instead.');
    }
  }, []);

  const captureFromCamera = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `id-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);
        stopCamera();
        setCaptured({ file, previewUrl });
        setStage('preview');
      },
      'image/jpeg',
      0.92,
    );
  }, [stopCamera]);

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image is too large (max 5MB).');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setCaptured({ file, previewUrl });
    setStage('preview');
  }, []);

  const handleUse = () => {
    if (!captured) return;
    onCapture(captured);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IdCard className="h-5 w-5 text-primary" />
            Capture ID Photo
          </DialogTitle>
          <DialogDescription>
            Take or upload a clear photo of the payor’s valid ID. It’s saved with the payor record as proof of identity.
          </DialogDescription>
        </DialogHeader>

        {stage === 'capture' && (
          <div className="space-y-4">
            {cameraOn ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-lg bg-black aspect-video">
                  <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                  <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-white/70" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={captureFromCamera} className="flex-1">
                    <Camera className="mr-2 h-4 w-4" /> Capture
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <Camera className="h-7 w-7 text-primary" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Use Camera</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Capture with your device</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <Upload className="h-7 w-7 text-primary" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Upload Image</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">JPG or PNG (max 5MB)</span>
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}

        {stage === 'preview' && captured && (
          <div className="space-y-4">
            <img
              src={captured.previewUrl}
              alt="ID preview"
              className="mx-auto max-h-72 rounded-md border border-slate-200 dark:border-slate-700"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetAll}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retake
              </Button>
              <Button onClick={handleUse} className="flex-1">
                <Check className="mr-2 h-4 w-4" /> Use This Photo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IdProofCapture;

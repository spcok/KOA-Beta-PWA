import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureCaptureProps {
  onSave: (base64: string) => void;
  onCancel: () => void;
  initialSignature?: string;
}

export const SignatureCapture: React.FC<SignatureCaptureProps> = ({ onSave, onCancel, initialSignature }) => {
  const signatureRef = useRef<SignatureCanvas>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Measure the container exactly so the pointer coordinates align perfectly with the screen
  useEffect(() => {
    const updateDimensions = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.offsetWidth,
          height: wrapperRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Load initial signature if provided and dimensions are ready
  useEffect(() => {
    if (initialSignature && signatureRef.current && dimensions.width > 0) {
      signatureRef.current.fromDataURL(initialSignature);
    }
  }, [initialSignature, dimensions.width]);

  const handleSave = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      onSave(signatureRef.current.toDataURL('image/png'));
    } else if (signatureRef.current?.isEmpty()) {
      alert("Please provide a signature before saving.");
    }
  };

  const handleClear = () => {
    signatureRef.current?.clear();
  };

  return (
    <div className="space-y-4">
      <div 
        ref={wrapperRef} 
        className="w-full h-48 border-2 border-slate-200 rounded-2xl bg-white overflow-hidden touch-none"
      >
        {dimensions.width > 0 && (
          <SignatureCanvas
            ref={signatureRef}
            penColor="#0f172a"
            canvasProps={{
              width: dimensions.width,
              height: dimensions.height,
              className: 'touch-none'
            }}
          />
        )}
      </div>
      
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-3 bg-white border-2 border-slate-100 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-3 bg-white border-2 border-slate-100 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-colors text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 ml-auto"
        >
          Save Signature
        </button>
      </div>
    </div>
  );
};

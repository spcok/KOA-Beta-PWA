import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignatureCaptureProps {
  onSave: (base64: string) => void;
  onCancel: () => void;
  initialSignature?: string;
}

export const SignatureCapture: React.FC<SignatureCaptureProps> = ({ onSave, onCancel }) => {
  const signatureRef = useRef<SignatureCanvas>(null);

  const handleSave = () => {
    if (signatureRef.current) {
      onSave(signatureRef.current.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    signatureRef.current?.clear();
  };

  return (
    <div className="space-y-4">
      <div className="border border-slate-300 rounded-lg bg-white overflow-hidden">
        <SignatureCanvas
          ref={signatureRef}
          penColor="black"
          canvasProps={{
            width: 500,
            height: 200,
            className: 'w-full h-48 touch-none'
          }}
          onBegin={() => {}}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors text-sm font-medium"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium ml-auto"
        >
          Save Signature
        </button>
      </div>
    </div>
  );
};

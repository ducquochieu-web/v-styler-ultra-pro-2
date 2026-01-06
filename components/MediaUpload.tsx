
import React, { useRef } from 'react';
import { StylerMedia } from '../types';

interface MediaUploadProps {
  label: string;
  icon: React.ReactNode;
  onUpload: (media: StylerMedia) => void;
  value?: StylerMedia;
  className?: string;
  compact?: boolean;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({ label, icon, onUpload, value, className, compact }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      onUpload({
        url: URL.createObjectURL(file),
        base64,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`relative group ${className}`}>
      <input
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
      />
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`w-full aspect-[3/4] rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center
          ${value ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-gray-800 hover:border-amber-500/50 bg-gray-900/40 hover:bg-gray-900/60'}
        `}
      >
        {value ? (
          <img src={value.url} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className={`text-center flex flex-col items-center justify-center ${compact ? 'p-2 space-y-2' : 'p-6 space-y-4'}`}>
            <div className={`${compact ? 'w-10 h-10' : 'w-16 h-16'} bg-gray-800 rounded-xl flex items-center justify-center text-gray-500 group-hover:text-amber-500 transition-colors shadow-inner`}>
              {icon}
            </div>
            <div className="space-y-0.5">
              <p className={`font-black text-gray-400 uppercase tracking-tighter ${compact ? 'text-[8px]' : 'text-xs'}`}>{label}</p>
              {!compact && <p className="text-[10px] text-gray-600">Nhấn để tải ảnh</p>}
            </div>
          </div>
        )}
      </div>
      
      {value && (
        <button 
          onClick={(e) => { e.stopPropagation(); onUpload(undefined!); }}
          className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 z-10 border border-black/50"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

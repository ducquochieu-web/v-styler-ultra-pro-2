
import React, { useEffect, useState } from 'react';

interface ApiKeyGateProps {
  onValidated: () => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onValidated }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [manualKey, setManualKey] = useState('');

  useEffect(() => {
    const checkKey = async () => {
      // 1. Kiểm tra key thủ công trước
      const saved = localStorage.getItem('VSTYLER_CUSTOM_API_KEY');
      if (saved && saved.length > 20) {
        setHasKey(true);
        onValidated();
        return;
      }

      // 2. Kiểm tra key từ môi trường AI Studio
      try {
        // @ts-ignore
        if (window.aistudio && window.aistudio.hasSelectedApiKey) {
          // @ts-ignore
          const selected = await window.aistudio.hasSelectedApiKey();
          if (selected) {
            setHasKey(true);
            onValidated();
          } else {
            setHasKey(false);
          }
        } else {
          setHasKey(false);
        }
      } catch (e) {
        setHasKey(false);
      }
    };
    checkKey();
  }, [onValidated]);

  const handleOpenSelector = async () => {
    try {
      // @ts-ignore
      if (window.aistudio && window.aistudio.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasKey(true);
        onValidated();
      } else {
        setIsManual(true);
      }
    } catch (e) {
      setIsManual(true);
    }
  };

  const handleSaveManual = () => {
    if (manualKey.trim().length < 20) {
      alert("Vui lòng nhập API Key hợp lệ!");
      return;
    }
    localStorage.setItem('VSTYLER_CUSTOM_API_KEY', manualKey.trim());
    setHasKey(true);
    onValidated();
  };

  if (hasKey === true) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6">
      <div className="max-w-md w-full glass border border-amber-500/30 rounded-[40px] p-10 text-center space-y-8 shadow-[0_0_100px_rgba(245,158,11,0.2)]">
        <div className="w-24 h-24 bg-gradient-to-tr from-amber-600 to-yellow-600 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl border border-amber-400/30">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded border border-amber-500/30 uppercase tracking-tighter">Bản Pro</span>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">V-Styler Access</h2>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed px-4">
            Ứng dụng yêu cầu Gemini 3 Pro API Key để vận hành. Bạn có thể chọn tự động hoặc dán mã thủ công.
          </p>
        </div>

        {isManual ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <input 
              type="password"
              placeholder="Dán API Key của bạn tại đây..."
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-amber-400 outline-none focus:border-amber-500/50 transition-all placeholder:text-white/20"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setIsManual(false)}
                className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 text-white/50 font-black rounded-2xl transition-all uppercase tracking-widest text-[10px]"
              >
                Quay lại
              </button>
              <button
                onClick={handleSaveManual}
                className="flex-[2] py-4 px-6 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-amber-500/20 uppercase tracking-widest text-[10px]"
              >
                Lưu & Bắt đầu
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleOpenSelector}
              className="w-full py-5 px-6 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-amber-500/20 active:scale-95 uppercase tracking-widest text-[11px]"
            >
              Kích hoạt AI Pro
            </button>
            <button
              onClick={() => setIsManual(true)}
              className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 font-black rounded-2xl transition-all uppercase tracking-widest text-[10px]"
            >
              Nhập API Key thủ công
            </button>
          </div>
        )}

        <div className="pt-2">
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-amber-500/50 hover:text-amber-500 transition-colors flex items-center justify-center space-x-1 uppercase font-black tracking-widest"
          >
            <span>Lấy mã API tại Google AI Studio</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>
      </div>
    </div>
  );
};

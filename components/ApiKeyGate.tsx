
import React, { useEffect, useState } from 'react';

const DEFAULT_QR_CODE = "https://api.vietqr.io/image/970432-0356010226-FDrKsqk.jpg?amount=100000&addInfo=Tang%20coc%20cafe%20nhe";

interface ApiKeyGateProps {
  onValidated: () => void;
}

export const ApiKeyGate: React.FC<ApiKeyGateProps> = ({ onValidated }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [manualKey, setManualKey] = useState('');
  
  // Donate States
  const [showDonate, setShowDonate] = useState(false);
  const [localDonateQr, setLocalDonateQr] = useState<string | null>(null);

  useEffect(() => {
    // Load local donate QR
    const savedQr = localStorage.getItem('VSTYLER_DONATE_QR');
    if (savedQr) setLocalDonateQr(savedQr);

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

  const handleDonateQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setLocalDonateQr(result);
      localStorage.setItem('VSTYLER_DONATE_QR', result);
    };
    reader.readAsDataURL(file);
  };

  const displayQr = localDonateQr || DEFAULT_QR_CODE;

  if (hasKey === true) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6">
      {/* Donate Button - Top Right */}
      <div className="absolute top-6 right-6 z-50">
         <button onClick={() => setShowDonate(true)} className="py-2.5 px-5 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 font-black rounded-xl uppercase tracking-[0.2em] text-[10px] flex items-center space-x-2 transition-all hover:shadow-[0_0_20px_rgba(236,72,153,0.2)] active:scale-95">
            <span className="text-base">☕</span>
            <span>Tặng Cafe</span>
         </button>
      </div>

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

      {/* DONATE MODAL */}
      {showDonate && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowDonate(false)}>
           <div className="max-w-sm w-full bg-white rounded-[32px] p-8 shadow-[0_0_100px_rgba(236,72,153,0.3)] relative text-center" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowDonate(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">✕</button>
              <h3 className="text-xl font-black uppercase tracking-widest mb-2 text-gray-900">Tặng đội ngũ phát triển 1 ly cafe</h3>
              <p className="text-xs text-gray-500 mb-6">Cảm ơn bạn đã đồng hành cùng V-Styler!</p>
              
              <div className="bg-gray-100 p-4 rounded-3xl mb-4 relative group">
                 {displayQr ? (
                    <>
                       <img 
                          src={displayQr} 
                          alt="Donate QR" 
                          className="w-full h-auto rounded-xl shadow-lg mix-blend-multiply"
                       />
                       {localDonateQr && (
                          <button 
                             onClick={() => { setLocalDonateQr(null); localStorage.removeItem('VSTYLER_DONATE_QR'); }}
                             className="absolute top-2 right-2 bg-white text-gray-600 p-2 rounded-full shadow-md text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                          >
                             Dùng ảnh mặc định
                          </button>
                       )}
                    </>
                 ) : (
                    <div className="flex items-center justify-center h-64 text-gray-400 text-xs">Loading QR...</div>
                 )}
              </div>
              
              <label className="block mb-4 cursor-pointer">
                 <span className="text-[10px] text-pink-500 font-bold hover:underline">Thay ảnh QR (Chỉ bạn thấy)</span>
                 <input type="file" className="hidden" accept="image/*" onChange={handleDonateQrUpload} />
              </label>

              <p className="text-[10px] text-gray-400 font-mono">VPBank • 0356010226 • THAN CONG HAI</p>
           </div>
        </div>
      )}
    </div>
  );
};

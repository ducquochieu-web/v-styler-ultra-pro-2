
import React, { useState, useCallback, useEffect } from 'react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { MediaUpload } from './components/MediaUpload';
import { identifyCharacter, generatePose } from './services/geminiService';
import { saveProfileToDB, getAllProfilesFromDB, deleteProfileFromDB } from './services/storageService';
import { AspectRatio, ImageSize, StylerMedia, GenerationResult, Atmosphere, CharacterProfile, Language, TryOnMode } from './types';

const DEFAULT_POSES: Record<Language, string[]> = {
  vi: ["Đứng Sang Trọng", "Dáng Đi Năng Động", "Ngồi Tự Nhiên", "Tựa Lưng Thời Thượng", "Dáng Quyền Lực"],
  en: ["Elegant Standing", "Dynamic Walk", "Candid Sitting", "High-Fashion Lean", "Power Pose"]
};

const ATMOSPHERES: Atmosphere[] = [
  { id: 'grand_cafe', name: { vi: 'Cà Phê Hoàng Gia', en: 'Grand Royal Cafe' }, icon: '💎', prompt: 'Inside an ultra-luxury Parisian grand cafe. High ceilings with intricate gold leaf moldings, massive crystal chandeliers, polished white Calacatta marble floors. Louis XIV style furniture with gold accents. Cinematic warm glow, soft bokeh, high-fashion editorial style.', color: 'rgba(251,191,36,0.12)' },
  { id: 'private_jet', name: { vi: 'Chuyên Cơ Riêng', en: 'Private Jet Cabin' }, icon: '✈️', prompt: 'Inside a Gulfstream G700 private jet cabin. Cream leather reclining seats, exotic dark wood paneling, cashmere blankets. Soft natural light through oval windows. Elite lifestyle photography, high-end commercial look.', color: 'rgba(255,255,255,0.08)' },
  { id: 'penthouse', name: { vi: 'Penthouse Đế Vương', en: 'Empire Penthouse' }, icon: '🏙️', prompt: 'A multi-level luxury penthouse overlooking Manhattan at twilight. Floor-to-ceiling glass walls, minimalist B&B Italia furniture, rare modern art. Blue hour lighting with warm interior highlights. Shot on Arri Alexa.', color: 'rgba(99,102,241,0.08)' },
  { id: 'gala_hall', name: { vi: 'Thảm Đỏ Met Gala', en: 'Met Gala Red Carpet' }, icon: '✨', prompt: 'On a grand velvet-covered red carpet leading into a majestic museum hall. Flash photography lighting, elite atmosphere, dramatic shadows, architectural depth. Vogue Met Gala style.', color: 'rgba(239,68,68,0.1)' },
  { id: 'monaco_yacht', name: { vi: 'Siêu Du Thuyền Monaco', en: 'Super Yacht Deck' }, icon: '🛥️', prompt: 'On the teak wood deck of a 100-meter superyacht anchored in Monaco. Background shows the Mediterranean coast with white luxury villas. Sun-drenched high-contrast lighting, resort-chic aesthetic, 8k crisp details.', color: 'rgba(14,165,233,0.1)' },
  { id: 'versailles', name: { vi: 'Cung Điện Gương', en: 'Palace of Mirrors' }, icon: '👑', prompt: 'Inside a hall of mirrors at a royal palace. Endless reflections, gold baroque statues, silver candelabras. Ornate ceilings, majestic scale, ethereal royal fashion atmosphere.', color: 'rgba(255,215,0,0.15)' },
  { id: 'vogue_studio', name: { vi: 'Studio Vogue', en: 'Couture Studio' }, icon: '📸', prompt: 'A world-class minimalist photography studio. Custom softbox lighting creating a perfect "halo" effect. Professional grey-gradient cyclorama. Extremely high-definition textures, clean high-fashion editorial.', color: 'rgba(255,255,255,0.05)' },
  { id: 'milan_boutique', name: { vi: 'Boutique Milan', en: 'Milan Flagship' }, icon: '👠', prompt: 'Inside a flagship luxury boutique on Via Montenapoleone. Minimalist shelving, glass displays, expensive handbags. Sharp architectural lighting, sophisticated urban luxury vibe.', color: 'rgba(168,162,158,0.1)' },
  { id: 'winter_chalet', name: { vi: 'Biệt Thự Tuyết Courchevel', en: 'Courchevel Chalet' }, icon: '❄️', prompt: 'Inside a high-end ski-in/ski-out chalet in the French Alps. Reclaimed aged wood, fur rugs, massive stone fireplace with crackling fire. Large windows showing snow-capped mountains. Cozy luxury aesthetic.', color: 'rgba(186,230,253,0.08)' },
];

const SIDEBAR_WIDTH = 380;

export default function App() {
  const [lang, setLang] = useState<Language>('vi');
  const [isKeyValidated, setIsKeyValidated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [characterRefs, setCharacterRefs] = useState<StylerMedia[]>([]);
  const [characterDNA, setCharacterDNA] = useState<string>("");
  const [characterVault, setCharacterVault] = useState<CharacterProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  
  const [poseRefs, setPoseRefs] = useState<StylerMedia[]>([]);
  const [isDNAEditing, setIsDNAEditing] = useState(false);
  const [isAnalyzingDNA, setIsAnalyzingDNA] = useState(false);
  const [clothing, setClothing] = useState<StylerMedia>();
  const [accessories, setAccessories] = useState<StylerMedia>();
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:4");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [selectedAtmosphere, setSelectedAtmosphere] = useState<string>(ATMOSPHERES[0].id);
  const [tryOnMode, setTryOnMode] = useState<TryOnMode>("standard");
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const t = {
    vi: {
      headerSub: "Hệ Thống Phối Đồ AI Cao Cấp",
      brandVault: "Kho Lưu Trữ Người Mẫu",
      newModel: "Mẫu Mới",
      biometric: "1. Mã Gen Sinh Trắc",
      lockedProfile: "Hồ Sơ Elite",
      saveModel: "Lưu Mẫu",
      inspectBio: "Xem Chuỗi Sinh Trắc Học",
      hideBio: "Ẩn Dữ Liệu Gốc",
      atmoArch: "2. Kiến Trúc Bối Cảnh",
      luxuryEnv: "Không Gian Sang Trọng",
      coutureSel: "3. Lựa Chọn Trang Phục",
      garment: "Quần Áo",
      accessory: "Phụ Kiện",
      poseBlue: "4. Bản Thiết Kế Dáng",
      synthBtn: "BẮT ĐẦU TỔNG HỢP SIÊU CẤP",
      awaiting: "V-STYLER",
      ready: "Hệ Thống Thời Trang Ảo Sẵn Sàng",
      genStatus: "ĐANG TỔNG HỢP BỐI CẢNH",
      subject: "Nhân Vật",
      pose: "Dáng",
      settings: "Cài đặt",
      langLabel: "Ngôn ngữ hệ thống",
      apiKeyLabel: "Kết nối API",
      apiConnectBtn: "Đổi mã API (Tự động)",
      apiManualBtn: "Nhập mã API thủ công",
      apiStatus: localStorage.getItem('VSTYLER_CUSTOM_API_KEY') ? "Đang sử dụng mã thủ công" : "Sử dụng mã hệ thống",
      close: "Đóng",
      dismiss: "Nhấn bất cứ đâu để đóng",
      promptModelName: "Tên Người Mẫu:",
      defaultModelName: "Người Mẫu Elite",
      delConfirm: "Xóa hồ sơ người mẫu này khỏi kho lưu trữ?",
      alertUpload: "Vui lòng tải lên ảnh nhân vật và trang phục.",
      eliteLook: "Dáng Elite",
      apiKeyError: "Lỗi API Key. Hãy nhập lại mã mới.",
      modeLabel: "Chế Độ Xử Lý",
      modeStandard: "Tiêu Chuẩn",
      modeHighExposure: "Couture Pro",
      modeDescStandard: "Dùng cho đồ casual, công sở.",
      modeDescHigh: "Xử lý tối ưu cho Bikini, Đồ lót."
    },
    en: {
      headerSub: "Premium AI Fashion Synthesis",
      brandVault: "Brand Model Vault",
      newModel: "New Model",
      biometric: "1. Biometric DNA",
      lockedProfile: "Elite Profile",
      saveModel: "Save Model",
      inspectBio: "Inspect Biometric String",
      hideBio: "Hide Raw Biometrics",
      atmoArch: "2. Atmosphere Architecture",
      luxuryEnv: "Luxury Environment",
      coutureSel: "3. Couture Selection",
      garment: "Garment",
      accessory: "Accessory",
      poseBlue: "4. Pose Blueprint",
      synthBtn: "BEGIN ULTRA SYNTHESIS",
      awaiting: "V-STYLER",
      ready: "Virtual Couture Engine Ready",
      genStatus: "SYNTHESIZING ATMOSPHERE",
      subject: "Subject",
      pose: "Pose",
      settings: "Settings",
      langLabel: "System Language",
      apiKeyLabel: "API Connection",
      apiConnectBtn: "Select API (Auto)",
      apiManualBtn: "Enter Key Manually",
      apiStatus: localStorage.getItem('VSTYLER_CUSTOM_API_KEY') ? "Using Custom Key" : "Using System Key",
      close: "Close",
      dismiss: "Tap anywhere to dismiss",
      promptModelName: "Model Name:",
      defaultModelName: "Elite Model",
      delConfirm: "Delete this brand profile from vault?",
      alertUpload: "Please upload character and garment images.",
      eliteLook: "Elite Look",
      apiKeyError: "API Key Error. Please re-enter.",
      modeLabel: "Processing Mode",
      modeStandard: "Standard",
      modeHighExposure: "Couture Pro",
      modeDescStandard: "For casual, office wear.",
      modeDescHigh: "Optimized for Swimwear/Intimate."
    }
  }[lang];

  const base64ToBlobUrl = (base64: string, mimeType: string) => {
    try {
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (e) { return ''; }
  };

  // 1. Khôi phục kho lưu trữ từ IndexedDB khi khởi chạy
  useEffect(() => {
    const loadVault = async () => {
      try {
        const profiles = await getAllProfilesFromDB();
        const restored = profiles.map(profile => ({
          ...profile,
          references: profile.references.map(ref => ({
            ...ref,
            url: ref.base64 ? base64ToBlobUrl(ref.base64, ref.mimeType || 'image/jpeg') : ''
          }))
        }));
        setCharacterVault(restored);
      } catch (e) { console.error("Failed to load vault:", e); }
    };
    loadVault();
  }, []);

  // 2. Tự động nhận diện DNA khi có ảnh nhân vật mới
  useEffect(() => {
    const updateDNA = async () => {
      if (activeProfileId) return;
      if (characterRefs.length > 0) {
        setIsAnalyzingDNA(true);
        try {
          const dna = await identifyCharacter(characterRefs);
          setCharacterDNA(dna || "");
        } catch (e) { console.error(e); } finally { setIsAnalyzingDNA(false); }
      } else { setCharacterDNA(""); }
    };
    updateDNA();
  }, [characterRefs, activeProfileId]);

  // 3. Hàm lưu hồ sơ vào IndexedDB (KHÔNG DÙNG localStorage)
  const saveCurrentProfile = async () => {
    if (!characterDNA || characterRefs.length === 0) return;
    const name = prompt(t.promptModelName, `${t.defaultModelName} ${characterVault.length + 1}`);
    if (!name) return;
    
    const newProfile: CharacterProfile = {
      id: `brand-${Date.now()}`, 
      name, 
      dna: characterDNA,
      references: characterRefs.map(({base64, mimeType, url}) => ({base64, mimeType, url})),
      timestamp: Date.now()
    };

    try {
      await saveProfileToDB(newProfile);
      // Cập nhật state UI sau khi lưu thành công vào DB
      setCharacterVault(prev => [...prev, newProfile]);
      setActiveProfileId(newProfile.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      alert("Lỗi lưu trữ: Trình duyệt từ chối lưu dữ liệu lớn hoặc không hỗ trợ IndexedDB.");
      console.error(e);
    }
  };

  const loadProfile = (profile: CharacterProfile) => {
    setActiveProfileId(profile.id);
    setCharacterDNA(profile.dna);
    const restoredRefs = profile.references.map(ref => ({
      ...ref, 
      url: ref.base64 ? base64ToBlobUrl(ref.base64, ref.mimeType || 'image/jpeg') : ref.url
    }));
    setCharacterRefs(restoredRefs);
  };

  const resetCharacter = () => {
    setActiveProfileId(null);
    setCharacterRefs([]);
    setCharacterDNA("");
  };

  const deleteProfile = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(t.delConfirm)) {
      try {
        await deleteProfileFromDB(id);
        setCharacterVault(prev => prev.filter(p => p.id !== id));
        if (activeProfileId === id) resetCharacter();
      } catch (e) { console.error(e); }
    }
  };

  const handleGenerate = async () => {
    if (characterRefs.length === 0 || !clothing) {
      alert(t.alertUpload);
      return;
    }
    setIsGenerating(true);
    setResults([]);
    try {
      const atmoObj = ATMOSPHERES.find(a => a.id === selectedAtmosphere) || ATMOSPHERES[0];
      const iterationCount = poseRefs.length > 0 ? poseRefs.length : 5;

      for (let i = 0; i < iterationCount; i++) {
        setStatusMessage(`${t.genStatus} ${atmoObj.name[lang].toUpperCase()}... [${i + 1}/${iterationCount}]`);
        const currentPose = poseRefs.length > 0 ? poseRefs[i] : DEFAULT_POSES[lang][i];
        
        try {
          const poseImg = await generatePose(
            characterRefs, clothing, currentPose, 
            { aspectRatio, imageSize, atmosphere: atmoObj.prompt, mode: tryOnMode }, 
            accessories, characterDNA
          );
          
          if (poseImg) {
            setResults(prev => [...prev, { 
              id: `res-${Date.now()}-${i}`, 
              imageUrl: poseImg, 
              pose: typeof currentPose === 'string' ? currentPose : `${t.eliteLook} ${i+1}` 
            }]);
          }
        } catch (innerError: any) {
          console.error("Single generation failed:", innerError);
          if (innerError.message === "API_KEY_EXPIRED") {
            alert(t.apiKeyError);
            setShowSettings(true);
            setIsKeyValidated(false);
            break;
          } else {
            alert(`${lang === 'vi' ? 'Lỗi' : 'Error'} ${i+1}: ${innerError.message}`);
          }
        }
      }
    } catch (error: any) { 
      alert(error.message); 
    } finally { 
      setIsGenerating(false); 
      setStatusMessage(""); 
    }
  };

  const handleAutoSelectKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      localStorage.removeItem('VSTYLER_CUSTOM_API_KEY');
      setIsKeyValidated(true);
      setShowSettings(false);
    } catch (e) { console.error(e); }
  };

  const handleManualKey = () => {
    const key = prompt("Nhập API Key của bạn:");
    if (key && key.length > 20) {
      localStorage.setItem('VSTYLER_CUSTOM_API_KEY', key.trim());
      setIsKeyValidated(true);
      setShowSettings(false);
    }
  };

  const currentAtmo = ATMOSPHERES.find(a => a.id === selectedAtmosphere) || ATMOSPHERES[0];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-amber-500/30">
      {!isKeyValidated && <ApiKeyGate onValidated={() => setIsKeyValidated(true)} />}

      <header className="h-20 border-b border-white/10 bg-black/80 backdrop-blur-2xl px-8 flex items-center justify-between sticky top-0 z-[60]">
        <div className="flex items-center space-x-5">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-700 rounded-2xl flex items-center justify-center font-black text-2xl shadow-[0_0_25px_rgba(245,158,11,0.5)] border border-amber-300/30">V</div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">V-Styler <span className="text-amber-500">PRO</span></h1>
            <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-[0.3em] mt-1">{t.headerSub}</p>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          {saveSuccess && <div className="text-[10px] font-black text-green-400 uppercase tracking-widest animate-pulse border-b border-green-500/30 pb-1">✓ SECURED</div>}
          <div className={`hidden md:flex px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-500 items-center space-x-3 shadow-2xl ${characterDNA ? (activeProfileId ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-amber-500/10' : 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 shadow-indigo-500/10') : 'bg-white/5 border-white/10 text-gray-500'}`}>
            <span className={`w-2 h-2 rounded-full ${characterDNA ? 'bg-current animate-pulse shadow-[0_0_8px_currentColor]' : 'bg-gray-700'}`}></span>
            <span>{characterDNA ? (activeProfileId ? 'DNA LOCKED' : 'BIOMETRICS READY') : 'WAITING...'}</span>
          </div>
          
          <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-amber-500/30 transition-all group">
            <svg className="w-6 h-6 text-gray-400 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="relative border-r border-white/10 bg-[#0a0a0a] flex flex-col shrink-0 z-50 shadow-[20px_0_40px_rgba(0,0,0,0.5)]" style={{ width: `${SIDEBAR_WIDTH}px` }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide">
            
            <section>
               <h3 className="text-[11px] font-black text-amber-500/50 uppercase tracking-[0.2em] mb-5 flex items-center">
                 <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-3 shadow-[0_0_8px_rgba(245,158,11,1)]"></span>
                 {t.brandVault}
               </h3>
               <div className="flex space-x-4 overflow-x-auto pb-6 scrollbar-hide">
                 {characterVault.map(profile => (
                   <div key={profile.id} className="relative shrink-0 group">
                     <button onClick={() => loadProfile(profile)} className={`w-20 h-20 rounded-[28px] border-2 transition-all duration-500 overflow-hidden ${activeProfileId === profile.id ? 'border-amber-500 scale-110 shadow-[0_0_30px_rgba(245,158,11,0.5)]' : 'border-white/5 opacity-30 hover:opacity-100 hover:border-white/20'}`}>
                       {profile.references[0]?.url && <img src={profile.references[0].url} className="w-full h-full object-cover" />}
                     </button>
                     <button onClick={(e) => deleteProfile(e, profile.id)} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-600 border-2 border-[#0a0a0a] rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-20">×</button>
                     <p className={`text-[9px] text-center mt-3 font-black uppercase truncate w-20 tracking-tighter ${activeProfileId === profile.id ? 'text-amber-400' : 'text-gray-600'}`}>{profile.name}</p>
                   </div>
                 ))}
                 <button onClick={resetCharacter} className="w-20 h-20 rounded-[28px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-xs opacity-40 hover:opacity-100 hover:border-amber-500/50 transition-all shrink-0 bg-white/5 group">
                   <span className="text-2xl group-hover:scale-125 transition-transform font-light">+</span>
                   <span className="text-[8px] font-black mt-2 uppercase tracking-tighter">{t.newModel}</span>
                 </button>
               </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">{t.biometric}</h3>
                <div className="flex space-x-3">
                  {characterDNA && !activeProfileId && <button onClick={saveCurrentProfile} className="text-[10px] text-green-400 font-black hover:text-green-300 transition-colors uppercase tracking-[0.1em] bg-green-500/10 px-3 py-1 rounded-lg border border-green-500/20 shadow-lg">{t.saveModel}</button>}
                  {activeProfileId && <span className="text-[9px] text-amber-500 font-black uppercase tracking-[0.2em] italic bg-amber-500/5 px-3 py-1 rounded-lg border border-amber-500/20">{t.lockedProfile}</span>}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-5">
                {characterRefs.map((ref, idx) => (
                  <div key={idx} className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all group shadow-2xl ${activeProfileId ? 'border-amber-500/40 shadow-amber-500/5' : 'border-white/5 hover:border-white/20'}`}>
                    {ref.url && <img src={ref.url} className="w-full h-full object-cover" />}
                    {!activeProfileId && <button onClick={() => setCharacterRefs(prev => prev.filter((_, i) => i !== idx))} className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-bold text-xl">×</button>}
                  </div>
                ))}
                {!activeProfileId && characterRefs.length < 4 && <MediaUpload label={t.subject} icon="👤" onUpload={(m) => setCharacterRefs(p => [...p, m])} compact={true} className="aspect-square" />}
              </div>
              <button onClick={() => setIsDNAEditing(!isDNAEditing)} className="w-full py-2 border border-white/5 rounded-xl text-[9px] font-black text-white/30 hover:text-indigo-400 hover:border-indigo-500/30 transition-all uppercase tracking-[0.3em]">
                {isDNAEditing ? t.hideBio : t.inspectBio}
              </button>
              {isDNAEditing && <textarea value={characterDNA} readOnly className="w-full h-32 bg-black/80 border border-white/10 rounded-2xl mt-4 p-4 text-[10px] font-mono text-indigo-400/60 outline-none ring-1 ring-white/5 scrollbar-hide shadow-inner" />}
            </section>

            <section>
              <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-5">{t.atmoArch}</h3>
              <div className="grid grid-cols-1 gap-2.5">
                {ATMOSPHERES.map(atmo => (
                  <button key={atmo.id} onClick={() => setSelectedAtmosphere(atmo.id)} className={`flex items-center group relative overflow-hidden p-4 rounded-2xl border transition-all duration-500 ${selectedAtmosphere === atmo.id ? 'bg-amber-600/20 border-amber-400 shadow-[0_10px_30px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}>
                    <span className={`text-2xl mr-4 transition-transform duration-500 ${selectedAtmosphere === atmo.id ? 'scale-125' : 'group-hover:scale-110 opacity-50'}`}>{atmo.icon}</span>
                    <div className="flex flex-col items-start">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selectedAtmosphere === atmo.id ? 'text-amber-400' : 'text-gray-400'}`}>{atmo.name[lang]}</span>
                      <span className="text-[8px] text-white/30 font-medium uppercase tracking-tighter mt-0.5 line-clamp-1">{t.luxuryEnv}</span>
                    </div>
                    {selectedAtmosphere === atmo.id && <div className="absolute right-4 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,1)] animate-pulse" />}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-5">{t.coutureSel}</h3>
              
              <div className="mb-6 space-y-3 bg-white/5 p-4 rounded-3xl border border-white/5">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] block">{t.modeLabel}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTryOnMode("standard")} className={`py-2 px-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${tryOnMode === 'standard' ? 'bg-amber-500 border-amber-400 text-white' : 'bg-black border-white/10 text-white/30 hover:border-white/20'}`}>{t.modeStandard}</button>
                  <button onClick={() => setTryOnMode("high_exposure")} className={`py-2 px-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${tryOnMode === 'high_exposure' ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'bg-black border-white/10 text-white/30 hover:border-white/20'}`}>{t.modeHighExposure}</button>
                </div>
                <p className="text-[8px] text-gray-500 italic px-1">{tryOnMode === 'standard' ? t.modeDescStandard : t.modeDescHigh}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <MediaUpload label={t.garment} icon="👗" onUpload={setClothing} value={clothing} compact={true} />
                <MediaUpload label={t.accessory} icon="💍" onUpload={setAccessories} value={accessories} compact={true} />
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-5">{t.poseBlue}</h3>
              <div className="grid grid-cols-5 gap-2.5 mb-6">
                {poseRefs.map((ref, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    {ref.url && <img src={ref.url} className="w-full h-full object-cover" />}
                    <button onClick={() => setPoseRefs(p => p.filter((_, i) => i !== idx))} className="absolute -top-1 -right-1 w-5 h-6 bg-red-600 border-2 border-[#0a0a0a] rounded-full flex items-center justify-center text-[10px] hover:scale-110 transition-all">×</button>
                  </div>
                ))}
                {poseRefs.length < 5 && <MediaUpload label={t.pose} icon="+" onUpload={(m) => setPoseRefs(p => [...p, m])} compact={true} className="aspect-square" />}
              </div>
            </section>
          </div>

          <div className="p-8 border-t border-white/10 bg-black/60 backdrop-blur-md">
            <button onClick={handleGenerate} disabled={characterRefs.length === 0 || !clothing || isGenerating || isAnalyzingDNA} className="w-full py-6 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-700 text-white font-black rounded-[24px] shadow-[0_15px_40px_rgba(245,158,11,0.25)] transition-all hover:shadow-[0_20px_50px_rgba(245,158,11,0.35)] disabled:opacity-10 uppercase tracking-[0.3em] text-[11px] flex items-center justify-center space-x-4 active:scale-[0.97] group border border-amber-400/30">
              {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                <>
                  <span>{t.synthBtn}</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </>
              )}
            </button>
          </div>
        </aside>

        <main className="flex-1 bg-[#020202] overflow-hidden relative">
          <div className="absolute inset-0 transition-opacity duration-1000 z-0" style={{ background: `radial-gradient(circle at center, ${currentAtmo.color} 0%, transparent 80%), radial-gradient(circle at top right, rgba(245,158,11,0.05) 0%, transparent 60%)` }} />
          <div className="absolute inset-0 overflow-y-auto z-10 p-16 scrollbar-hide">
            {statusMessage && (
              <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-amber-600/90 backdrop-blur-xl px-10 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center space-x-6 border border-amber-300/30 animate-in fade-in zoom-in duration-500">
                <div className="w-5 h-5 border-[3px] border-white/20 border-t-white rounded-full animate-spin"></div>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-white">{statusMessage}</span>
              </div>
            )}
            <div className="max-w-7xl mx-auto min-h-full flex flex-col items-center">
              {results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 w-full pt-10">
                  {results.map((res, i) => (
                    <div key={res.id} className="group relative flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both" style={{ animationDelay: `${i * 200}ms` }}>
                      <div className="absolute -bottom-10 w-[90%] h-16 bg-amber-500/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-1000" />
                      <div className="relative z-10 w-full rounded-[60px] overflow-hidden bg-[#0a0a0a] border border-white/10 group-hover:border-amber-500/60 transition-all duration-700 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] group-hover:shadow-[0_60px_120px_-20px_rgba(245,158,11,0.3)] group-hover:-translate-y-6">
                        <img src={res.imageUrl} alt={res.pose} className="w-full h-auto object-cover cursor-zoom-in transition-transform duration-[2000ms] group-hover:scale-110" onClick={() => setPreviewImage(res.imageUrl)} />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-10 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-4 group-hover:translate-y-0">
                           <p className="text-[11px] font-black text-amber-500 uppercase tracking-[0.4em] mb-1">{res.pose}</p>
                           <p className="text-[9px] text-white/40 uppercase tracking-widest">{lang === 'vi' ? 'Độ Phân Giải Ultra • Tổng Hợp Bởi AI' : 'Ultra Resolution • AI Synthesized'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-32">
                  <div className="relative mb-16">
                    <div className="w-48 h-48 border border-amber-500/10 rounded-full animate-[spin_20s_linear_infinite]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-[0_0_30px_rgba(245,158,11,1)]" />
                      <div className="absolute w-24 h-24 border border-amber-500/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                    </div>
                  </div>
                  <h2 className="text-6xl font-black uppercase tracking-[0.8em] text-white/5 select-none pl-[0.8em]">{t.awaiting}</h2>
                  <p className="text-[11px] font-black text-amber-500/20 uppercase mt-8 tracking-[0.5em]">{t.ready}</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowSettings(false)}>
          <div className="max-w-md w-full bg-[#0a0a0a] border border-amber-500/20 rounded-[40px] p-10 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 p-8">
              <button onClick={() => setShowSettings(false)} className="text-white/30 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <h2 className="text-2xl font-black uppercase tracking-[0.2em] mb-8 flex items-center">
              <span className="w-2 h-2 bg-amber-500 rounded-full mr-4 shadow-[0_0_10px_rgba(245,158,11,1)]" />
              {t.settings}
            </h2>

            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] block">{t.langLabel}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setLang('vi')} className={`py-4 rounded-2xl border transition-all font-black text-[10px] tracking-widest uppercase ${lang === 'vi' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/5 text-white/30 hover:border-white/20'}`}>Tiếng Việt</button>
                  <button onClick={() => setLang('en')} className={`py-4 rounded-2xl border transition-all font-black text-[10px] tracking-widest uppercase ${lang === 'en' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/5 text-white/30 hover:border-white/20'}`}>English</button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] block">{t.apiKeyLabel}</label>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,1)]" />
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t.apiStatus}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <button onClick={handleAutoSelectKey} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">{t.apiConnectBtn}</button>
                    <button onClick={handleManualKey} className="w-full py-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all text-amber-500">{t.apiManualBtn}</button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button onClick={() => setShowSettings(false)} className="w-full py-5 bg-gradient-to-r from-amber-600 to-yellow-700 text-white font-black rounded-2xl uppercase tracking-[0.3em] text-[10px] shadow-xl active:scale-95 transition-all">{t.close}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[200] bg-black/98 flex items-center justify-center p-12 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-full max-h-full group">
            <img src={previewImage} className="max-w-full max-h-[85vh] rounded-[40px] shadow-[0_0_150px_rgba(0,0,0,1)] border border-white/10 group-hover:border-amber-500/30 transition-colors duration-1000" />
            <div className="absolute -top-16 inset-x-0 flex justify-center">
               <button className="text-amber-500/40 hover:text-amber-500 font-black text-[10px] tracking-[0.5em] uppercase transition-all flex flex-col items-center space-y-2">
                 <span>{t.dismiss}</span>
                 <div className="w-12 h-0.5 bg-current rounded-full" />
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

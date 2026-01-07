
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageSize, StylerMedia, TryOnMode } from "../types";

// Helper để khởi tạo AI từ Key lưu trong máy hoặc biến môi trường
const getAI = () => {
  // Ưu tiên lấy key người dùng nhập tay
  let apiKey = localStorage.getItem('VSTYLER_CUSTOM_API_KEY');
  
  // Nếu không có, thử lấy từ process.env (trường hợp chạy trên IDX/Cloud đặc biệt) hoặc window.aistudio
  if (!apiKey) {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      apiKey = process.env.API_KEY;
    }
  }

  if (!apiKey) {
    throw new Error("API_KEY_EXPIRED"); // Báo lỗi để UI hiển thị popup nhập key
  }
  
  return new GoogleGenAI({ apiKey });
};

export const identifyCharacter = async (characterRefs: StylerMedia[]) => {
  const ai = getAI();
  
  const parts: any[] = [
    { text: "### ROLE: BIOMETRIC_CONSISTENCY_ENGINE" },
    { text: "Task: Analyze the subject and generate a detailed DNA profile. Focus on immutable facial geometry, bone structure, and specific skin undertones." }
  ];

  characterRefs.forEach((media) => {
    if (media.base64) {
      parts.push({ inlineData: { data: media.base64, mimeType: media.mimeType || 'image/jpeg' } });
    }
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: parts }
    });
    return response.text;
  } catch (error: any) {
    console.error("Identify Error:", error);
    throw error;
  }
};

export const generatePose = async (
  characterRefs: StylerMedia[], 
  clothing: StylerMedia, 
  poseIdentifier: string | StylerMedia,
  config: { aspectRatio: AspectRatio; imageSize: ImageSize; atmosphere?: string; mode: TryOnMode },
  accessories?: StylerMedia,
  backgroundRef?: StylerMedia,
  characterDNA?: string
) => {
  const ai = getAI();
  const parts: any[] = [];
  
  // 1. Source A: Identity
  parts.push({ text: "### SOURCE_A (IDENTITY): The target person who will wear the clothes." });
  if (characterRefs[0].base64) {
    parts.push({ inlineData: { data: characterRefs[0].base64, mimeType: characterRefs[0].mimeType || 'image/jpeg' } });
  }
  
  // 2. Source B: Clothing
  parts.push({ text: "### SOURCE_B (MASTER_GARMENT): The exact clothing to be transferred. This is the ONLY source for fabric, color, pattern, and design." });
  if (clothing.base64) {
    parts.push({ inlineData: { data: clothing.base64, mimeType: clothing.mimeType || 'image/jpeg' } });
  }

  // 3. Accessories
  if (accessories && accessories.base64) {
    parts.push({ text: "### SOURCE_C (ACCESSORY): Add this item to the final result." });
    parts.push({ inlineData: { data: accessories.base64, mimeType: accessories.mimeType || 'image/jpeg' } });
  }

  // 4. Pose
  if (poseIdentifier && typeof poseIdentifier !== 'string' && poseIdentifier.base64) {
    parts.push({ text: "### SOURCE_D (POSE_GUIDE): Follow this skeletal structure." });
    parts.push({ inlineData: { data: poseIdentifier.base64, mimeType: poseIdentifier.mimeType || 'image/jpeg' } });
  }

  // 5. Background Reference (New)
  if (backgroundRef && backgroundRef.base64) {
    parts.push({ text: "### SOURCE_E (BACKGROUND): Use this image as the exact background/environment." });
    parts.push({ inlineData: { data: backgroundRef.base64, mimeType: backgroundRef.mimeType || 'image/jpeg' } });
  }

  // 6. Prompt Construction
  const backgroundPrompt = config.atmosphere && config.atmosphere.trim() !== "" 
    ? config.atmosphere 
    : "Professional studio lighting, clean neutral luxury background";

  let synthesisPrompt = "";
  
  // Logic xử lý Prompt khi có Background Image
  const bgInstruction = backgroundRef 
    ? `BACKGROUND: Composite the subject seamlessly into SOURCE_E. Match the lighting, shadows, and perspective of SOURCE_E exactly.` 
    : `BACKGROUND/ENVIRONMENT: ${backgroundPrompt}. Ensure the lighting on the subject matches this environment perfectly.`;

  if (config.mode === "high_exposure") {
    synthesisPrompt = `
    [TASK: HIGH-FIDELITY GARMENT TRANSFER]
    1. SUBJECT: Render the person from SOURCE_A with absolute facial and body consistency. DNA: ${characterDNA?.substring(0, 200)}.
    2. CLOTHING: Extract the EXACT garment from SOURCE_B. Preserve the precise texture, weaving pattern, logos, and color shade. Do not simplify or alter the design.
    3. FIT: Drape the SOURCE_B clothing onto the SOURCE_A body perfectly. The clothing must look like it was worn by SOURCE_A in the photo.
    4. POSE: ${typeof poseIdentifier === 'string' ? poseIdentifier : 'Mirror the pose from SOURCE_D'}.
    5. ${bgInstruction}
    6. QUALITY: 8k resolution, realistic fabric folds, and shadow interaction between fabric and skin.
    7. RESTRICTION: IGNORE the person in SOURCE_B. Use ONLY the person from SOURCE_A.
    `;
  } else {
    synthesisPrompt = `
    [TASK: COMMERCIAL VIRTUAL TRY-ON]
    1. MANDATORY: The output person must be the person from SOURCE_A.
    2. MANDATORY: The output clothing must be an IDENTICAL copy of the clothing in SOURCE_B (pattern, color, fabric).
    3. ENVIRONMENT: ${backgroundRef ? "Use SOURCE_E as background." : backgroundPrompt}.
    4. POSE: ${typeof poseIdentifier === 'string' ? poseIdentifier : 'Follow SOURCE_D'}.
    5. STYLE: Sharp, high-contrast catalog photography.
    `;
  }
  parts.push({ text: synthesisPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // Model tạo ảnh mạnh nhất
      contents: { parts: parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio,
          imageSize: config.imageSize
        },
      }
    });

    let finalImg = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          finalImg = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (finalImg) {
      return finalImg;
    } else {
      throw new Error("Model failed to render image.");
    }

  } catch (error: any) {
    console.error("Generate Error:", error);
    // Chuẩn hóa lỗi để App.tsx hiểu
    if (error.message && (error.message.includes("403") || error.message.includes("API key not valid"))) {
        throw new Error("API_KEY_EXPIRED");
    }
    throw error;
  }
};

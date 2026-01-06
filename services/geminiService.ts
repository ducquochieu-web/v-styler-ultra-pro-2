
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { AspectRatio, ImageSize, StylerMedia, TryOnMode } from "../types";

export const createAI = () => {
  // Ưu tiên lấy key thủ công từ localStorage, nếu không có mới dùng process.env.API_KEY
  const manualKey = localStorage.getItem('VSTYLER_CUSTOM_API_KEY');
  const apiKey = manualKey || process.env.API_KEY;
  return new GoogleGenAI({ apiKey: apiKey });
};

export const identifyCharacter = async (characterRefs: StylerMedia[]) => {
  const ai = createAI();
  const parts: any[] = [];
  
  parts.push({ text: "### ROLE: BIOMETRIC_CONSISTENCY_ENGINE" });
  parts.push({ text: "Task: Analyze the subject and generate a detailed DNA profile. Focus on immutable facial geometry, bone structure, and specific skin undertones to ensure perfect character locking in future generations." });
  
  characterRefs.forEach((media) => {
    parts.push({ inlineData: { data: media.base64!, mimeType: media.mimeType! } });
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: parts }
  });
  
  return response.text;
};

export const generatePose = async (
  characterRefs: StylerMedia[], 
  clothing: StylerMedia, 
  poseIdentifier: string | StylerMedia,
  config: { aspectRatio: AspectRatio; imageSize: ImageSize; atmosphere?: string; mode: TryOnMode },
  accessories?: StylerMedia,
  characterDNA?: string
) => {
  const ai = createAI();
  const parts: any[] = [];
  
  // Nguồn A: Nhân vật (Mặt chính)
  parts.push({ text: "### INPUT_A (SUBJECT_IDENTITY):" });
  parts.push({ inlineData: { data: characterRefs[0].base64!, mimeType: characterRefs[0].mimeType! } });
  
  // Nguồn B: Trang phục
  parts.push({ text: "### INPUT_B (GARMENT_REFERENCE):" });
  parts.push({ inlineData: { data: clothing.base64!, mimeType: clothing.mimeType! } });

  if (accessories?.base64) {
    parts.push({ text: "### INPUT_C (ACCESSORY):" });
    parts.push({ inlineData: { data: accessories.base64, mimeType: accessories.mimeType! } });
  }

  if (typeof poseIdentifier !== 'string') {
    parts.push({ text: "### INPUT_D (POSE_REFERENCE):" });
    parts.push({ inlineData: { data: poseIdentifier.base64!, mimeType: poseIdentifier.mimeType! } });
  }

  let synthesisPrompt = "";

  if (config.mode === "high_exposure") {
    synthesisPrompt = `
    [CONTEXT: PROFESSIONAL VIRTUAL CLOTHING SIMULATION]
    1. TARGET: Render the EXACT person from INPUT_A. Maintain total facial consistency. (Identity Ref: ${characterDNA?.substring(0, 300)})
    2. GARMENT: Seamlessly drape the clothing from INPUT_B onto the person from INPUT_A. 
    3. PHOTOGRAPHY: Style this as a high-end luxury editorial photoshoot. Use artistic studio lighting and professional composition.
    4. SKELETON: Follow the ${typeof poseIdentifier === 'string' ? 'standing pose: ' + poseIdentifier : 'pose from INPUT_D'}.
    5. ENVIRONMENT: ${config.atmosphere || "Clean professional studio backdrop"}.
    6. MANDATORY: This is a professional fashion visualization. Ensure high-quality rendering of fabrics and skin textures.
    7. RESTRICTION: Do not use the face of the person in INPUT_B. Use ONLY the face from INPUT_A.
    `;
  } else {
    synthesisPrompt = `
    [CONTEXT: FASHION CATALOG GENERATION]
    1. MODEL: Replace the person in INPUT_B with the identity of the person in INPUT_A.
    2. CLOTHING: Keep the clothing from INPUT_B exactly as is.
    3. STYLE: Bright, clean, commercial catalog photography.
    4. POSE: ${typeof poseIdentifier === 'string' ? poseIdentifier : 'Follow INPUT_D'}.
    5. SETTING: ${config.atmosphere}.
    `;
  }

  parts.push({ text: synthesisPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio as any,
          imageSize: config.imageSize as any
        },
      }
    });

    let finalImg = null;
    let feedback = "";

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          finalImg = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
        if (part.text) feedback += part.text;
      }
    }

    if (finalImg) return finalImg;

    if (feedback.toLowerCase().includes("safety") || feedback.toLowerCase().includes("policy") || feedback.length > 0) {
      throw new Error("AI Safety Filter: Trang phục hoặc tư thế này đã kích hoạt bộ lọc an toàn. Hãy thử chọn bối cảnh khác.");
    }
    
    throw new Error("Mô hình không trả về ảnh. Có thể do lỗi kết nối.");
  } catch (error: any) {
    if (error.message?.includes("entity was not found") || error.message?.includes("API_KEY_EXPIRED")) {
      // Xóa key lỗi khỏi localStorage để người dùng nhập lại
      localStorage.removeItem('VSTYLER_CUSTOM_API_KEY');
      throw new Error("API_KEY_EXPIRED");
    }
    throw error;
  }
};

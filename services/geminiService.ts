
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { AspectRatio, ImageSize, StylerMedia, TryOnMode } from "../types";

export const createAI = () => {
  const manualKey = localStorage.getItem('VSTYLER_CUSTOM_API_KEY');
  const apiKey = manualKey || import.meta.env.VITE_API_KEY || undefined;
  return new GoogleGenAI({ apiKey: apiKey });
};

export const identifyCharacter = async (characterRefs: StylerMedia[]) => {
  const ai = createAI();
  const parts: any[] = [];
  
  parts.push({ text: "### ROLE: BIOMETRIC_CONSISTENCY_ENGINE" });
  parts.push({ text: "Task: Analyze the subject and generate a detailed DNA profile. Focus on immutable facial geometry, bone structure, and specific skin undertones." });
  
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
  
  // Nguồn A: Nhân vật đích
  parts.push({ text: "### SOURCE_A (IDENTITY): The target person who will wear the clothes." });
  parts.push({ inlineData: { data: characterRefs[0].base64!, mimeType: characterRefs[0].mimeType! } });
  
  // Nguồn B: Trang phục gốc (Cực kỳ quan trọng)
  parts.push({ text: "### SOURCE_B (MASTER_GARMENT): The exact clothing to be transferred. This is the ONLY source for fabric, color, pattern, and design." });
  parts.push({ inlineData: { data: clothing.base64!, mimeType: clothing.mimeType! } });

  if (accessories?.base64) {
    parts.push({ text: "### SOURCE_C (ACCESSORY): Add this item to the final result." });
    parts.push({ inlineData: { data: accessories.base64, mimeType: accessories.mimeType! } });
  }

  if (typeof poseIdentifier !== 'string') {
    parts.push({ text: "### SOURCE_D (POSE_GUIDE): Follow this skeletal structure." });
    parts.push({ inlineData: { data: poseIdentifier.base64!, mimeType: poseIdentifier.mimeType! } });
  }

  let synthesisPrompt = "";
  // Đảm bảo luôn có mô tả bối cảnh, nếu không có thì dùng mặc định Studio
  const backgroundPrompt = config.atmosphere && config.atmosphere.trim() !== "" 
    ? config.atmosphere 
    : "Professional studio lighting, clean neutral luxury background";

  if (config.mode === "high_exposure") {
    synthesisPrompt = `
    [TASK: HIGH-FIDELITY GARMENT TRANSFER]
    1. SUBJECT: Render the person from SOURCE_A with absolute facial and body consistency. DNA: ${characterDNA?.substring(0, 200)}.
    2. CLOTHING: Extract the EXACT garment from SOURCE_B. Preserve the precise texture, weaving pattern, logos, and color shade. Do not simplify or alter the design.
    3. FIT: Drape the SOURCE_B clothing onto the SOURCE_A body perfectly. The clothing must look like it was worn by SOURCE_A in the photo.
    4. POSE: ${typeof poseIdentifier === 'string' ? poseIdentifier : 'Mirror the pose from SOURCE_D'}.
    5. BACKGROUND/ENVIRONMENT: ${backgroundPrompt}. Ensure the lighting on the subject matches this environment perfectly.
    6. QUALITY: 8k resolution, realistic fabric folds, and shadow interaction between fabric and skin.
    7. RESTRICTION: IGNORE the person in SOURCE_B. Use ONLY the person from SOURCE_A.
    `;
  } else {
    synthesisPrompt = `
    [TASK: COMMERCIAL VIRTUAL TRY-ON]
    1. MANDATORY: The output person must be the person from SOURCE_A.
    2. MANDATORY: The output clothing must be an IDENTICAL copy of the clothing in SOURCE_B (pattern, color, fabric).
    3. ENVIRONMENT: ${backgroundPrompt}.
    4. POSE: ${typeof poseIdentifier === 'string' ? poseIdentifier : 'Follow SOURCE_D'}.
    5. STYLE: Sharp, high-contrast catalog photography.
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
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          finalImg = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (finalImg) return finalImg;
    throw new Error("Model failed to render. Please check images or try a different atmosphere.");
  } catch (error: any) {
    if (error.message?.includes("entity was not found")) throw new Error("API_KEY_EXPIRED");
    throw error;
  }
};

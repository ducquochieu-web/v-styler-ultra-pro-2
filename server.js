
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Tăng limit để nhận ảnh base64

// Initialize Gemini (Server-side)
// LƯU Ý: Key sẽ được lấy từ biến môi trường server, an toàn tuyệt đối.
const getAI = (apiKey) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) throw new Error("API Key not found on server");
  return new GoogleGenAI({ apiKey: key });
};

// API: Identify Character (DNA)
app.post('/api/identify', async (req, res) => {
  try {
    const { characterRefs, apiKey } = req.body;
    const ai = getAI(apiKey);
    
    const parts = [
      { text: "### ROLE: BIOMETRIC_CONSISTENCY_ENGINE" },
      { text: "Task: Analyze the subject and generate a detailed DNA profile. Focus on immutable facial geometry, bone structure, and specific skin undertones." }
    ];

    characterRefs.forEach((media) => {
      parts.push({ inlineData: { data: media.base64, mimeType: media.mimeType } });
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Dùng bản Flash cho nhanh và rẻ
      contents: { parts: parts }
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error("Identify Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// API: Generate Pose (Image Synthesis)
app.post('/api/generate', async (req, res) => {
  try {
    const { characterRefs, clothing, accessories, poseIdentifier, config, characterDNA, apiKey } = req.body;
    const ai = getAI(apiKey);

    const parts = [];
    
    // 1. Source A: Identity
    parts.push({ text: "### SOURCE_A (IDENTITY): The target person who will wear the clothes." });
    parts.push({ inlineData: { data: characterRefs[0].base64, mimeType: characterRefs[0].mimeType } });
    
    // 2. Source B: Clothing
    parts.push({ text: "### SOURCE_B (MASTER_GARMENT): The exact clothing to be transferred. This is the ONLY source for fabric, color, pattern, and design." });
    parts.push({ inlineData: { data: clothing.base64, mimeType: clothing.mimeType } });

    // 3. Accessories
    if (accessories && accessories.base64) {
      parts.push({ text: "### SOURCE_C (ACCESSORY): Add this item to the final result." });
      parts.push({ inlineData: { data: accessories.base64, mimeType: accessories.mimeType } });
    }

    // 4. Pose
    if (poseIdentifier && typeof poseIdentifier !== 'string' && poseIdentifier.base64) {
      parts.push({ text: "### SOURCE_D (POSE_GUIDE): Follow this skeletal structure." });
      parts.push({ inlineData: { data: poseIdentifier.base64, mimeType: poseIdentifier.mimeType } });
    }

    // 5. Prompt Construction
    const backgroundPrompt = config.atmosphere && config.atmosphere.trim() !== "" 
      ? config.atmosphere 
      : "Professional studio lighting, clean neutral luxury background";

    let synthesisPrompt = "";
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

    // Call AI
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

    // Extract Image
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
      res.json({ imageUrl: finalImg });
    } else {
      res.status(500).json({ error: "Model failed to render image." });
    }

  } catch (error) {
    console.error("Generate Error:", error);
    // Xử lý lỗi đặc thù của Google
    if (error.message && error.message.includes("entity was not found")) {
      res.status(403).json({ error: "API_KEY_EXPIRED" });
    } else {
      res.status(500).json({ error: error.message || "Unknown error" });
    }
  }
});

// Serve Frontend (Production)
// Khi chạy production, server này sẽ trả về file React đã build
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

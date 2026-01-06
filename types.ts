
export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
export type ImageSize = "1K" | "2K" | "4K";
export type Language = "vi" | "en";
export type TryOnMode = "standard" | "high_exposure";

export type Atmosphere = {
  id: string;
  name: Record<Language, string>;
  prompt: string;
  icon: string;
  color: string;
};

export interface CharacterProfile {
  id: string;
  name: string;
  dna: string;
  references: StylerMedia[];
  timestamp: number;
}

export interface GenerationConfig {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  atmosphere?: string;
  mode: TryOnMode;
}

export interface StylerMedia {
  url: string;
  base64?: string;
  mimeType?: string;
}

export interface GenerationResult {
  id: string;
  imageUrl: string;
  pose: string;
}

export interface VideoResult {
  url: string;
  thumbnail: string;
}

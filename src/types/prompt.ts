export type PromptCategory = '文生图' | '图改图' | '图生视频' | '文生视频';

export interface PromptParameters {
  aspectRatio?: string;     // e.g. "16:9", "9:16", "1:1", "4:3"
  stylize?: number | string; // e.g. 250
  chaos?: number | string;
  version?: string;          // e.g. "6.1"
  negativePrompt?: string;   // e.g. "blurry, low quality, bad anatomy"
  steps?: number | string;
  seed?: number | string;
  cfgScale?: number | string;
  cameraMotion?: string;     // for video: pan, zoom, tilt, static
  fps?: number | string;
}

export interface PromptItem {
  id: string;                // unique id or file path slug
  title: string;
  category: PromptCategory;
  models: string[];          // e.g. ["Midjourney", "FLUX", "Runway", "Kling"]
  createdAt: string;         // ISO date
  updatedAt: string;         // ISO date
  coverImage?: string;       // relative path e.g. "media/covers/xxx.jpg" or "media/images/xxx.png"
  mediaFiles?: string[];     // list of attached media paths
  tags: string[];            // e.g. ["赛博朋克", "人像摄影"]
  parameters: PromptParameters;
  promptEn: string;          // English prompt
  promptZh: string;          // Chinese prompt translation
  notes?: string;            // extra usage tips, negative prompt details
  folderPath: string;        // relative folder path under prompts/ e.g. "角色设计" or "" (root)
  filePath: string;          // full relative path under Assets/prompts/ e.g. "角色设计/赛博朋克机械姬.md"
}

export interface FolderNode {
  name: string;
  path: string;              // relative path under Assets/prompts
  children: FolderNode[];
  itemCount: number;
}

export interface AvailableGeminiModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  supportedGenerationMethods: string[];
}

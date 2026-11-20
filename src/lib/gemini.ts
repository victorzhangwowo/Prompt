import { GoogleGenerativeAI } from '@google/generative-ai';

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length);
    const chars: string[] = new Array(end - i);
    for (let j = i; j < end; j++) {
      chars[j - i] = String.fromCharCode(bytes[j]);
    }
    binary += chars.join('');
  }
  return btoa(binary);
}

export function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('未检测到 Gemini API Key。请在页面右上角【设置】中配置您的 Google AI API Key，或在 .env.local 中配置 GEMINI_API_KEY。');
  }
  return new GoogleGenerativeAI(apiKey);
}

export interface AvailableGeminiModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  supportedGenerationMethods: string[];
}

export async function fetchAvailableModels(apiKey: string): Promise<AvailableGeminiModel[]> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('请输入有效的 API Key');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `获取模型列表失败 (HTTP ${res.status})，请检查 API Key 是否有效。`);
  }

  const data = await res.json();
  const rawModels: any[] = data.models || [];

  // Filter only generative models that support generateContent
  const filtered: AvailableGeminiModel[] = rawModels
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => {
      const id = m.name.replace(/^models\//, '');
      return {
        id,
        name: m.name,
        displayName: m.displayName || id,
        description: m.description || '',
        supportedGenerationMethods: m.supportedGenerationMethods || [],
      };
    });

  // Sort logically: gemini-2.5 first, then gemini-2.0, then gemini-1.5, etc.
  filtered.sort((a, b) => {
    const getScore = (id: string) => {
      if (id.includes('2.5-flash')) return 100;
      if (id.includes('2.5-pro')) return 95;
      if (id.includes('2.0-flash')) return 90;
      if (id.includes('2.0-pro')) return 85;
      if (id.includes('1.5-flash')) return 70;
      if (id.includes('1.5-pro')) return 65;
      if (id.startsWith('gemini-2.')) return 60;
      if (id.startsWith('gemini-1.')) return 50;
      if (id.startsWith('gemini')) return 40;
      return 10;
    };
    return getScore(b.id) - getScore(a.id);
  });

  return filtered;
}

export async function translatePromptWithGemini(
  text: string,
  targetLang: 'en' | 'zh',
  apiKey?: string,
  selectedModel?: string
): Promise<string> {
  const genAI = getGeminiClient(apiKey);
  const targetModelName = selectedModel?.trim() || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: targetModelName });

  let systemPrompt = '';
  if (targetLang === 'en') {
    systemPrompt = `你是一位世界顶尖的 AI 绘画与视频生成提示词专家（精通 Midjourney、FLUX.1、Runway Gen-3、Kling、Sora 等）。
用户的输入是一段中文提示词或创意描述。请将其翻译并优化为最适宜现代生成式 AI 理解的高质量【英文提示词】。
规则：
1. 保持或丰富画面的视觉细节、主体特征、艺术风格、光影气氛、色彩与镜头构图。
2. 保留常用 AI 绘图术语（如 photorealistic, 8k resolution, cinematic lighting, octane render, volumetric light, bokeh, wide angle shot 等）。
3. 只直接输出最终英文提示词文本，不要包含任何解释、前缀或标点引号。`;
  } else {
    systemPrompt = `你是一位专业的 AI 提示词翻译与艺术指导专家。
用户的输入是一段英文 AI 生成提示词（包含画质、风格、构图等修饰词）。请将其翻译为通顺、优美、精确的【中文释义】。
规则：
1. 准确传达提示词中的所有视觉要素、主体、材质、光影与艺术风格。
2. 对专业术语（如 Octane 渲染、丁达尔光、浅景深、微距、特写等）采用业界通用中文表达。
3. 只直接输出翻译后的中文文本，不要添加多余的前缀和无关说明。`;
  }

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: `输入文本：\n${text}` }
  ]);

  return result.response.text().trim();
}

export interface ReversePromptResult {
  title: string;
  category: '文生图' | '图改图' | '图生视频' | '文生视频';
  recommendedModels: string[];
  tags: string[];
  visualBreakdown: {
    subject: string;
    styleAndMedium: string;
    lightingAndColor: string;
    compositionAndCamera: string;
  };
  promptEn: string;
  promptZh: string;
  suggestedParameters: {
    aspectRatio?: string;
    stylize?: string;
    cameraMotion?: string;
  };
}

export async function reversePromptFromMedia(
  base64Data: string,
  mimeType: string,
  apiKey?: string,
  selectedModel?: string
): Promise<ReversePromptResult> {
  const genAI = getGeminiClient(apiKey);
  const targetModelName = selectedModel?.trim() || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: targetModelName });

  const mediaPart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  const isVideo = mimeType.startsWith('video/');

  const systemInstruction = `你是一位全球顶尖的多模态视觉逆向工程专家和 AI 提示词大师。
请对所提供的${isVideo ? '视频' : '图像'}进行深度的视觉逆向解构，反向推导如果要用现代 AI 生成模型（如 Midjourney v6.1、FLUX.1、Runway Gen-3、Kling、Sora 等）重新生成完全相同或类似质感的作品，所需的完整提示词。

请严格返回如下 JSON 格式（不要添加任何 markdown 代码块外部的多余文本）：
{
  "title": "简短有概括力的中文标题（10字以内）",
  "category": "${isVideo ? '文生视频' : '文生图'}", // 选项只允许：文生图、图改图、图生视频、文生视频
  "recommendedModels": ["Midjourney v6.1", "FLUX.1-dev"],
  "tags": ["标签1", "标签2", "标签3"],
  "visualBreakdown": {
    "subject": "主体特征与细节描述",
    "styleAndMedium": "艺术风格与渲染媒介（如真实摄影、3D动画、赛博朋克、水墨等）",
    "lightingAndColor": "光影结构与主色调氛围",
    "compositionAndCamera": "构图视角${isVideo ? '及运镜运动方式' : ''}"
  },
  "promptEn": "极具专业度的高质量英文生成提示词（包含视觉主体、风格、光影、构图与渲染品质词）",
  "promptZh": "对应的完整中文精准翻译与释义",
  "suggestedParameters": {
    "aspectRatio": "16:9",
    "stylize": "200",
    "cameraMotion": "${isVideo ? 'Pan right slow / Zoom in' : ''}"
  }
}`;

  const result = await model.generateContent([
    { text: systemInstruction },
    mediaPart,
  ]);

  const rawText = result.response.text().trim();
  const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleanedJson) as ReversePromptResult;
    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini reverse prompt JSON:', rawText);
    throw new Error('解析 AI 反推结果失败，请重试');
  }
}

export async function enhancePromptWithGemini(
  roughPrompt: string,
  category: string,
  targetModel: string,
  apiKey?: string,
  selectedModel?: string
): Promise<{ enhancedEn: string; enhancedZh: string; suggestedTags: string[] }> {
  const genAI = getGeminiClient(apiKey);
  const targetModelName = selectedModel?.trim() || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: targetModelName });

  const prompt = `你是一位专门为 ${targetModel || 'Midjourney & FLUX'} 打造大师级提示词的 AI 提示词工程专家。
用户给出了一个初步想法或简短提示词：“${roughPrompt}”（类型：${category}）。
请将其大幅度扩写并润色，丰富其主体细节、材质肌理、艺术流派、专业构图、光影层级与渲染氛围，使其达到可直接生成商业大片级别的质量。

请严格返回如下 JSON 格式：
{
  "enhancedEn": "扩写润色后的终极高质量英文提示词",
  "enhancedZh": "对应的优雅中文翻译",
  "suggestedTags": ["标签1", "标签2", "标签3"]
}`;

  const result = await model.generateContent([{ text: prompt }]);
  const rawText = result.response.text().trim();
  const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleanedJson);
  } catch {
    return {
      enhancedEn: rawText,
      enhancedZh: '无法解析翻译结构，请查看英文结果',
      suggestedTags: [],
    };
  }
}

export async function generateTagsFromPrompt(
  promptText: string,
  category?: string,
  apiKey?: string,
  selectedModel?: string
): Promise<string[]> {
  const genAI = getGeminiClient(apiKey);
  const targetModelName = selectedModel?.trim() || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: targetModelName });

  const instruction = `你是一位顶尖的 AI 艺术与视频生成标签分类专家。
请根据以下提示词（Prompt）的内容、主体特征、艺术风格、光影、题材或媒介，自动提取并提炼出 3 到 6 个最核心、最具概括力的中文分类标签（每个标签 2 到 6 个字，例如：“赛博朋克”、“人像摄影”、“丁达尔光”、“科幻机甲”、“水墨写意”、“电影质感”等）。

提示词类型：${category || '文生图'}
提示词内容：
${promptText}

请严格只返回 JSON 格式的字符串数组，例如：["赛博朋克", "雨夜", "霓虹光效"]。不要输出任何额外的问答、解释或 markdown 文本。`;

  const result = await model.generateContent([{ text: instruction }]);
  const rawText = result.response.text().trim();
  const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleanedJson);
    if (Array.isArray(parsed)) {
      return parsed.map((t: any) => String(t).trim().replace(/^#/, '')).filter(Boolean);
    }
    return [];
  } catch {
    const matches = rawText.match(/["']([^"']+)["']/g);
    if (matches) {
      return matches.map((m) => m.slice(1, -1).trim()).filter(Boolean);
    }
    return [];
  }
}

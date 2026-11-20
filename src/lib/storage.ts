import { PromptItem, FolderNode, PromptCategory } from '@/types/prompt';
import { getCloudflareBindings } from '@/lib/cloudflare';

const PROMPT_KEY_PREFIX = 'prompt:';
const FOLDERS_META_KEY = 'meta:folders';
const SEEDED_META_KEY = 'meta:seeded_v1';

// Pure Edge-safe standard Markdown + JSON-in-YAML frontmatter serializer/parser
// Stores valid YAML frontmatter (valid YAML subset) + standard Markdown body
function serializePromptToMarkdown(item: PromptItem): string {
  const fm: Record<string, any> = {
    id: item.id,
    title: item.title,
    category: item.category,
    models: item.models || [],
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };

  if (item.coverImage) fm.coverImage = item.coverImage;
  if (item.mediaFiles && item.mediaFiles.length > 0) fm.mediaFiles = item.mediaFiles;
  if (item.tags && item.tags.length > 0) fm.tags = item.tags;
  if (item.parameters && Object.keys(item.parameters).length > 0) {
    fm.parameters = item.parameters;
  }

  const yamlLines: string[] = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    yamlLines.push(`${k}: ${JSON.stringify(v)}`);
  }
  yamlLines.push('---');

  let body = `\n# ${item.title}\n\n`;
  if (item.promptEn) {
    body += `## 英文提示词 (Prompt)\n${item.promptEn.trim()}\n\n`;
  }
  if (item.promptZh) {
    body += `## 中文释义 (Chinese Translation)\n${item.promptZh.trim()}\n\n`;
  }
  if (item.notes) {
    body += `## 备注与使用心得 (Notes)\n${item.notes.trim()}\n\n`;
  }

  return `${yamlLines.join('\n')}\n${body}`;
}

function parseMarkdownToPrompt(rawMarkdown: string, relativeFilePath: string): PromptItem {
  const data: Record<string, any> = {};
  let content = rawMarkdown;

  const fmMatch = rawMarkdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (fmMatch) {
    const fmBlock = fmMatch[1];
    content = fmMatch[2] || '';
    for (const line of fmBlock.split(/\r?\n/)) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const valStr = line.slice(idx + 1).trim();
      if (!key) continue;
      try {
        data[key] = JSON.parse(valStr);
      } catch {
        data[key] = valStr.replace(/^["']|["']$/g, '');
      }
    }
  }

  let promptEn = data.promptEn || '';
  let promptZh = data.promptZh || '';
  let notes = data.notes || '';

  if (!promptEn && !promptZh) {
    const enMatch = content.match(
      /##\s*(?:英文提示词|Prompt|English Prompt)[^\n]*\n+([\s\S]*?)(?=\n##|$)/i
    );
    const zhMatch = content.match(
      /##\s*(?:中文释义|中文提示词|Chinese|Translation)[^\n]*\n+([\s\S]*?)(?=\n##|$)/i
    );
    const notesMatch = content.match(
      /##\s*(?:备注|Notes|使用心得)[^\n]*\n+([\s\S]*?)(?=\n##|$)/i
    );

    if (enMatch) promptEn = enMatch[1].trim();
    if (zhMatch) promptZh = zhMatch[1].trim();
    if (notesMatch) notes = notesMatch[1].trim();
    if (!promptEn && !promptZh) promptEn = content.trim();
  }

  const normalized = relativeFilePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  const folderPath = lastSlash === -1 ? '' : normalized.slice(0, lastSlash);
  const fileName = lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
  const fileNameWithoutExt = fileName.replace(/\.md$/i, '');

  return {
    id: data.id || `prompt-${fileNameWithoutExt}`,
    title: data.title || fileNameWithoutExt,
    category: (data.category as PromptCategory) || '文生图',
    models: Array.isArray(data.models)
      ? data.models
      : data.models
      ? [String(data.models)]
      : ['Midjourney v6.1'],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    coverImage: data.coverImage || '',
    mediaFiles: Array.isArray(data.mediaFiles) ? data.mediaFiles : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    parameters: data.parameters && typeof data.parameters === 'object' ? data.parameters : {},
    promptEn: promptEn || '',
    promptZh: promptZh || '',
    notes: notes || '',
    folderPath,
    filePath: normalized,
  };
}

const SAMPLE_PROMPTS: PromptItem[] = [
  {
    id: 'prompt-sample-001',
    title: '赛博朋克雨夜霓虹街道',
    category: '文生图',
    models: ['Midjourney v6.1', 'FLUX.1-dev'],
    createdAt: '2026-11-19T10:00:00.000Z',
    updatedAt: '2026-11-19T10:00:00.000Z',
    coverImage: '',
    mediaFiles: [],
    tags: ['赛博朋克', '雨夜', '电影光效'],
    parameters: {
      aspectRatio: '16:9',
      stylize: '250',
      negativePrompt: 'blurry, low quality, deformed, unrealistic proportions',
    },
    promptEn:
      'Cinematic wide angle shot, a futuristic cyberpunk alleyway drenched in neon reflections after a torrential rain, glowing holographic advertisements, dense atmospheric mist, steam rising from sewage grates, wet asphalt road, hyper-detailed textures, Octane Render, 8k resolution, photorealistic cinematic lighting --ar 16:9 --v 6.1 --style raw',
    promptZh:
      '电影感广角镜头，倾盆大雨后浸润在霓虹倒影中的未来赛博朋克小巷，发光的全息广告牌，浓密的环境雾气，格栅上升腾的蒸汽，湿漉漉的柏油路面，超高细节质感，Octane 渲染，8k 分辨率，逼真电影级光效。',
    notes: '推荐使用 Midjourney v6.1 输出，光线层次感拉满；如果使用 FLUX 模型，可将 stylize 改为默认。',
    folderPath: '场景风光',
    filePath: '场景风光/赛博朋克雨夜霓虹街道.md',
  },
  {
    id: 'prompt-sample-002',
    title: '未来机甲少女肖像',
    category: '图改图',
    models: ['SDXL 1.0', 'Qwen-Image'],
    createdAt: '2026-11-19T11:00:00.000Z',
    updatedAt: '2026-11-19T11:00:00.000Z',
    coverImage: '',
    mediaFiles: [],
    tags: ['机甲', '角色肖像', '科幻'],
    parameters: {
      aspectRatio: '3:4',
      stylize: '180',
      negativePrompt: 'bad eyes, extra limbs, poorly drawn hands',
    },
    promptEn:
      'Close-up portrait of a futuristic cyborg girl with iridescent titanium cheek implants, glowing cyan fiber-optic braided hair, porcelain skin, wearing a high-collar carbon-fiber exo-suit, soft studio rim lighting, shallow depth of field, sharp focus on expressive hazel eyes, shot on 85mm lens, f/1.4, cinematic film grain',
    promptZh:
      '特写肖像，一位未来半机械少女，面颊带有虹彩钛合金植入体，发光的青色光纤编发，陶瓷般细腻的肌肤，身着高领碳纤维外骨骼战衣，柔和的影棚边缘光，浅景深，焦点清晰对准深邃的淡褐色眼眸，85mm镜头拍摄，f/1.4光圈，电影级胶片微颗粒。',
    notes: '适用于垫图进行局部微调重绘，保持脸部特征一致性。',
    folderPath: '角色设计',
    filePath: '角色设计/未来机甲少女肖像.md',
  },
  {
    id: 'prompt-sample-003',
    title: '黑曜石飞鸟展翅穿越星云',
    category: '图生视频',
    models: ['Runway Gen-3', 'Kling AI', 'Google Omni'],
    createdAt: '2026-11-19T12:00:00.000Z',
    updatedAt: '2026-11-19T12:00:00.000Z',
    coverImage: '',
    mediaFiles: [],
    tags: ['宇宙', '超现实', '慢动作'],
    parameters: {
      aspectRatio: '16:9',
      cameraMotion: 'Drone fly-through, slow orbit',
      fps: '24',
    },
    promptEn:
      'Cinematic motion, the majestic obsidian phoenix spreads crystalline wings, gliding smoothly through a cosmic nebula of swirling violet and gold stardust. Slow motion 60fps, dynamic camera dolly forward following behind the bird, luminous particles dispersing with wing flaps, epic space fantasy visual effects',
    promptZh:
      '电影感动态运镜，威严的黑曜石凤凰展开水晶羽翼，平稳滑翔穿梭于紫金色星尘旋转的宇宙星云之中。60帧升格慢动作，摄像机向前推轨跟随在飞鸟后方，振翅时发光粒子如微光飞散，史诗级太空奇幻视觉特效。',
    notes: '使用首帧垫图上传后输入本提示词，运动速度设为 4~5 最佳。',
    folderPath: '动态视频',
    filePath: '动态视频/黑曜石飞鸟展翅穿越星云.md',
  },
  {
    id: 'prompt-sample-004',
    title: '深海发光水母巨浪运镜',
    category: '文生视频',
    models: ['Sora', 'Minimax-H3'],
    createdAt: '2026-11-19T13:00:00.000Z',
    updatedAt: '2026-11-19T13:00:00.000Z',
    coverImage: '',
    mediaFiles: [],
    tags: ['深海', '生物发光', '运镜'],
    parameters: {
      aspectRatio: '16:9',
      cameraMotion: 'Underwater upward tilt and slow pan',
      fps: '30',
    },
    promptEn:
      'Underwater 4k cinema shot, massive translucent bioluminescent jellyfish pulsating gently in deep abyss ocean, glowing electric blue and violet tentacles drifting, tiny plankton floating like stars, camera slowly tilts up revealing sunlight rays penetrating from ocean surface, ultra-realistic water refraction and caustic light patterns',
    promptZh:
      '水下4k电影镜头，深邃幽暗的大洋中，巨大的半透明生物发光水母轻缓搏动起伏，闪烁着电光蓝与紫色的柔长触须随水波飘荡，微小浮游生物宛如繁星悬浮，镜头徐徐向上仰拍，展现从海面透射而下的神圣丁达尔光束，超逼真水体折射与焦散光斑。',
    notes: '适合文生视频直出，运镜词可搭配 "smooth upward tilt" 强化垂直视觉冲击力。',
    folderPath: '动态视频',
    filePath: '动态视频/深海发光水母巨浪运镜.md',
  },
];

async function ensureSeeded(): Promise<void> {
  const { kv } = getCloudflareBindings();
  const seeded = await kv.get(SEEDED_META_KEY);
  if (seeded) return;

  const existing = await kv.list({ prefix: PROMPT_KEY_PREFIX });
  if (existing.keys.length === 0) {
    const folderSet = new Set<string>();
    for (const item of SAMPLE_PROMPTS) {
      const md = serializePromptToMarkdown(item);
      await kv.put(`${PROMPT_KEY_PREFIX}${item.filePath}`, md);
      if (item.folderPath) folderSet.add(item.folderPath);
    }
    await kv.put(FOLDERS_META_KEY, JSON.stringify(Array.from(folderSet)));
  }
  await kv.put(SEEDED_META_KEY, '1');
}

async function getStoredFolders(): Promise<string[]> {
  const { kv } = getCloudflareBindings();
  const raw = await kv.get(FOLDERS_META_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function getAllPrompts(): Promise<PromptItem[]> {
  await ensureSeeded();
  const { kv } = getCloudflareBindings();
  const results: PromptItem[] = [];

  let cursor: string | undefined = undefined;
  do {
    const listed = await kv.list({ prefix: PROMPT_KEY_PREFIX, cursor });
    const entries = await Promise.all(
      listed.keys.map(async (k) => {
        const raw = await kv.get(k.name);
        if (!raw) return null;
        const relPath = k.name.slice(PROMPT_KEY_PREFIX.length);
        try {
          return parseMarkdownToPrompt(raw, relPath);
        } catch (e) {
          console.error(`Error parsing prompt ${relPath}:`, e);
          return null;
        }
      })
    );
    for (const item of entries) {
      if (item) results.push(item);
    }
    cursor = listed.list_complete ? undefined : listed.cursor;
  } while (cursor);

  results.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  );

  return results;
}

export async function savePromptFile(
  item: PromptItem,
  oldRelativePath?: string
): Promise<PromptItem> {
  await ensureSeeded();
  const { kv } = getCloudflareBindings();

  const safeTitle =
    item.title.replace(/[/\\?%*:|"<>]/g, '_').trim() || '未命名提示词';
  const cleanFolder = (item.folderPath || '').replace(/^\/+|\/+$/g, '');
  const targetRelativePath = cleanFolder
    ? `${cleanFolder}/${safeTitle}.md`
    : `${safeTitle}.md`;

  if (oldRelativePath && oldRelativePath !== targetRelativePath) {
    await kv.delete(`${PROMPT_KEY_PREFIX}${oldRelativePath}`);
  }

  const now = new Date().toISOString();
  const updatedItem: PromptItem = {
    ...item,
    folderPath: cleanFolder,
    filePath: targetRelativePath,
    createdAt: item.createdAt || now,
    updatedAt: now,
  };

  const markdown = serializePromptToMarkdown(updatedItem);
  await kv.put(`${PROMPT_KEY_PREFIX}${targetRelativePath}`, markdown);

  if (cleanFolder) {
    await createFolderDirectory(cleanFolder);
  }

  return updatedItem;
}

export async function deletePromptFile(relativeFilePath: string): Promise<boolean> {
  const { kv } = getCloudflareBindings();
  await kv.delete(`${PROMPT_KEY_PREFIX}${relativeFilePath}`);
  return true;
}

export async function createFolderDirectory(folderRelativePath: string): Promise<boolean> {
  const clean = folderRelativePath.replace(/^\/+|\/+$/g, '');
  if (!clean) return false;
  const { kv } = getCloudflareBindings();
  const existing = await getStoredFolders();
  if (!existing.includes(clean)) {
    existing.push(clean);
    await kv.put(FOLDERS_META_KEY, JSON.stringify(existing));
    return true;
  }
  return false;
}

export async function getFolderHierarchy(prompts?: PromptItem[]): Promise<FolderNode> {
  const allPrompts = prompts ?? (await getAllPrompts());
  const storedFolders = await getStoredFolders();

  const folderSet = new Set<string>(storedFolders);
  for (const p of allPrompts) {
    if (p.folderPath) {
      const parts = p.folderPath.split('/').filter(Boolean);
      let acc = '';
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part;
        folderSet.add(acc);
      }
    }
  }

  const root: FolderNode = {
    name: '所有提示词',
    path: '',
    children: [],
    itemCount: allPrompts.length,
  };

  const nodeMap = new Map<string, FolderNode>();
  nodeMap.set('', root);

  const sortedFolders = Array.from(folderSet).sort((a, b) => a.localeCompare(b, 'zh-CN'));

  for (const folderPath of sortedFolders) {
    const parts = folderPath.split('/').filter(Boolean);
    let currentPath = '';
    for (const part of parts) {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!nodeMap.has(currentPath)) {
        const count = allPrompts.filter(
          (p) => p.folderPath === currentPath || p.folderPath.startsWith(`${currentPath}/`)
        ).length;
        const node: FolderNode = {
          name: part,
          path: currentPath,
          children: [],
          itemCount: count,
        };
        nodeMap.set(currentPath, node);
        const parent = nodeMap.get(parentPath);
        if (parent) parent.children.push(node);
      }
    }
  }

  return root;
}

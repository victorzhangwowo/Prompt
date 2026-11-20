'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  PromptItem,
  PromptCategory,
  PromptParameters,
} from '@/types/prompt';
import { formatDate, isMainlyChinese } from '@/lib/utils';
import {
  Save,
  Trash2,
  Copy,
  Check,
  Sparkles,
  ArrowRightLeft,
  Upload,
  Image as ImageIcon,
  Film,
  Video,
  Paintbrush,
  Calendar,
  Layers,
  Sliders,
  Maximize2,
  FileText,
  Clock,
  Loader2,
  Plus,
  X,
  Code,
} from 'lucide-react';

interface PromptEditorProps {
  prompt: PromptItem | null;
  onSave: (updated: PromptItem) => Promise<void>;
  onDelete: (filePath: string) => Promise<void>;
  apiKey: string;
  selectedModel?: string;
  onOpenSettings: () => void;
  onOpenMediaPreview: (url: string, type: 'image' | 'video', title?: string) => void;
  onOpenTemplateModal: (promptText: string) => void;
  allFolderPaths: string[];
}

const CATEGORIES: PromptCategory[] = ['文生图', '图改图', '图生视频', '文生视频'];

const POPULAR_MODELS = [
  'Minimax-H3',
  'Qwen-Image',
  'Google Omni',
  'Nano Banana',
  'Midjourney v6.1',
  'FLUX.1-dev',
  'FLUX.1-schnell',
  'SDXL 1.0',
  'Runway Gen-3',
  'Kling AI',
  'Sora',
  'Luma Dream Machine',
  'Hailuo AI (MiniMax)',
];

const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];

export function PromptEditor({
  prompt,
  onSave,
  onDelete,
  apiKey,
  selectedModel,
  onOpenSettings,
  onOpenMediaPreview,
  onOpenTemplateModal,
  allFolderPaths,
}: PromptEditorProps) {
  const [formData, setFormData] = useState<PromptItem | null>(prompt);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newModelInput, setNewModelInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<'bilingual' | 'markdown'>('bilingual');
  const [uploadingCover, setUploadingCover] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(prompt);
  }, [prompt]);

  if (!formData) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-900/40">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-center mb-3 text-slate-400">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-300">请选择或新建一个提示词</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          点击左侧列表的提示词条目查看详情，或使用【新建提示词】和【AI 逆向反推】创建新条目。
        </p>
      </div>
    );
  }

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Build full prompt with parameters (e.g. for Midjourney)
  const getFullParamPrompt = () => {
    let p = formData.promptEn || formData.promptZh || '';
    const params = formData.parameters || {};
    if (params.aspectRatio) p += ` --ar ${params.aspectRatio}`;
    if (params.stylize) p += ` --stylize ${params.stylize}`;
    if (params.version) p += ` --v ${params.version}`;
    if (params.negativePrompt) p += ` --no ${params.negativePrompt}`;
    return p.trim();
  };

  // Intelligent translation: detects whether the text is mostly Chinese or English
  const handleSmartTranslate = async () => {
    if (!apiKey) {
      alert('请先在右上角【API 设置】中配置 Google Gemini API Key');
      onOpenSettings();
      return;
    }

    const enText = formData.promptEn?.trim();
    const zhText = formData.promptZh?.trim();

    if (!enText && !zhText) {
      alert('请先在英文或中文框中输入提示词');
      return;
    }

    setIsTranslating(true);
    try {
      // If English exists and Chinese is empty (or English was modified), translate to Chinese
      if (enText && (!zhText || !isMainlyChinese(enText))) {
        const res = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: enText, targetLang: 'zh', apiKey, selectedModel }),
        });
        const data = await res.json();
        if (data.success) {
          setFormData({ ...formData, promptZh: data.translation });
        } else {
          alert(`翻译失败: ${data.error}`);
        }
      } else if (zhText) {
        // Translate Chinese to English prompt
        const res = await fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: zhText, targetLang: 'en', apiKey, selectedModel }),
        });
        const data = await res.json();
        if (data.success) {
          setFormData({ ...formData, promptEn: data.translation });
        } else {
          alert(`翻译失败: ${data.error}`);
        }
      }
    } catch (err: any) {
      alert(`翻译异常: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // One-way translation from English to Chinese explicitly
  const handleTranslateToZh = async () => {
    if (!formData.promptEn?.trim()) return;
    if (!apiKey) {
      onOpenSettings();
      return;
    }
    setIsTranslating(true);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formData.promptEn, targetLang: 'zh', apiKey, selectedModel }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({ ...formData, promptZh: data.translation });
      }
    } finally {
      setIsTranslating(false);
    }
  };

  // One-way translation from Chinese to English explicitly
  const handleTranslateToEn = async () => {
    if (!formData.promptZh?.trim()) return;
    if (!apiKey) {
      onOpenSettings();
      return;
    }
    setIsTranslating(true);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formData.promptZh, targetLang: 'en', apiKey, selectedModel }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({ ...formData, promptEn: data.translation });
      }
    } finally {
      setIsTranslating(false);
    }
  };

  // AI Prompt Polish/Enhance with Gemini
  const handleEnhancePrompt = async () => {
    const raw = formData.promptEn || formData.promptZh;
    if (!raw?.trim()) {
      alert('请先输入提示词或基础构思');
      return;
    }
    if (!apiKey) {
      onOpenSettings();
      return;
    }

    setIsEnhancing(true);
    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: raw,
          category: formData.category,
          targetModel: formData.models[0] || 'Midjourney v6.1',
          apiKey,
          selectedModel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          ...formData,
          promptEn: data.enhancedEn || formData.promptEn,
          promptZh: data.enhancedZh || formData.promptZh,
          tags: Array.from(new Set([...(formData.tags || []), ...(data.suggestedTags || [])])),
        });
      } else {
        alert(data.error || 'AI 扩写失败');
      }
    } catch (e: any) {
      alert(`AI 扩写异常: ${e.message}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  // AI Auto Generate Tags based on prompt description
  const handleAutoGenerateTags = async () => {
    const promptText = formData.promptEn || formData.promptZh;
    if (!promptText?.trim()) {
      alert('请先在提示词框中输入内容（英文或中文均可）');
      return;
    }
    if (!apiKey) {
      alert('请先在右上角【API 设置】中配置 Google Gemini API Key');
      onOpenSettings();
      return;
    }

    setIsGeneratingTags(true);
    try {
      const res = await fetch('/api/ai/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          category: formData.category,
          apiKey,
          selectedModel,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.tags) && data.tags.length > 0) {
        const combined = Array.from(new Set([...(formData.tags || []), ...data.tags]));
        setFormData({ ...formData, tags: combined });
      } else {
        alert(data.error || '未能生成有效标签，请稍后重试');
      }
    } catch (err: any) {
      alert(`生成标签异常: ${err.message}`);
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // Handle Cover Upload
  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('isCover', 'true');

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          ...formData,
          coverImage: data.mediaPath,
          mediaFiles: Array.from(new Set([...(formData.mediaFiles || []), data.mediaPath])),
        });
      } else {
        alert(`上传封面失败: ${data.error}`);
      }
    } catch (e: any) {
      alert(`上传异常: ${e.message}`);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const addModel = (modelName: string) => {
    const clean = modelName.trim();
    if (clean && !formData.models.includes(clean)) {
      setFormData({ ...formData, models: [...formData.models, clean] });
    }
    setNewModelInput('');
  };

  const removeModel = (modelName: string) => {
    setFormData({ ...formData, models: formData.models.filter((m) => m !== modelName) });
  };

  const addTag = (tag: string) => {
    const clean = tag.trim().replace(/^#/, '');
    if (clean && !formData.tags.includes(clean)) {
      setFormData({ ...formData, tags: [...formData.tags, clean] });
    }
    setNewTagInput('');
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const updateParameter = (key: keyof PromptParameters, val: any) => {
    setFormData({
      ...formData,
      parameters: {
        ...formData.parameters,
        [key]: val,
      },
    });
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-900 overflow-hidden">
      {/* Top Action Toolbar */}
      <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {/* Category Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {CATEGORIES.map((cat) => {
              const isSelected = formData.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Folder Selector */}
          <select
            value={formData.folderPath}
            onChange={(e) => setFormData({ ...formData, folderPath: e.target.value })}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">根目录 (Assets/prompts)</option>
            {allFolderPaths.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Smart Copy Buttons */}
          <button
            type="button"
            onClick={() => handleCopy(formData.promptEn, 'en')}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
          >
            {copiedKey === 'en' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'en' ? '已复制英文' : '复制英文'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy(getFullParamPrompt(), 'param')}
            title="复制包含 --ar 等参数的完整提示词"
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
          >
            {copiedKey === 'param' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sliders className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'param' ? '已复制带参词' : '复制带参词'}</span>
          </button>

          {/* AI Enhance */}
          <button
            type="button"
            onClick={handleEnhancePrompt}
            disabled={isEnhancing}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-medium text-white transition shadow-sm disabled:opacity-50"
          >
            {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isEnhancing ? '扩写中...' : 'AI 扩写润色'}</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex items-center gap-1.5 py-1.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition shadow-md shadow-indigo-600/30 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? '保存中...' : '保存修改'}</span>
          </button>
        </div>
      </div>

      {/* Main Body (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Title & Metadata Strip */}
        <div className="space-y-3">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="提示词标题（如：赛博朋克雨夜街道）"
            className="w-full text-xl font-bold bg-transparent text-white placeholder-slate-600 focus:outline-none border-b border-transparent focus:border-indigo-500 pb-1 transition"
          />

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>创建：{formatDate(formData.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>更新：{formatDate(formData.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-slate-500">
              <span>文件：Assets/prompts/{formData.filePath || `${formData.title}.md`}</span>
            </div>
          </div>
        </div>

        {/* Models & Tags bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Models */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-400 uppercase tracking-wider">
                适用模型 (Models)
              </span>
              <span className="text-[11px] text-slate-500">已选 {formData.models.length} 项</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {formData.models.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-mono text-xs"
                >
                  <span>{m}</span>
                  <button
                    type="button"
                    onClick={() => removeModel(m)}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={newModelInput}
                onChange={(e) => setNewModelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addModel(newModelInput);
                  }
                }}
                placeholder="+ 添加模型按回车"
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Quick preset suggestions */}
            <div className="flex flex-wrap gap-1 pt-1">
              {POPULAR_MODELS.filter((m) => !formData.models.includes(m)).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => addModel(m)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition"
                >
                  +{m}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-400 uppercase tracking-wider">
                分类标签 (Tags)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoGenerateTags}
                  disabled={isGeneratingTags || (!formData.promptEn?.trim() && !formData.promptZh?.trim())}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg bg-purple-950/70 hover:bg-purple-900/90 text-purple-300 border border-purple-800/50 transition flex items-center gap-1 disabled:opacity-40 shadow-sm"
                  title="根据提示词描述，通过 AI 智能提取并打分类标签"
                >
                  {isGeneratingTags ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-purple-400" />
                  )}
                  <span>AI 自动打标签</span>
                </button>
                <span className="text-[11px] text-slate-500">{formData.tags?.length || 0} 个标签</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {formData.tags?.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/50 text-purple-300 border border-purple-800/30 text-xs"
                >
                  <span>#{t}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(newTagInput);
                  }
                }}
                placeholder="+ 添加标签按回车"
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Cover Image & Attached Media Strip */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>封面与关联媒体素材 (Assets/media)</span>
            </span>

            <div className="flex items-center gap-2">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5"
              >
                {uploadingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                <span>上传媒体/封面</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Cover display */}
            {formData.coverImage ? (
              <div className="relative group w-32 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shrink-0">
                <img
                  src={`/api/${formData.coverImage}`}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenMediaPreview(`/api/${formData.coverImage}`, 'image', formData.title)}
                    className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg transition"
                    title="全屏放大查看"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, coverImage: '' })}
                    className="p-1.5 bg-rose-900/80 hover:bg-rose-800 text-white rounded-lg transition"
                    title="移除封面"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => coverInputRef.current?.click()}
                className="w-32 h-20 rounded-xl border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 cursor-pointer transition shrink-0"
              >
                <ImageIcon className="w-5 h-5 mb-1" />
                <span className="text-[10px]">点击上传封面</span>
              </div>
            )}

            <div className="text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">
                {formData.coverImage ? formData.coverImage : '未设置封面图片'}
              </p>
              <p className="text-[11px] text-slate-500">
                所有上传的文件均完整保存在当前工作区的 <code className="text-indigo-400 font-mono">MyPrompt/Assets/media</code> 目录下。
              </p>
            </div>
          </div>
        </div>

        {/* Bilingual Dual Editor Workspace */}
        <div className="space-y-2">
          {/* Editor Header Bar with Translation controls */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                双语提示词互通工作台 (Bilingual Prompt)
              </span>
              <button
                type="button"
                onClick={() => onOpenTemplateModal(formData.promptEn || formData.promptZh)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 hover:bg-slate-700 transition flex items-center gap-1"
                title="占位符变量替换工具"
              >
                <Sliders className="w-3 h-3" />
                <span>变量模板</span>
              </button>
            </div>

            {/* Smart Auto Translate Action */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTranslateToEn}
                disabled={isTranslating || !formData.promptZh?.trim()}
                title="将中文翻译为最适合 AI 绘图的英文 Prompt"
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-40 flex items-center gap-1"
              >
                {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>中 ➔ 英 翻译</span>}
              </button>

              <button
                type="button"
                onClick={handleTranslateToZh}
                disabled={isTranslating || !formData.promptEn?.trim()}
                title="将英文提示词翻译为优美通顺的中文释义"
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-40 flex items-center gap-1"
              >
                {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>英 ➔ 中 翻译</span>}
              </button>

              <button
                type="button"
                onClick={handleSmartTranslate}
                disabled={isTranslating}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-indigo-600/90 hover:bg-indigo-600 text-white transition flex items-center gap-1.5 shadow-sm"
              >
                {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                <span>智能双向互译</span>
              </button>
            </div>
          </div>

          {/* Dual Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* English Prompt Column */}
            <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950 overflow-hidden focus-within:border-indigo-500 transition">
              <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-400 font-mono">英文提示词 (Prompt)</span>
                <button
                  type="button"
                  onClick={() => handleCopy(formData.promptEn, 'en')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  {copiedKey === 'en' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'en' ? '已复制' : '复制'}</span>
                </button>
              </div>
              <textarea
                rows={7}
                value={formData.promptEn}
                onChange={(e) => setFormData({ ...formData, promptEn: e.target.value })}
                placeholder="Cinematic shot, futuristic cyberpunk alley, volumetric lighting, photorealistic, 8k..."
                className="w-full p-3.5 bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none font-mono text-xs leading-relaxed resize-none"
              />
            </div>

            {/* Chinese Prompt Column */}
            <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950 overflow-hidden focus-within:border-purple-500 transition">
              <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-400">中文释义 (Chinese Translation)</span>
                <button
                  type="button"
                  onClick={() => handleCopy(formData.promptZh, 'zh')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  {copiedKey === 'zh' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'zh' ? '已复制' : '复制'}</span>
                </button>
              </div>
              <textarea
                rows={7}
                value={formData.promptZh}
                onChange={(e) => setFormData({ ...formData, promptZh: e.target.value })}
                placeholder="电影感镜头，未来赛博朋克小巷，体积光，超逼真，8k细节..."
                className="w-full p-3.5 bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none text-xs leading-relaxed resize-none"
              />
            </div>
          </div>
        </div>

        {/* Parameters Section (Aspect ratio, negative prompt, camera motion) */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>生成参数预设 (Parameters)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium">画面比例 (--ar)</label>
              <div className="flex flex-wrap gap-1.5">
                {ASPECT_RATIOS.map((ar) => {
                  const isSelected = formData.parameters?.aspectRatio === ar;
                  return (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => updateParameter('aspectRatio', isSelected ? '' : ar)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {ar}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stylize / Version */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium">风格化强度 (--stylize)</label>
              <input
                type="text"
                value={formData.parameters?.stylize || ''}
                onChange={(e) => updateParameter('stylize', e.target.value)}
                placeholder="例如：250"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Video Camera Motion / FPS */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium">运镜方式 (Camera Motion)</label>
              <input
                type="text"
                value={formData.parameters?.cameraMotion || ''}
                onChange={(e) => updateParameter('cameraMotion', e.target.value)}
                placeholder="例如：Slow zoom in, pan right"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Negative Prompt */}
          <div className="space-y-1.5 text-xs">
            <label className="text-slate-400 font-medium">负向提示词 (Negative Prompt / --no)</label>
            <input
              type="text"
              value={formData.parameters?.negativePrompt || ''}
              onChange={(e) => updateParameter('negativePrompt', e.target.value)}
              placeholder="low quality, deformed, extra fingers, text, watermark..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Notes & Usage Tips */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-400 uppercase tracking-wider">
              使用心得与备注 (Notes / Markdown)
            </span>
          </div>
          <textarea
            rows={4}
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="记录推荐权重、LoRA 搭配、垫图技巧或种子信息..."
            className="w-full p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  Sparkles,
  FileVideo,
  FileImage,
  Loader2,
  Check,
  Copy,
  PlusCircle,
  Eye,
  Sliders,
  Film,
  Camera,
  Layers,
  Palette,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { PromptItem, PromptCategory, AvailableGeminiModel } from '@/types/prompt';
import { ReversePromptResult } from '@/lib/gemini';
import { generatePromptId } from '@/lib/utils';

interface ReversePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  globalModel?: string;
  reverseModel: string;
  availableModels?: AvailableGeminiModel[];
  onOpenSettings: () => void;
  onPromptCreated: (newPrompt: PromptItem) => void;
  onReverseModelChange: (model: string) => void;
  onRefreshModels?: () => Promise<void>;
}

const PRESET_MODELS = [
  { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro (高阶深度反推推荐)' },
  { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (高速均衡)' },
  { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
];

export function ReversePromptModal({
  isOpen,
  onClose,
  apiKey,
  globalModel,
  reverseModel,
  availableModels,
  onOpenSettings,
  onPromptCreated,
  onReverseModelChange,
  onRefreshModels,
}: ReversePromptModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReversePromptResult | null>(null);
  const [savedMediaPath, setSavedMediaPath] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Independent model selection for reverse prompting (separate from Global API settings)
  const [currentModel, setCurrentModel] = useState<string>(reverseModel || 'gemini-2.5-pro');

  useEffect(() => {
    if (reverseModel) {
      setCurrentModel(reverseModel);
    }
  }, [reverseModel, isOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const baseOptions = availableModels && availableModels.length > 0
    ? availableModels.map((m) => ({ id: m.id, displayName: `${m.displayName} (${m.id})` }))
    : PRESET_MODELS;

  const modelOptions = baseOptions.some((m) => m.id === currentModel)
    ? baseOptions
    : [{ id: currentModel, displayName: currentModel }, ...baseOptions];

  const isIndependentFromGlobal = Boolean(globalModel && currentModel !== globalModel);

  const handleRefreshModels = async () => {
    if (!onRefreshModels || !apiKey) return;
    setRefreshingModels(true);
    try {
      await onRefreshModels();
    } finally {
      setRefreshingModels(false);
    }
  };

  const handleSelectFile = (selectedFile: File) => {
    setError(null);
    setResult(null);
    setSavedMediaPath(null);

    const isVid = selectedFile.type.startsWith('video/');
    const isImg = selectedFile.type.startsWith('image/');

    if (!isVid && !isImg) {
      setError('请上传图片 (JPG, PNG, WEBP) 或视频文件 (MP4, MOV, WEBM)');
      return;
    }

    setFile(selectedFile);
    setIsVideo(isVid);
    setFilePreview(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleRunReverse = async () => {
    if (!file) return;
    if (!apiKey) {
      setError('请先在页面右上角设置中配置 Google AI API Key');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('apiKey', apiKey);
      formData.append('selectedModel', currentModel);

      const res = await fetch('/api/ai/reverse', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '反向推导失败');
      }

      setResult(data.data);
      setSavedMediaPath(data.mediaPath);
    } catch (err: any) {
      setError(err.message || '反推过程发生异常');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreatePromptFromReverse = async () => {
    if (!result) return;

    const newPrompt: PromptItem = {
      id: generatePromptId(),
      title: result.title || (isVideo ? '视频反推提示词' : '图像反推提示词'),
      category: (result.category as PromptCategory) || (isVideo ? '文生视频' : '文生图'),
      models: result.recommendedModels && result.recommendedModels.length > 0
        ? result.recommendedModels
        : (isVideo ? ['Runway Gen-3', 'Kling'] : ['Midjourney v6.1', 'FLUX.1-dev']),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      coverImage: savedMediaPath || '',
      mediaFiles: savedMediaPath ? [savedMediaPath] : [],
      tags: result.tags || [],
      parameters: {
        aspectRatio: result.suggestedParameters?.aspectRatio || '16:9',
        stylize: result.suggestedParameters?.stylize || '',
        cameraMotion: result.suggestedParameters?.cameraMotion || '',
      },
      promptEn: result.promptEn || '',
      promptZh: result.promptZh || '',
      notes: `## 视觉反推解构细节\n- **使用模型**：${currentModel}\n- **主体特征**：${result.visualBreakdown?.subject || '无'}\n- **艺术风格**：${result.visualBreakdown?.styleAndMedium || '无'}\n- **光影色彩**：${result.visualBreakdown?.lightingAndColor || '无'}\n- **构图机位**：${result.visualBreakdown?.compositionAndCamera || '无'}`,
      folderPath: '',
      filePath: '',
    };

    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: newPrompt }),
      });
      const data = await res.json();
      if (data.success) {
        onPromptCreated(data.prompt);
        onClose();
      } else {
        setError(data.error || '保存提示词失败');
      }
    } catch (err: any) {
      setError(err.message || '保存过程出错');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0 gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white truncate">
                Google AI 多模态反向推导工作台
              </h2>
              <p className="text-xs text-slate-400 truncate">
                拖拽照片或视频，直接逆向解构艺术风格、主体光影与中英生成提示词
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dedicated Independent Model Selection Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="font-semibold text-slate-200">反推专用模型</span>
            {isIndependentFromGlobal ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                独立配置（全局：{globalModel}）
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                可独立于全局设置自由切换
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <select
              value={currentModel}
              onChange={(e) => {
                setCurrentModel(e.target.value);
                onReverseModelChange(e.target.value);
              }}
              className="flex-1 sm:w-72 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500/60 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 cursor-pointer transition"
            >
              {modelOptions.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                  {m.displayName}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                if (!apiKey) {
                  setError('请先在【API 设置】中配置 Google Gemini API Key（更换到 5059 端口后需重新输入一次 Key）');
                  return;
                }
                handleRefreshModels();
              }}
              disabled={refreshingModels}
              title="连接 Google API 拉取当前 Key 下最新可用的高阶模型清单"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${refreshingModels ? 'animate-spin' : ''}`} />
              <span>{refreshingModels ? '刷新中...' : '刷新实时模型'}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!file ? (
            /* Upload Drop Area */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/50 hover:bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleSelectFile(e.target.files[0])}
              />
              <div className="p-4 rounded-2xl bg-indigo-600/10 text-indigo-400 mb-3">
                <UploadCloud className="w-10 h-10" />
              </div>
              <p className="text-sm font-medium text-slate-200">
                拖拽任意照片或视频至此处，或 <span className="text-indigo-400 underline">点击上传</span>
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                支持 JPG、PNG、WEBP、MP4、MOV、WEBM 等格式，自动存储于 MyPrompt/Assets/media
              </p>
            </div>
          ) : (
            /* Media preview & Action */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-5 flex flex-col items-center space-y-3">
                <div className="w-full relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center group">
                  {isVideo ? (
                    <video
                      src={filePreview || ''}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={filePreview || ''}
                      alt="Uploaded media"
                      className="w-full h-full object-contain"
                    />
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] text-slate-300 font-medium flex items-center gap-1">
                    {isVideo ? <Film className="w-3 h-3 text-emerald-400" /> : <Camera className="w-3 h-3 text-indigo-400" />}
                    <span>{isVideo ? '视频素材' : '图片素材'}</span>
                  </div>
                </div>

                <div className="w-full flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>

                <div className="w-full flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setFilePreview(null);
                      setResult(null);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-300 transition"
                  >
                    重新选图/视频
                  </button>
                  <button
                    type="button"
                    onClick={handleRunReverse}
                    disabled={analyzing}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI 深度反推中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>开始反向推导</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right results pane */}
              <div className="md:col-span-7 space-y-4">
                {analyzing && (
                  <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        正在使用 <span className="text-indigo-400 font-mono font-semibold">{currentModel}</span> 分析视觉元素...
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        正在解构主体、光影结构、镜头语言与艺术风格并转写高精度提示词
                      </p>
                    </div>
                  </div>
                )}

                {!analyzing && !result && (
                  <div className="p-8 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-slate-400 text-xs leading-relaxed space-y-2">
                    <Sparkles className="w-6 h-6 text-indigo-400 mx-auto opacity-60" />
                    <p className="font-medium text-slate-300 text-sm">准备就绪</p>
                    <p>
                      当前所用模型：<code className="text-indigo-400 font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">{currentModel}</code>
                    </p>
                    <p>
                      点击左侧【开始反向推导】，Google Gemini 将为您反解出该素材的完整艺术构图与可直接在 Midjourney / FLUX / Runway 中复现的高级 Prompt。
                    </p>
                  </div>
                )}

                {result && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Header info card */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{result.title}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                          {result.category}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {result.recommendedModels?.map((m) => (
                          <span
                            key={m}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                          >
                            {m}
                          </span>
                        ))}
                        {result.tags?.map((t) => (
                          <span
                            key={t}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-purple-950/40 text-purple-300 border border-purple-800/30"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Breakdown grids */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                        <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span>主体特征</span>
                        </span>
                        <p className="text-slate-300 line-clamp-3">{result.visualBreakdown?.subject}</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                        <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                          <Palette className="w-3.5 h-3.5 text-pink-400" />
                          <span>风格与媒介</span>
                        </span>
                        <p className="text-slate-300 line-clamp-3">{result.visualBreakdown?.styleAndMedium}</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                        <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>光影色彩</span>
                        </span>
                        <p className="text-slate-300 line-clamp-3">{result.visualBreakdown?.lightingAndColor}</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                        <span className="text-slate-400 font-medium flex items-center gap-1 mb-1">
                          <Camera className="w-3.5 h-3.5 text-emerald-400" />
                          <span>构图与镜头</span>
                        </span>
                        <p className="text-slate-300 line-clamp-3">{result.visualBreakdown?.compositionAndCamera}</p>
                      </div>
                    </div>

                    {/* English Prompt */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-indigo-400">反推英文提示词 (English Prompt)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(result.promptEn, 'en')}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
                        >
                          {copiedKey === 'en' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'en' ? '已复制' : '复制英文'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-mono select-text bg-slate-900/50 p-2 rounded-lg max-h-24 overflow-y-auto">
                        {result.promptEn}
                      </p>
                    </div>

                    {/* Chinese Prompt */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-purple-400">中文释义 (Chinese Translation)</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(result.promptZh, 'zh')}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
                        >
                          {copiedKey === 'zh' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'zh' ? '已复制' : '复制中文'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed select-text bg-slate-900/50 p-2 rounded-lg max-h-20 overflow-y-auto">
                        {result.promptZh}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center justify-between">
              <span>{error}</span>
              {error.includes('API Key') && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-2.5 py-1 rounded-lg bg-rose-800 hover:bg-rose-700 text-white font-medium text-[11px]"
                >
                  去配置 API Key
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            取消
          </button>

          {result && (
            <button
              type="button"
              onClick={handleCreatePromptFromReverse}
              className="px-5 py-2.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>一键保存为新提示词条目</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

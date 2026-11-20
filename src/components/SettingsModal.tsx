'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Loader2,
  Cpu,
} from 'lucide-react';
import { AvailableGeminiModel } from '@/lib/gemini';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  selectedModel: string;
  onSaveSettings: (key: string, model: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  selectedModel,
  onSaveSettings,
}: SettingsModalProps) {
  const [inputKey, setInputKey] = useState(apiKey);
  const [currentModel, setCurrentModel] = useState(selectedModel || 'gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState<AvailableGeminiModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setInputKey(apiKey);
    setCurrentModel(selectedModel || 'gemini-2.5-flash');
    setTestResult(null);

    // If apiKey is already provided when opening modal, fetch latest models list
    if (apiKey && isOpen) {
      loadModels(apiKey);
    }
  }, [apiKey, selectedModel, isOpen]);

  const loadModels = async (keyToUse: string) => {
    const cleanKey = keyToUse.trim();
    if (!cleanKey) return;

    setIsLoadingModels(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
        // If currentModel is not in the list, set to first available or keep if valid
        const exists = data.models.some((m: AvailableGeminiModel) => m.id === currentModel);
        if (!exists) {
          // Default to gemini-2.5-flash if available, or first model
          const flash25 = data.models.find((m: AvailableGeminiModel) => m.id.includes('2.5-flash'));
          setCurrentModel(flash25 ? flash25.id : data.models[0].id);
        }
      } else {
        setTestResult({
          success: false,
          message: data.error || '获取模型列表失败，请检查 API Key 是否有效。',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || '获取模型列表网络请求异常',
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleFetchModelsClick = () => {
    if (!inputKey.trim()) {
      setTestResult({ success: false, message: '请先输入 Google Gemini API Key' });
      return;
    }
    loadModels(inputKey);
  };

  const handleTest = async () => {
    if (!inputKey.trim()) {
      setTestResult({ success: false, message: '请先输入 API Key' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello world',
          targetLang: 'zh',
          apiKey: inputKey.trim(),
          selectedModel: currentModel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `连接成功！当前模型 [${currentModel}] 响应正常。`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || '测试失败，请检查 API Key 及所选模型权限。',
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || '网络请求失败' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveSettings(inputKey.trim(), currentModel);
    onClose();
  };

  if (!isOpen) return null;

  const selectedModelObj = availableModels.find((m) => m.id === currentModel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Google AI API 与模型设置</h2>
              <p className="text-xs text-slate-400">配置 API Key 并在线获取实时可用的 Gemini 模型</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Google Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                获取免费 API Key &rarr;
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleFetchModelsClick}
                disabled={isLoadingModels || !inputKey.trim()}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                title="连接 Google API 获取该 Key 账号下当前所有可用模型"
              >
                {isLoadingModels ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>获取实时模型</span>
              </button>
            </div>
          </div>

          {/* Model Selection Dropdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>实时可用模型清单 (Available Models)</span>
              </label>
              {availableModels.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  已获取 {availableModels.length} 个可用模型
                </span>
              )}
            </div>

            {availableModels.length > 0 ? (
              <select
                value={currentModel}
                onChange={(e) => setCurrentModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-900 py-1">
                    {m.displayName} ({m.id})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">默认模型：gemini-2.5-flash</span>
                  <span className="text-[10px] text-slate-500">点击上方【获取实时模型】刷新清单</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  输入有效的 API Key 后点击“获取实时模型”，即可自动加载您账号下包括 Gemini 2.5、2.0、1.5 等最新模型的完整实时下拉列表。
                </p>
              </div>
            )}

            {/* Model Description info */}
            {selectedModelObj && selectedModelObj.description && (
              <p className="text-[11px] text-slate-400 px-1 leading-relaxed">
                {selectedModelObj.description}
              </p>
            )}
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                testResult.success
                  ? 'bg-emerald-950/50 border border-emerald-800/50 text-emerald-300'
                  : 'bg-rose-950/50 border border-rose-800/50 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !inputKey.trim()}
            className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-700 hover:bg-slate-800 text-slate-300 transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>正在测试...</span>
              </>
            ) : (
              <span>测试当前模型连接</span>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30 font-medium"
            >
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

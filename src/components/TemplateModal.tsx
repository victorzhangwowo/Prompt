'use client';

import React, { useState, useEffect } from 'react';
import { X, Sliders, Copy, Check, Sparkles } from 'lucide-react';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  onApplyPrompt?: (newPrompt: string) => void;
}

export function TemplateModal({
  isOpen,
  onClose,
  promptText,
  onApplyPrompt,
}: TemplateModalProps) {
  const [variables, setVariables] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!promptText) return;
    // Extract placeholders matching {variable} or {{variable}}
    const matches = promptText.match(/\{([^{}]+)\}/g) || [];
    const uniqueVars = Array.from(new Set(matches.map((m) => m.slice(1, -1).trim())));
    setVariables(uniqueVars);
    const initialVals: Record<string, string> = {};
    uniqueVars.forEach((v) => {
      initialVals[v] = '';
    });
    setValues(initialVals);
  }, [promptText, isOpen]);

  if (!isOpen) return null;

  const getComputedPrompt = () => {
    let result = promptText;
    variables.forEach((v) => {
      const val = values[v]?.trim() || `{${v}}`;
      result = result.replaceAll(`{${v}}`, val);
    });
    return result;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getComputedPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">提示词变量模板替换</h2>
              <p className="text-xs text-slate-400">使用 {'{变量名}'} 批量填充不同主题衍生新词</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {variables.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm rounded-xl bg-slate-950 border border-slate-800">
              <p className="font-medium text-slate-300">当前提示词中暂未检测到变量占位符</p>
              <p className="text-xs mt-1 text-slate-500">
                提示：您可以在提示词中使用大括号标注变量，例如：
              </p>
              <code className="inline-block mt-2 px-3 py-1 bg-slate-900 text-indigo-300 rounded-lg text-xs font-mono">
                A photo of {'{角色}'} wearing {'{服装}'} in {'{场景}'}
              </code>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                检测到 {variables.length} 个变量参数
              </div>
              {variables.map((v) => (
                <div key={v} className="flex items-center gap-3">
                  <span className="w-28 text-right text-xs font-mono text-indigo-400 font-medium truncate">
                    {'{'}{v}{'}'}
                  </span>
                  <input
                    type="text"
                    value={values[v] || ''}
                    onChange={(e) => setValues({ ...values, [v]: e.target.value })}
                    placeholder={`请输入 ${v} 的值...`}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              实时替换生成结果预览
            </label>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap select-text">
              {getComputedPrompt()}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            关闭
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制替换结果' : '复制结果'}</span>
            </button>
            {onApplyPrompt && (
              <button
                type="button"
                onClick={() => {
                  onApplyPrompt(getComputedPrompt());
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30"
              >
                应用到当前编辑器
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { PromptItem } from '@/types/prompt';
import { formatDate } from '@/lib/utils';
import {
  Image as ImageIcon,
  Film,
  Video,
  Paintbrush,
  Clock,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface PromptListProps {
  prompts: PromptItem[];
  selectedPrompt: PromptItem | null;
  onSelectPrompt: (prompt: PromptItem) => void;
  onDeletePrompt: (filePath: string, e: React.MouseEvent) => void;
  selectedCategoryName: string;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  文生图: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: ImageIcon },
  图改图: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', icon: Paintbrush },
  图生视频: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: Film },
  文生视频: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Video },
};

export function PromptList({
  prompts,
  selectedPrompt,
  onSelectPrompt,
  onDeletePrompt,
  selectedCategoryName,
}: PromptListProps) {
  if (prompts.length === 0) {
    return (
      <div className="w-80 h-full border-r border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-500 shrink-0">
        <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-sm font-medium text-slate-400">暂无提示词</p>
        <p className="text-xs text-slate-600 mt-1">
          点击左上方【新建提示词】或【AI 逆向反推】开始创建
        </p>
      </div>
    );
  }

  return (
    <div className="w-80 h-full border-r border-slate-800 bg-slate-950 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="font-medium text-slate-300">{selectedCategoryName}</span>
        <span className="tabular-nums font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
          共 {prompts.length} 条
        </span>
      </div>

      {/* List items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
        {prompts.map((item) => {
          const isSelected = selectedPrompt?.filePath === item.filePath;
          const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES['文生图'];
          const CategoryIcon = style.icon;

          return (
            <div
              key={item.filePath || item.id}
              onClick={() => onSelectPrompt(item)}
              className={`group p-3.5 cursor-pointer transition relative ${
                isSelected
                  ? 'bg-indigo-600/15 border-l-2 border-indigo-500'
                  : 'hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail / Cover */}
                <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center relative">
                  {item.coverImage ? (
                    <img
                      src={`/api/${item.coverImage}`}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to icon on error
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <CategoryIcon className={`w-5 h-5 ${style.text} opacity-60`} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition">
                      {item.title}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => onDeletePrompt(item.filePath, e)}
                      title="删除提示词"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Category & Models */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${style.bg} ${style.text} ${style.border}`}
                    >
                      {item.category}
                    </span>
                    {item.models && item.models.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">
                        {item.models[0]}
                      </span>
                    )}
                  </div>

                  {/* Preview Snippet */}
                  <p className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                    {item.promptEn || item.promptZh || '暂无内容'}
                  </p>

                  {/* Date */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

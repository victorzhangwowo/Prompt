'use client';

import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Search,
  Sparkles,
  Settings,
  Download,
  Image as ImageIcon,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Layers,
  Film,
  Video,
  Paintbrush,
  Sparkle,
} from 'lucide-react';
import { FolderNode, PromptCategory } from '@/types/prompt';

interface SidebarProps {
  folders: FolderNode;
  selectedCategory: PromptCategory | 'all';
  onSelectCategory: (cat: PromptCategory | 'all') => void;
  selectedFolder: string;
  onSelectFolder: (folderPath: string) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewPrompt: () => void;
  onOpenReverseModal: () => void;
  onOpenSettings: () => void;
  onExportBackup: () => void;
  categoryCounts: Record<string, number>;
  allModels: string[];
  onCreateFolder: (name: string, parentPath: string) => void;
}

export function Sidebar({
  folders,
  selectedCategory,
  onSelectCategory,
  selectedFolder,
  onSelectFolder,
  selectedModel,
  onSelectModel,
  searchQuery,
  onSearchChange,
  onNewPrompt,
  onOpenReverseModal,
  onOpenSettings,
  onExportBackup,
  categoryCounts,
  allModels,
  onCreateFolder,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '': true });
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const toggleExpand = (path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), selectedFolder);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const categories: { key: PromptCategory | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'all', label: '全部提示词', icon: <Layers className="w-4 h-4" />, color: 'text-indigo-400' },
    { key: '文生图', label: '文生图', icon: <ImageIcon className="w-4 h-4" />, color: 'text-blue-400' },
    { key: '图改图', label: '图改图', icon: <Paintbrush className="w-4 h-4" />, color: 'text-pink-400' },
    { key: '图生视频', label: '图生视频', icon: <Film className="w-4 h-4" />, color: 'text-emerald-400' },
    { key: '文生视频', label: '文生视频', icon: <Video className="w-4 h-4" />, color: 'text-amber-400' },
  ];

  const renderFolderTree = (node: FolderNode, level = 0) => {
    const isExpanded = expandedFolders[node.path] ?? true;
    const isSelected = selectedFolder === node.path;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.path || 'root'} className="select-none">
        <div
          onClick={() => onSelectFolder(node.path)}
          style={{ paddingLeft: `${Math.max(level * 12 + 8, 8)}px` }}
          className={`group flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs cursor-pointer transition ${
            isSelected
              ? 'bg-indigo-600/20 text-indigo-300 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.path);
                }}
                className="p-0.5 text-slate-500 hover:text-slate-300 rounded"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}
            {isExpanded ? (
              <FolderOpen className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
            ) : (
              <Folder className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
            )}
            <span className="truncate">{node.name}</span>
          </div>
          <span className="text-[10px] text-slate-500 group-hover:text-slate-400 tabular-nums">
            {node.itemCount}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {node.children.map((child) => renderFolderTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-72 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      {/* Brand & Action Header */}
      <div className="p-4 border-b border-slate-800 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs tracking-wider">
              MP
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">MyPrompt</h1>
              <p className="text-[10px] text-slate-400">提示词资产库 & 多模态反推</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onNewPrompt}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建提示词</span>
          </button>
          <button
            type="button"
            onClick={onOpenReverseModal}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-medium transition shadow-md shadow-purple-600/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 逆向反推</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索提示词、模型、标签..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Category Filter */}
        <div className="space-y-1">
          <div className="px-2 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            核心归类
          </div>
          {categories.map((c) => {
            const isSelected = selectedCategory === c.key;
            const count = c.key === 'all'
              ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
              : (categoryCounts[c.key] || 0);

            return (
              <button
                key={c.key}
                type="button"
                onClick={() => onSelectCategory(c.key)}
                className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-medium transition ${
                  isSelected
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={c.color}>{c.icon}</span>
                  <span>{c.label}</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-800/60 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Folder Hierarchy Tree */}
        <div className="space-y-1">
          <div className="px-2 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>目录结构 (Assets)</span>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(true)}
              title="新建子目录"
              className="text-slate-400 hover:text-indigo-400 p-0.5 rounded transition"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isCreatingFolder && (
            <form onSubmit={handleCreateFolderSubmit} className="px-2 py-1">
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={() => !newFolderName.trim() && setIsCreatingFolder(false)}
                placeholder="输入目录名按回车..."
                className="w-full px-2 py-1 rounded bg-slate-950 border border-indigo-500 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </form>
          )}

          <div className="space-y-0.5">
            {folders ? renderFolderTree(folders) : null}
          </div>
        </div>

        {/* Models Filter */}
        {allModels.length > 0 && (
          <div className="space-y-1.5">
            <div className="px-2 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>模型筛选 (Models)</span>
              {selectedModel && (
                <button
                  type="button"
                  onClick={() => onSelectModel('')}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 normal-case"
                >
                  清除
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 px-1">
              {allModels.map((m) => {
                const isSelected = selectedModel === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onSelectModel(isSelected ? '' : m)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90 text-xs text-slate-400">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:text-white hover:bg-slate-800 transition"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>API 设置</span>
        </button>

        <button
          type="button"
          onClick={onExportBackup}
          title="导出 JSON 数据备份"
          className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:text-white hover:bg-slate-800 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>备份导出</span>
        </button>
      </div>
    </aside>
  );
}

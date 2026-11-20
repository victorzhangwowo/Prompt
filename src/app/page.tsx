'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Cpu, Sparkles, Loader2, Server, LogOut, User, Cloud } from 'lucide-react';
import { PromptItem, FolderNode, PromptCategory, AvailableGeminiModel } from '@/types/prompt';
import { generatePromptId } from '@/lib/utils';
import { Sidebar } from '@/components/Sidebar';
import { PromptList } from '@/components/PromptList';
import { PromptEditor } from '@/components/PromptEditor';
import { ReversePromptModal } from '@/components/ReversePromptModal';
import { SettingsModal } from '@/components/SettingsModal';
import { MediaPreviewModal } from '@/components/MediaPreviewModal';
import { TemplateModal } from '@/components/TemplateModal';

const DEFAULT_EMPTY_FOLDER: FolderNode = {
  name: '所有提示词',
  path: '',
  children: [],
  itemCount: 0,
};

export default function Home() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [folders, setFolders] = useState<FolderNode>(DEFAULT_EMPTY_FOLDER);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [isCloudflareRuntime, setIsCloudflareRuntime] = useState<boolean>(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | 'all'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video'; title?: string } | null>(null);
  const [templateText, setTemplateText] = useState<string | null>(null);

  // Gemini API Key & Models stored in localStorage
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedAiModel, setSelectedAiModel] = useState<string>('gemini-2.5-flash');
  const [reverseAiModel, setReverseAiModel] = useState<string>('gemini-2.5-pro');
  const [availableModels, setAvailableModels] = useState<AvailableGeminiModel[]>([]);

  // Server restart state
  const [isRestarting, setIsRestarting] = useState(false);
  const [restartStatus, setRestartStatus] = useState<string>('');

  const fetchAvailableModelsList = useCallback(async (keyToUse: string) => {
    if (!keyToUse?.trim()) return;
    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToUse.trim() }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        setAvailableModels(data.models);
      }
    } catch (e) {
      console.error('Failed to fetch available models:', e);
    }
  }, []);

  useEffect(() => {
    const savedKey = localStorage.getItem('myprompt_gemini_api_key') || '';
    const savedModel = localStorage.getItem('myprompt_gemini_selected_model') || 'gemini-2.5-flash';
    const savedReverseModel = localStorage.getItem('myprompt_gemini_reverse_model') || 'gemini-2.5-pro';
    setApiKey(savedKey);
    setSelectedAiModel(savedModel);
    setReverseAiModel(savedReverseModel);
    if (savedKey) {
      fetchAvailableModelsList(savedKey);
    }

    // Fetch current logged-in user & runtime environment
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && d.username) setCurrentUser(d.username);
      })
      .catch(() => {});

    fetch('/api/system/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.runtime === 'cloudflare-pages') setIsCloudflareRuntime(true);
      })
      .catch(() => {});
  }, [fetchAvailableModelsList]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  const handleSaveSettings = (key: string, model: string) => {
    setApiKey(key);
    setSelectedAiModel(model);
    localStorage.setItem('myprompt_gemini_api_key', key);
    localStorage.setItem('myprompt_gemini_selected_model', model);
    if (key) {
      fetchAvailableModelsList(key);
    }
  };

  const handleSaveReverseModel = (model: string) => {
    setReverseAiModel(model);
    localStorage.setItem('myprompt_gemini_reverse_model', model);
  };

  // Force Restart Local Server on Fixed Port 5059
  const handleForceRestart = async () => {
    if (isRestarting) return;
    if (!window.confirm('确定要强制重启本地服务吗？\n\n服务将释放旧进程并固定在端口 5059 上重新启动，恢复后页面将自动刷新。')) {
      return;
    }

    setIsRestarting(true);
    setRestartStatus('正在向服务端发送强制重启指令...');

    let oldPid: number | null = null;
    try {
      const res = await fetch('/api/system/restart', { method: 'POST' });
      const data = await res.json();
      if (data.oldPid) oldPid = data.oldPid;
    } catch {
      // Server might already be restarting or unresponsive; proceed to poll health
    }

    setRestartStatus('旧服务进程已终止，正在端口 5059 重新拉起服务...');

    // Wait briefly for the old process to be killed before polling
    await new Promise((r) => setTimeout(r, 2200));

    const maxAttempts = 40;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const healthRes = await fetch('/api/system/health', { cache: 'no-store' });
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          if (healthData.ok && (!oldPid || healthData.pid !== oldPid || i > 3)) {
            setRestartStatus('服务已在端口 5059 重启成功，正在刷新页面...');
            setTimeout(() => {
              window.location.reload();
            }, 500);
            return;
          }
        }
      } catch {
        // Still starting up
      }
      setRestartStatus(`正在等待端口 5059 恢复响应... (${i + 1}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, 1200));
    }

    setIsRestarting(false);
    setRestartStatus('');
    alert('等待服务重启超时，请检查终端或手动运行 npm run dev。');
  };

  // Fetch prompts from API
  const fetchPrompts = useCallback(async () => {
    try {
      const res = await fetch('/api/prompts');
      const data = await res.json();
      if (data.success) {
        setPrompts(data.prompts || []);
        if (data.folders) setFolders(data.folders);

        // If no prompt selected yet, pick the first one
        if (!selectedPrompt && data.prompts?.length > 0) {
          setSelectedPrompt(data.prompts[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load prompts:', err);
    }
  }, [selectedPrompt]);

  useEffect(() => {
    fetchPrompts();
  }, []);

  // Filtered prompts
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      // Folder filter
      if (selectedFolder) {
        if (p.folderPath !== selectedFolder && !p.folderPath.startsWith(`${selectedFolder}/`)) {
          return false;
        }
      }
      // Model filter
      if (selectedModel) {
        if (!p.models.some((m) => m.toLowerCase().includes(selectedModel.toLowerCase()))) {
          return false;
        }
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesEn = p.promptEn.toLowerCase().includes(q);
        const matchesZh = p.promptZh.toLowerCase().includes(q);
        const matchesTag = p.tags.some((t) => t.toLowerCase().includes(q));
        const matchesModel = p.models.some((m) => m.toLowerCase().includes(q));
        if (!matchesTitle && !matchesEn && !matchesZh && !matchesTag && !matchesModel) {
          return false;
        }
      }
      return true;
    });
  }, [prompts, selectedCategory, selectedFolder, selectedModel, searchQuery]);

  // Aggregate stats
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      文生图: 0,
      图改图: 0,
      图生视频: 0,
      文生视频: 0,
    };
    prompts.forEach((p) => {
      if (counts[p.category] !== undefined) {
        counts[p.category]++;
      }
    });
    return counts;
  }, [prompts]);

  const allModels = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((p) => {
      p.models?.forEach((m) => {
        if (m) set.add(m.trim());
      });
    });
    return Array.from(set);
  }, [prompts]);

  const allFolderPaths = useMemo(() => {
    const paths: string[] = [];
    function walk(node: FolderNode) {
      if (node.path) paths.push(node.path);
      node.children?.forEach(walk);
    }
    walk(folders);
    return paths;
  }, [folders]);

  // Create a new blank prompt
  const handleNewPrompt = () => {
    const newP: PromptItem = {
      id: generatePromptId(),
      title: '未命名提示词',
      category: selectedCategory === 'all' ? '文生图' : selectedCategory,
      models: ['Midjourney v6.1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      coverImage: '',
      mediaFiles: [],
      tags: [],
      parameters: {
        aspectRatio: '16:9',
      },
      promptEn: '',
      promptZh: '',
      notes: '',
      folderPath: selectedFolder || '',
      filePath: '',
    };
    setSelectedPrompt(newP);
  };

  // Save prompt
  const handleSavePrompt = async (updated: PromptItem) => {
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: updated,
          oldFilePath: selectedPrompt?.filePath,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const saved = data.prompt;
        setSelectedPrompt(saved);
        // Refresh list
        await fetchPrompts();
      } else {
        alert(`保存失败: ${data.error}`);
      }
    } catch (e: any) {
      alert(`保存请求出错: ${e.message}`);
    }
  };

  // Delete prompt
  const handleDeletePrompt = async (filePath: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('确定要删除这条提示词吗？此操作将永久移除对应的 Markdown 文件。')) {
      return;
    }

    try {
      const res = await fetch(`/api/prompts/item?filePath=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (selectedPrompt?.filePath === filePath) {
          setSelectedPrompt(null);
        }
        await fetchPrompts();
      } else {
        alert(`删除失败: ${data.error}`);
      }
    } catch (err: any) {
      alert(`删除请求出错: ${err.message}`);
    }
  };

  // Create Folder
  const handleCreateFolder = async (folderName: string, parentPath: string) => {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName, parentPath }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.folders) setFolders(data.folders);
        setSelectedFolder(data.folderPath);
      }
    } catch (err: any) {
      alert(`新建目录出错: ${err.message}`);
    }
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    window.open('/api/export', '_blank');
  };

  // Keyboard shortcut Cmd+S / Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (selectedPrompt) {
          handleSavePrompt(selectedPrompt);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPrompt]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Global Top Bar with Runtime Badge, Model Indicators & User Logout */}
      <header className="h-11 px-4 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${isRestarting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            {isCloudflareRuntime ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-slate-300 font-medium">Cloudflare Pages</span>
                <span className="font-mono text-orange-400 font-semibold">KV+R2</span>
              </>
            ) : (
              <>
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-300 font-medium">本地服务</span>
                <span className="font-mono text-indigo-400 font-semibold">:5059</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            title="点击修改全局默认模型与 API Key"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>全局模型:</span>
            <span className="font-mono text-slate-200">{selectedAiModel}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReverseModalOpen(true)}
            title="点击打开逆向反推工作台并独立配置高阶模型"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-purple-900/40 text-slate-400 hover:text-purple-200 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>反推模型:</span>
            <span className="font-mono text-purple-300">{reverseAiModel}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono">{currentUser}</span>
            </div>
          )}

          {!isCloudflareRuntime && (
            <button
              type="button"
              onClick={handleForceRestart}
              disabled={isRestarting}
              title="强制刷新 / 重启服务"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-800/60 text-xs font-medium transition disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin' : ''}`} />
              <span>{isRestarting ? '正在刷新...' : '强制重启服务'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title="退出当前登录会话"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出</span>
          </button>
        </div>
      </header>

      {/* Main 3-Column Workspace */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* 1. Left Sidebar: Categories, Folders, Models, Search */}
        <Sidebar
          folders={folders}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewPrompt={handleNewPrompt}
          onOpenReverseModal={() => setIsReverseModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onExportBackup={handleExportBackup}
          categoryCounts={categoryCounts}
          allModels={allModels}
          onCreateFolder={handleCreateFolder}
        />

        {/* 2. Middle Prompt List */}
        <PromptList
          prompts={filteredPrompts}
          selectedPrompt={selectedPrompt}
          onSelectPrompt={setSelectedPrompt}
          onDeletePrompt={handleDeletePrompt}
          selectedCategoryName={
            selectedCategory === 'all'
              ? (selectedFolder ? `目录: ${selectedFolder}` : '全部提示词')
              : selectedCategory
          }
        />

        {/* 3. Right Prompt Editor & Bilingual Workspace */}
        <PromptEditor
          prompt={selectedPrompt}
          onSave={handleSavePrompt}
          onDelete={handleDeletePrompt}
          apiKey={apiKey}
          selectedModel={selectedAiModel}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMediaPreview={(url, type, title) => setPreviewMedia({ url, type, title })}
          onOpenTemplateModal={(text) => setTemplateText(text)}
          allFolderPaths={allFolderPaths}
        />
      </main>

      {/* Multimodal Reverse Prompting Modal (Independent High-Tier Model) */}
      <ReversePromptModal
        isOpen={isReverseModalOpen}
        onClose={() => setIsReverseModalOpen(false)}
        apiKey={apiKey}
        globalModel={selectedAiModel}
        reverseModel={reverseAiModel}
        availableModels={availableModels}
        onReverseModelChange={handleSaveReverseModel}
        onRefreshModels={() => fetchAvailableModelsList(apiKey)}
        onOpenSettings={() => {
          setIsReverseModalOpen(false);
          setIsSettingsOpen(true);
        }}
        onPromptCreated={(newPrompt) => {
          fetchPrompts();
          setSelectedPrompt(newPrompt);
        }}
      />

      {/* Settings Modal (Global API Key & Default Model configuration) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        selectedModel={selectedAiModel}
        onSaveSettings={handleSaveSettings}
      />

      {/* Fullscreen Media Preview Modal */}
      <MediaPreviewModal
        isOpen={!!previewMedia}
        onClose={() => setPreviewMedia(null)}
        mediaUrl={previewMedia?.url || ''}
        mediaType={previewMedia?.type || 'image'}
        title={previewMedia?.title}
      />

      {/* Prompt Variable Template Modal */}
      <TemplateModal
        isOpen={!!templateText}
        onClose={() => setTemplateText(null)}
        promptText={templateText || ''}
        onApplyPrompt={(newPrompt) => {
          if (selectedPrompt) {
            setSelectedPrompt({
              ...selectedPrompt,
              promptEn: newPrompt,
            });
          }
        }}
      />

      {/* Restarting Overlay */}
      {isRestarting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="max-w-sm w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">正在强制重启本地服务</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {restartStatus || '正在端口 5059 重新拉起服务，完成后将自动刷新页面...'}
              </p>
            </div>
            <div className="text-[11px] font-mono text-indigo-400 bg-slate-950 py-1.5 px-3 rounded-lg border border-slate-800">
              {typeof window !== 'undefined' ? window.location.origin : 'http://192.168.4.188:5059'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

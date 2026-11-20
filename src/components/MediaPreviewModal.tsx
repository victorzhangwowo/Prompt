'use client';

import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType?: 'image' | 'video';
  title?: string;
}

export function MediaPreviewModal({
  isOpen,
  onClose,
  mediaUrl,
  mediaType = 'image',
  title,
}: MediaPreviewModalProps) {
  if (!isOpen || !mediaUrl) return null;

  const isVideo = mediaType === 'video' || /\.(mp4|webm|mov|m4v)$/i.test(mediaUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-[-48px] right-0 flex items-center gap-3">
          <a
            href={mediaUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs"
          >
            <Download className="w-4 h-4" />
            <span>下载</span>
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {title && (
          <div className="absolute top-[-44px] left-0 text-sm font-medium text-slate-300 truncate max-w-md">
            {title}
          </div>
        )}

        <div className="w-full flex items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain"
            />
          ) : (
            <img
              src={mediaUrl}
              alt={title || '预览'}
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain select-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}

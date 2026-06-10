import React from 'react';
import { ImageIcon, FileText, X, Link as LinkIcon } from 'lucide-react';
import type { Message, User } from '../../types';
import { downloadAttachment } from '../../utils/chatHelpers';

export type MediaTab = 'images' | 'files' | 'links';

interface MediaFilterPanelProps {
  tab: MediaTab;
  onTabChange: (t: MediaTab) => void;
  onClose: () => void;
  messages: Message[];
  users: User[];
  onOpenImage: (message: Message, group?: Message[]) => void;
  onLinkClick: (url: string) => void;
}

export function MediaFilterPanel({
  tab,
  onTabChange,
  onClose,
  messages,
  users,
  onOpenImage,
  onLinkClick,
}: MediaFilterPanelProps) {
  const tabs: { key: MediaTab; label: string; icon: React.ReactNode }[] = [
    { key: 'images', label: 'Hình ảnh', icon: <ImageIcon className="w-4 h-4" /> },
    { key: 'files', label: 'Tệp tin', icon: <FileText className="w-4 h-4" /> },
    { key: 'links', label: 'Liên kết', icon: <LinkIcon className="w-4 h-4" /> },
  ];
  const imageMessages = messages.filter(m => m.type === 'image' && m.fileUrl);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span style={{ fontWeight: 600, fontSize: '0.95rem' }} className="text-gray-800">
          Nội dung chia sẻ
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors ${tab === t.key
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            style={{ fontSize: '0.8rem', fontWeight: tab === t.key ? 600 : 400 }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'images' && (
          <div className="grid grid-cols-3 gap-1.5">
            {imageMessages.map(img => (
              <button
                type="button"
                key={img.id}
                onClick={() => onOpenImage(img, imageMessages)}
                className="aspect-square rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden relative group"
              >
                <img src={img.fileUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                  <span className="text-white truncate w-full" style={{ fontSize: '0.6rem' }}>
                    {img.fileName || 'Hình ảnh'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'files' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-gray-800" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Danh sách file ({messages.filter(m => m.type === 'file' && m.fileId).length})
              </span>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50/80 overflow-hidden">
              {messages.filter(m => m.type === 'file' && m.fileId).map(file => {
                const ext = (file.fileName || '').split('.').pop()?.toLowerCase() || '';
                let extLabel = ext.toUpperCase() || 'FILE';
                let bgClass = 'bg-gray-100';
                let textClass = 'text-gray-600';

                if (['pptx', 'ppt'].includes(ext)) { bgClass = 'bg-orange-100'; textClass = 'text-orange-600'; extLabel = 'PPT'; }
                else if (['pdf'].includes(ext)) { bgClass = 'bg-red-100'; textClass = 'text-red-600'; }
                else if (['mp4', 'mov', 'avi'].includes(ext)) { bgClass = 'bg-pink-100'; textClass = 'text-pink-600'; extLabel = 'MP4'; }
                else if (['zip', 'rar', '7z'].includes(ext)) { bgClass = 'bg-purple-100'; textClass = 'text-purple-600'; }
                else if (['xlsx', 'xls', 'csv'].includes(ext)) { bgClass = 'bg-green-100'; textClass = 'text-green-600'; extLabel = 'Excel'; }
                else if (['png', 'jpg', 'jpeg'].includes(ext)) { bgClass = 'bg-cyan-100'; textClass = 'text-cyan-600'; extLabel = 'PNG'; }
                else if (['docx', 'doc'].includes(ext)) { bgClass = 'bg-blue-100'; textClass = 'text-blue-600'; extLabel = 'Word'; }

                const senderName = users.find(u => u.id === file.senderId)?.name || 'Ẩn danh';

                return (
                  <div
                    key={file.id}
                    onClick={() => downloadAttachment(file.fileId, file.fileName || 'download')}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className={`${bgClass} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <span className={`${textClass}`} style={{ fontSize: '0.65rem', fontWeight: 800 }}>
                        {extLabel}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-gray-800" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {file.fileName}
                      </p>
                      <p className="text-gray-400" style={{ fontSize: '0.75rem' }}>
                        {file.fileSize || 'N/A'} · {senderName} · {file.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'links' && (
          <div className="space-y-2">
            {messages.filter(m => m.type === 'text' && m.content.match(/https?:\/\/[^\s]+/g)).map(link => {
              const urls = link.content.match(/https?:\/\/[^\s]+/g) || [];
              return urls.map((url, i) => (
                <button
                  type="button"
                  key={`${link.id}-${i}`}
                  onClick={() => onLinkClick(url)}
                  className="w-full text-left flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-green-50 transition-colors cursor-pointer"
                >
                  <div className="bg-blue-50 p-2 rounded-lg flex-shrink-0">
                    <LinkIcon className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800" style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                      Liên kết chia sẻ
                    </p>
                    <p className="text-blue-400 truncate" style={{ fontSize: '0.7rem' }}>
                      {url}
                    </p>
                    <p className="text-gray-400 mt-0.5" style={{ fontSize: '0.68rem' }}>
                      {link.timestamp}
                    </p>
                  </div>
                </button>
              ));
            })}
          </div>
        )}
      </div>
    </div>
  );
}

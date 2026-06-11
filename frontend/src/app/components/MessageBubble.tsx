import React, { useState, useRef, useEffect } from 'react';
import {
  Download, Reply, Trash2, X, FileText, ImageIcon, Video, CheckCheck, Check
} from 'lucide-react';
import type { Message, User } from '../../types';
import { Avatar } from './Avatar';
import { getFileIcon, downloadAttachment, renderMessageContent } from '../../utils/chatHelpers';

interface MessageBubbleProps {
  msg: Message;
  isMine: boolean;
  sender?: User;
  isGroup: boolean;
  replyMsg?: Message;
  imageGroup?: Message[];
  onReply: (m: Message) => void;
  onPin: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  onRecall: (m: Message, group?: Message[]) => void;
  onOpenImage: (m: Message, group?: Message[]) => void;
  onLinkClick: (url: string) => void;
  onQuoteClick?: (m: Message) => void;
}

export function MessageBubble({
  msg,
  isMine,
  sender,
  isGroup,
  replyMsg,
  imageGroup,
  onReply,
  onPin,
  onReact,
  onRecall,
  onOpenImage,
  onLinkClick,
  onQuoteClick,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const hideActionsTimer = useRef<number | null>(null);
  const touchTimer = useRef<number | null>(null);

  const displayFileName = msg.fileName || msg.content;
  const fileStyle = displayFileName ? getFileIcon(displayFileName) : null;
  const isRecalled = msg.content === '__MESSAGE_RECALLED__';
  const isPendingText = msg.type === 'text' && msg.isUploading;
  const isFailedText = msg.type === 'text' && Boolean(msg.uploadError);
  const groupedImages = imageGroup && imageGroup.length > 1 ? imageGroup : null;
  const replyAuthor = replyMsg ? ((replyMsg as any).userName || (replyMsg as any)._senderName || '') : '';
  const replyPreview = replyMsg
    ? replyMsg.content === '__MESSAGE_RECALLED__'
      ? 'Tin nhắn đã thu hồi'
      : replyMsg.type === 'file'
        ? `File: ${replyMsg.fileName || replyMsg.content || ''}`.trim()
        : replyMsg.type === 'image'
          ? 'Hình ảnh'
          : replyMsg.type === 'video'
            ? 'Video'
            : (replyMsg.content || '').trim()
    : '';

  const openActions = () => {
    if (hideActionsTimer.current) window.clearTimeout(hideActionsTimer.current);
    setShowActions(true);
  };

  const closeActionsLater = () => {
    if (hideActionsTimer.current) window.clearTimeout(hideActionsTimer.current);
    hideActionsTimer.current = window.setTimeout(() => {
      setShowActions(false);
      setShowEmojiPicker(false);
    }, 300);
  };

  useEffect(() => () => {
    if (hideActionsTimer.current) window.clearTimeout(hideActionsTimer.current);
  }, []);

  const handleTouchStart = () => {
    if (isRecalled) return;
    touchTimer.current = window.setTimeout(() => {
      setShowMobileMenu(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 450);
  };

  const handleTouchEndOrMove = () => {
    if (touchTimer.current) window.clearTimeout(touchTimer.current);
  };

  if (msg.type === 'system') {
    return (
      <div className="flex justify-center px-3 py-1.5">
        <span
          className="max-w-[85%] rounded-full bg-gray-100 px-3 py-1 text-center text-gray-500 shadow-sm"
          style={{ fontSize: '0.76rem', lineHeight: '1.35' }}
        >
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        className={`flex items-start gap-2.5 group relative min-w-0 select-none ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
        onMouseEnter={openActions}
        onMouseLeave={closeActionsLater}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchEndOrMove}
        onTouchEnd={handleTouchEndOrMove}
        onContextMenu={(e) => {
          // Prevent default context menu on mobile long press
          if (window.innerWidth < 768) {
            e.preventDefault();
          }
        }}
      >
        {/* Avatar — only for others */}
        {!isMine && sender && (
          <div className="flex-shrink-0 mt-1">
            <Avatar user={sender} size="sm" />
          </div>
        )}

        <div className={`flex flex-col gap-0.5 min-w-0 max-w-[75%] sm:max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
          {/* Sender name for group */}
          {!isMine && isGroup && sender && (
            <span className="text-green-600 ml-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              {sender.name}
            </span>
          )}

          {/* Reply quote */}
          {isMine && replyMsg && replyPreview && (
            <div
              onClick={() => onQuoteClick?.(replyMsg)}
              className={`px-2.5 py-1.5 rounded-xl border-l-2 border-green-400 mb-0.5 max-w-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ${isMine ? 'bg-green-400/20' : 'bg-gray-100'
                }`}
            >
              <span
                className={isMine ? 'text-green-700' : 'text-gray-400'}
                style={{ fontSize: '0.72rem', fontWeight: 600 }}
              >
                {replyAuthor || 'Tin nhắn'}
              </span>
              <p
                className={`truncate ${isMine ? 'text-green-800' : 'text-gray-500'}`}
                style={{ fontSize: '0.72rem' }}
              >
                {replyPreview}
              </p>
            </div>
          )}

          {/* Bubble */}
          <div className="relative min-w-0 max-w-full">
            {isRecalled && (
              <div
                className={`px-3 py-1.5 rounded-2xl border border-gray-200 bg-gray-100 text-gray-500 italic ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                style={{ fontSize: '0.82rem' }}
              >
                Tin nhắn đã được thu hồi
              </div>
            )}

            {/* Image message */}
            {msg.type === 'image' && groupedImages && (
              <div
                className={`grid gap-1.5 rounded-2xl overflow-hidden ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'} max-w-sm ${groupedImages.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                  }`}
              >
                {groupedImages.slice(0, 6).map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => onOpenImage(img, groupedImages)}
                    className={`relative bg-green-50 overflow-hidden ${groupedImages.length === 3 && index === 0 ? 'row-span-2' : ''}`}
                    style={{ aspectRatio: groupedImages.length === 2 ? '1 / 1' : undefined }}
                  >
                    {img.fileUrl ? (
                      <img src={img.fileUrl} alt={img.fileName || 'Hình ảnh'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-28 h-24 flex items-center justify-center">
                        <ImageIcon className="w-7 h-7 text-green-500" />
                      </div>
                    )}
                    {index === 5 && groupedImages.length > 6 && (
                      <div className="absolute inset-0 bg-black/55 text-white flex items-center justify-center" style={{ fontSize: '1rem', fontWeight: 700 }}>
                        +{groupedImages.length - 6}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {msg.type === 'image' && !groupedImages && (
              <div
                className={`rounded-2xl overflow-hidden ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                  } border border-gray-200 max-w-sm relative group/image`}
              >
                {msg.fileUrl ? (
                  <button onClick={() => onOpenImage(msg)} className="block">
                    <img
                      src={msg.fileUrl}
                      alt={displayFileName || 'Hình ảnh'}
                      className="w-full h-auto max-h-72 object-cover"
                    />
                  </button>
                ) : (
                  <div className="w-52 h-36 bg-gradient-to-br from-green-100 to-emerald-200 flex flex-col items-center justify-center gap-1">
                    <ImageIcon className="w-8 h-8 text-green-500" />
                    <span className="text-green-600" style={{ fontSize: '0.72rem', fontWeight: 500 }}>
                      {displayFileName ?? 'Hình ảnh'}
                    </span>
                  </div>
                )}
                {msg.isUploading && (
                  <div className="absolute inset-0 bg-black/25 flex flex-col justify-end">
                    <div className="px-3 pb-3">
                      <div className="flex items-center justify-between text-white mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                        <span>Đang tải lên</span>
                        <span>{Math.round(msg.uploadProgress || 0)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/35 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-200"
                          style={{ width: `${Math.max(4, Math.min(100, msg.uploadProgress || 0))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {msg.uploadError && (
                  <div className="absolute inset-x-0 bottom-0 bg-red-500/90 text-white px-3 py-1.5" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                    Lỗi upload
                  </div>
                )}
                {msg.fileId && !msg.isUploading && (
                  <button
                    onClick={() => downloadAttachment(msg.fileId, displayFileName || 'image')}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/45 text-white opacity-0 group-hover/image:opacity-100 transition-opacity"
                    title="Tải xuống"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Video message */}
            {msg.type === 'video' && (
              <div
                className={`rounded-2xl overflow-hidden ${isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                  } border border-gray-200 max-w-sm relative group/video bg-black`}
              >
                {msg.fileUrl ? (
                  <video
                    src={msg.fileUrl}
                    className="w-full max-h-72 object-contain bg-black"
                    controls
                    preload="metadata"
                  />
                ) : (
                  <div className="w-52 h-36 bg-gray-900 flex flex-col items-center justify-center gap-1">
                    <Video className="w-8 h-8 text-white" />
                    <span className="text-white" style={{ fontSize: '0.72rem', fontWeight: 500 }}>
                      {displayFileName ?? 'Video'}
                    </span>
                  </div>
                )}
                {msg.isUploading && (
                  <div className="absolute inset-0 bg-black/35 flex flex-col justify-end pointer-events-none">
                    <div className="px-3 pb-3">
                      <div className="flex items-center justify-between text-white mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                        <span>Đang tải lên</span>
                        <span>{Math.round(msg.uploadProgress || 0)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/35 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-200"
                          style={{ width: `${Math.max(4, Math.min(100, msg.uploadProgress || 0))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {msg.fileId && !msg.isUploading && (
                  <button
                    onClick={() => downloadAttachment(msg.fileId, displayFileName || 'video')}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/45 text-white opacity-0 group-hover/video:opacity-100 transition-opacity"
                    title="Tải xuống"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* File message */}
            {msg.type === 'file' && fileStyle && (
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border ${isMine
                  ? 'bg-green-600 border-green-500 rounded-tr-sm'
                  : 'bg-white border-gray-200 shadow-sm rounded-tl-sm'
                  }`}
                style={{ minWidth: '180px' }}
              >
                <div className={`${fileStyle.bg} p-2 rounded-xl flex-shrink-0`}>
                  <FileText className={`w-5 h-5 ${fileStyle.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`truncate ${isMine ? 'text-white' : 'text-gray-800'}`}
                    style={{ fontSize: '0.8rem', fontWeight: 500 }}
                  >
                    {displayFileName}
                  </p>
                  <p
                    className={isMine ? 'text-green-200' : 'text-gray-400'}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {msg.fileSize || ''}
                  </p>
                  {(msg.isUploading || msg.uploadError) && (
                    <div className="mt-1.5">
                      <div className={`flex items-center justify-between ${isMine ? 'text-green-100' : 'text-gray-500'}`} style={{ fontSize: '0.65rem' }}>
                        <span>{msg.uploadError ? 'Lỗi upload' : 'Đang tải lên'}</span>
                        {!msg.uploadError && <span>{Math.round(msg.uploadProgress || 0)}%</span>}
                      </div>
                      {!msg.uploadError && (
                        <div className={`mt-1 h-1 rounded-full overflow-hidden ${isMine ? 'bg-green-400' : 'bg-gray-200'}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-200 ${isMine ? 'bg-white' : 'bg-green-500'}`}
                            style={{ width: `${Math.max(4, Math.min(100, msg.uploadProgress || 0))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => downloadAttachment(msg.fileId, displayFileName || 'download')}
                  disabled={msg.isUploading || !msg.fileId}
                  className={`flex-shrink-0 p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isMine ? 'hover:bg-green-500 text-green-100' : 'hover:bg-gray-100 text-gray-400'
                    }`}
                  title="Tải xuống"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    if (!(msg as any).fileId) {
                      alert('Đang xử lý file, vui lòng thử lại sau!');
                      return;
                    }
                    try {
                      const res = await fetch(`${import.meta.env.VITE_API_URL}/files/${(msg as any).fileId}/download`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                      });
                      const data = await res.json();
                      if (data?.data?.downloadUrl) {
                        const a = document.createElement('a');
                        a.href = data.data.downloadUrl;
                        a.click();
                      } else {
                        throw new Error('Không lấy được link tải');
                      }
                    } catch (e) {
                      alert('Lỗi khi tải file!');
                    }
                  }}
                  className={`hidden flex-shrink-0 p-1.5 rounded-lg transition-colors ${isMine ? 'hover:bg-green-500 text-green-100' : 'hover:bg-gray-100 text-gray-400'
                    }`}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Text message */}
            {msg.type === 'text' && !isRecalled && (
              <div
                className={`px-3.5 py-2 rounded-2xl max-w-full overflow-hidden ${isMine
                  ? 'bg-green-500 text-white rounded-tr-sm'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm'
                  } ${isPendingText ? 'opacity-80' : ''} ${isFailedText ? 'ring-1 ring-red-300' : ''}`}
              >
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]" style={{ fontSize: '0.9rem', lineHeight: '1.45' }}>
                  {renderMessageContent(msg.content, isMine, onLinkClick)}
                </p>
              </div>
            )}

            {/* Reactions */}
            {msg.reactions && msg.reactions.length > 0 && (
              <div
                className={`flex gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                {msg.reactions.map((r, i) => (
                  <div
                    key={i}
                    className="bg-white border border-gray-200 shadow-sm rounded-full px-1.5 py-0.5 flex items-center gap-0.5"
                    style={{ fontSize: '0.72rem' }}
                  >
                    <span>{r.emoji}</span>
                    <span className="text-gray-500">{r.userIds.length}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time + Status */}
          <div className={`flex items-center gap-1 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
            <span className="text-gray-400" style={{ fontSize: '0.68rem' }}>
              {msg.timestamp}
            </span>
            {isMine && isPendingText && (
              <span className="text-gray-400" style={{ fontSize: '0.68rem' }}>
                Đang gửi
              </span>
            )}
            {isMine && isFailedText && (
              <span className="text-red-400" style={{ fontSize: '0.68rem' }}>
                Gửi lỗi
              </span>
            )}
            {isMine && (
              <span>
                {isPendingText ? (
                  <Check className="w-3.5 h-3.5 text-gray-300" />
                ) : isFailedText ? (
                  <X className="w-3.5 h-3.5 text-red-400" />
                ) : msg.status === 'seen' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                ) : msg.status === 'delivered' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-gray-400" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Quick actions on hover */}
        {!isRecalled && !msg.isUploading && !msg.uploadError && (
          <div
            className={`flex items-center gap-0.5 mb-3 transition-opacity ${showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              } ${isMine ? 'mr-1' : 'ml-1'}`}
          >
            <button
              onClick={() => onReply(msg)}
              className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              title="Trả lời"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onPin(msg)}
              className={`p-1.5 rounded-full hover:bg-gray-200 transition-colors ${msg.isPinned ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'}`}
              title={msg.isPinned ? "Bỏ ghim" : "Ghim tin nhắn"}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            </button>
            {isMine && (
              <button
                onClick={() => onRecall(msg, groupedImages || undefined)}
                className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Thu hoi"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-1.5 rounded-full transition-colors ${showEmojiPicker ? 'bg-gray-200 text-gray-600' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'}`}
              >
                <span style={{ fontSize: '0.8rem' }}>😊</span>
              </button>
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-gray-100 rounded-full px-2 py-1.5 gap-1.5 z-50 transition-all duration-200 ${showEmojiPicker ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(e => (
                  <button
                    key={e}
                    onClick={() => {
                      onReact(msg, e);
                      setShowEmojiPicker(false);
                      setShowActions(false); // Ẩn actions sau khi thả tim
                    }}
                    className="hover:scale-125 transition-transform text-lg"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Action Menu (Bottom Sheet) */}
      {showMobileMenu && !msg.isUploading && !msg.uploadError && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={() => setShowMobileMenu(false)} />
          <div className="bg-white rounded-t-2xl p-4 pb-6 flex flex-col gap-2 relative transform transition-transform duration-300">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-800" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Thao tác tin nhắn</span>
              <button onClick={() => setShowMobileMenu(false)} className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reactions */}
            <div className="flex justify-between bg-gray-50 p-3 rounded-2xl mb-1">
              {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(e => (
                <button
                  key={e}
                  onClick={() => {
                    onReact(msg, e);
                    setShowMobileMenu(false);
                  }}
                  className="text-2xl hover:scale-110 transition-transform active:scale-95"
                >
                  {e}
                </button>
              ))}
            </div>

            <button
              onClick={() => { onReply(msg); setShowMobileMenu(false); }}
              className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl active:bg-gray-100 transition-colors"
            >
              <Reply className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Trả lời</span>
            </button>

            <button
              onClick={() => { onPin(msg); setShowMobileMenu(false); }}
              className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl active:bg-gray-100 transition-colors"
            >
              <svg className={`w-5 h-5 ${msg.isPinned ? 'text-green-500' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="text-gray-700" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                {msg.isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
              </span>
            </button>

            {isMine && (
              <button
                onClick={() => { onRecall(msg, groupedImages || undefined); setShowMobileMenu(false); }}
                className="flex items-center gap-3 p-3.5 bg-red-50 rounded-xl active:bg-red-100 transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-500" />
                <span className="text-red-600" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Thu hồi tin nhắn</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

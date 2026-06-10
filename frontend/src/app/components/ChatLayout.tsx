import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageCircle, Search, LogOut, ChevronLeft, Send, Paperclip, Smile,
  MoreVertical, Download, X, Shield, ImageIcon, Info,
  Bell, Settings, Video, Plus, ChevronRight, AlertTriangle, FileText, UserMinus
} from 'lucide-react';
import type { User, Conversation, Message } from '../App';
import { CreateGroupModal } from './CreateGroupModal';

import { useChat } from '../../hooks/useChat';
import api from '../../lib/api';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsModal } from './SettingsModal';

import { Avatar, GroupAvatar, STATUS_COLOR, STATUS_LABEL } from './Avatar';
import { TypingIndicator } from './TypingIndicator';
import { MediaFilterPanel } from './MediaFilterPanel';
import type { MediaTab } from './MediaFilterPanel';
import { MessageBubble } from './MessageBubble';
import { runWithConcurrency, downloadAttachment, getFileIcon } from '../../utils/chatHelpers';

interface Props {
  currentUser: User;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

type PendingAttachment = {
  id: string;
  file: File;
  previewUrl?: string;
  type: 'image' | 'video' | 'file';
};

type ImageViewerState = {
  images: Message[];
  index: number;
};

const MAX_ATTACHMENT_SIZE = 40 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_TYPES = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar';
const MAX_CONCURRENT_UPLOADS = 3;


// ─── Main ChatLayout ─────────────────────────────────────────────────────────
export function ChatLayout({
  currentUser,
  onLogout,
  onOpenAdmin,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedConvId = searchParams.get('room');
  const selectedMessageId = searchParams.get('message');
  const setSelectedConvId = (id: string | null, messageId?: string | null) => {
    if (id) {
      const nextParams: Record<string, string> = { room: id };
      if (messageId) nextParams.message = messageId;
      setSearchParams(nextParams, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const [mobileShowChat, setMobileShowChat] = useState(false);

  useEffect(() => {
    if (selectedConvId) {
      setMobileShowChat(true);
    }
  }, [selectedConvId]);

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [mediaTab, setMediaTab] = useState<MediaTab>('images');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [showConversationSearch, setShowConversationSearch] = useState(false);
  const [conversationSearchQuery, setConversationSearchQuery] = useState('');
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [imageViewer, setImageViewer] = useState<ImageViewerState | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [pendingExternalLink, setPendingExternalLink] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const roomMenuRef = useRef<HTMLDivElement>(null);
  const conversationSearchInputRef = useRef<HTMLInputElement>(null);
  const [recallConfirm, setRecallConfirm] = useState<{ messages: Message[], label: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);
  const lastScrolledRoomRef = useRef<string | null>(null);
  const imageTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const imageTouchMovedRef = useRef(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { updateAvatar } = useAuth();

  const {
    users,
    conversations,
    messages,
    sendMessage,
    sendFileMessage,
    createGroupChat,
    createRoom,
    togglePin,
    pinMessage,
    reactToMessage,
    recallMessage,
    markRoomUnread,
    leaveRoom
  } = useChat(currentUser, selectedConvId);

  const getAttachmentType = (file: File): PendingAttachment['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
  };

  const addPendingFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    const rejected: string[] = [];
    const nextItems = incoming.flatMap(file => {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        rejected.push(file.name);
        return [];
      }

      const type = getAttachmentType(file);
      return [{
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        type,
        previewUrl: type === 'image' || type === 'video' ? URL.createObjectURL(file) : undefined
      }];
    });

    if (rejected.length > 0) {
      alert(`File quá lớn, tối đa 40MB: ${rejected.join(', ')}`);
    }

    if (nextItems.length > 0) {
      setPendingAttachments(prev => [...prev, ...nextItems]);
    }
  };

  const handleAttachmentInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addPendingFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments(prev => {
      const target = prev.find(item => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(item => item.id !== id);
    });
  };

  const clearPendingAttachments = () => {
    setPendingAttachments(prev => {
      prev.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConvId) return;

    // Giới hạn dung lượng 40MB
    const MAX_SIZE = 40 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('File quá lớn! Vui lòng chọn file nhỏ hơn 40MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      await sendFileMessage(selectedConvId, file, type);
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra khi tải file lên');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Avatar tối đa 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // 1. Lấy chữ ký Cloudinary
      const { data } = await api.post('/users/me/avatar/upload-url');
      const { uploadUrl, signature, timestamp, folder, apiKey } = data.data;

      // 2. Upload file trực tiếp lên Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());
      formData.append('folder', folder);
      formData.append('api_key', apiKey);

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload ảnh thất bại');
      const uploadData = await uploadRes.json();

      // 3. Cập nhật URL avatar vào Database qua Backend
      await api.put('/users/me/avatar', { avatarUrl: uploadData.secure_url });
      
      // 4. Cập nhật context để UI phản hồi ngay lập tức
      updateAvatar(uploadData.secure_url);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi tải ảnh lên');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      setShowProfileMenu(false);
    }
  };


  const selectedConv = conversations.find(c => c.id === selectedConvId);
  const convMessages = selectedConvId ? (messages[selectedConvId] ?? []) : [];
  const pinnedMessages = convMessages.filter(m => m.isPinned).slice(0, 3);
  const normalizedConversationSearch = conversationSearchQuery.trim().toLowerCase();
  const conversationSearchMatches = normalizedConversationSearch
    ? convMessages.filter(message => {
      if (message.content === '__MESSAGE_RECALLED__') return false;
      const searchableText = [
        message.content,
        message.fileName,
        message.replyTo?.content
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableText.includes(normalizedConversationSearch);
    })
    : [];
  const activeSearchMatch = conversationSearchMatches[activeSearchMatchIndex] ?? null;
  const activeImage = imageViewer ? imageViewer.images[imageViewer.index] : null;
  const imageViewerCount = imageViewer?.images.length ?? 0;
  const canNavigateImages = imageViewerCount > 1;
  const getMessageBatchKey = (message?: Message | null) => {
    if (!message) return '';
    return message.createdAt ? message.createdAt.slice(0, 16) : message.timestamp;
  };
  const isSameMessageBatch = (a?: Message | null, b?: Message | null) => Boolean(
    a
    && b
    && a.senderId === b.senderId
    && getMessageBatchKey(a) === getMessageBatchKey(b)
  );

  const openImageViewer = (message: Message, group?: Message[]) => {
    const source = (group && group.length > 0 ? group : convMessages)
      .filter(item => item.type === 'image' && item.fileUrl);
    const images = source.length > 0 ? source : [message].filter(item => item.fileUrl);
    if (images.length === 0) return;

    const index = Math.max(0, images.findIndex(item => item.id === message.id));
    setImageViewer({ images, index });
  };

  const showRelativeImage = (offset: number) => {
    setImageViewer(prev => {
      if (!prev || prev.images.length <= 1) return prev;
      const nextIndex = (prev.index + offset + prev.images.length) % prev.images.length;
      return { ...prev, index: nextIndex };
    });
  };

  const closeImageViewer = () => setImageViewer(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'TLSUNCHAT_OPEN_NOTIFICATION') return;
      if (!event.data.roomId) return;

      clearPendingAttachments();
      closeImageViewer();
      setShowInfo(false);
      setReplyTo(null);
      setSelectedConvId(event.data.roomId, event.data.messageId);
      setMobileShowChat(true);
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  }, []);

  const getPartner = (conv: Conversation) =>
    users.find(u => u.id !== currentUser.id && conv.participants.includes(u.id));

  const getConvTitle = (conv: Conversation) =>
    conv.type === 'group' ? conv.name : getPartner(conv)?.name ?? conv.name;

  const filteredConvs = conversations
    .filter(c => getConvTitle(c).toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const directChatUserIds = new Set(
    conversations
      .filter(c => c.type === 'dm')
      .flatMap(c => c.participants.filter(userId => userId !== currentUser.id))
  );

  const filteredContacts = users
    .filter(user => user.id !== currentUser.id && !directChatUserIds.has(user.id))
    .filter(user => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectConv = (id: string) => {
    clearPendingAttachments();
    closeImageViewer();
    setSelectedConvId(id);
    setMobileShowChat(true);
    setShowInfo(false);
    setReplyTo(null);
    setShowConversationSearch(false);
    setConversationSearchQuery('');
  };

  const startDirectChat = async (userId: string) => {
    clearPendingAttachments();
    closeImageViewer();
    setShowInfo(false);
    setReplyTo(null);
    setShowConversationSearch(false);
    setConversationSearchQuery('');

    const roomId = await createRoom(userId);
    if (roomId) {
      setSelectedConvId(roomId);
      setMobileShowChat(true);
    }
  };

  const handleMarkRoomUnread = () => {
    if (!selectedConv) return;
    markRoomUnread(selectedConv.id);
    setShowRoomMenu(false);
  };

  const handleOpenConversationSearch = () => {
    if (!selectedConv) return;
    setShowConversationSearch(true);
    setShowRoomMenu(false);
    setShowInfo(false);
    window.setTimeout(() => conversationSearchInputRef.current?.focus(), 0);
  };

  const handleLeaveGroup = async () => {
    if (!selectedConv || selectedConv.type !== 'group') return;

    const ok = window.confirm('Bạn chắc chắn muốn rời khỏi nhóm này?');
    if (!ok) return;

    try {
      clearPendingAttachments();
      closeImageViewer();
      setShowInfo(false);
      setReplyTo(null);
      await leaveRoom(selectedConv.id);
      setSelectedConvId(null);
      setMobileShowChat(false);
      setShowRoomMenu(false);
    } catch (error) {
      console.error('Không thể rời nhóm:', error);
      alert('Không thể rời nhóm. Vui lòng thử lại.');
    }
  };

  const scrollToMessage = (messageId: string) => {
    let target = messageRefs.current[messageId];
    if (!target) {
      const idx = convMessages.findIndex(m => m.id === messageId);
      if (idx > 0 && convMessages[idx]?.type === 'image') {
        let firstIdx = idx;
        while (
          firstIdx > 0
          && convMessages[firstIdx - 1].type === 'image'
          && convMessages[firstIdx - 1].senderId === convMessages[idx].senderId
          && convMessages[firstIdx - 1].timestamp === convMessages[idx].timestamp
        ) {
          firstIdx -= 1;
        }
        target = messageRefs.current[convMessages[firstIdx].id];
      }
    }
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);
    window.setTimeout(() => setHighlightedMessageId(null), 1600);
  };

  useEffect(() => {
    if (!selectedMessageId || convMessages.length === 0) return;
    const timer = window.setTimeout(() => scrollToMessage(selectedMessageId), 150);
    return () => window.clearTimeout(timer);
  }, [selectedMessageId, convMessages.length]);

  useEffect(() => {
    setActiveSearchMatchIndex(0);
  }, [conversationSearchQuery, selectedConvId]);

  useEffect(() => {
    if (activeSearchMatchIndex >= conversationSearchMatches.length) {
      setActiveSearchMatchIndex(0);
    }
  }, [activeSearchMatchIndex, conversationSearchMatches.length]);

  useEffect(() => {
    if (showConversationSearch) {
      window.setTimeout(() => conversationSearchInputRef.current?.focus(), 0);
    }
  }, [showConversationSearch]);

  const goToConversationSearchMatch = (offset: number) => {
    if (conversationSearchMatches.length === 0) return;
    const nextIndex = (activeSearchMatchIndex + offset + conversationSearchMatches.length) % conversationSearchMatches.length;
    setActiveSearchMatchIndex(nextIndex);
    scrollToMessage(conversationSearchMatches[nextIndex].id);
  };

  const handlePinMessage = async (message: Message) => {
    if (!message.isPinned && pinnedMessages.length >= 3) {
      alert('Mỗi hộp thoại chỉ ghim tối đa 3 tin nhắn.');
      return;
    }

    try {
      await pinMessage(message.id, !message.isPinned);
    } catch (error) {
      alert('Không thể cập nhật ghim tin nhắn. Vui lòng thử lại.');
    }
  };

  const handleRecallMessage = async (message: Message, group?: Message[]) => {
    if (message.isUploading) return;
    const messagesToRecall = group && group.length > 1 ? group : [message];
    const label = messagesToRecall.length > 1
      ? `Thu hồi ${messagesToRecall.length} ảnh trong cụm này?`
      : 'Thu hồi tin nhắn này?';

    setRecallConfirm({ messages: messagesToRecall, label });
  };

  const confirmRecall = async () => {
    if (!recallConfirm) return;
    const { messages } = recallConfirm;
    setRecallConfirm(null);
    await Promise.all(messages.filter(item => !item.isUploading).map(item => recallMessage(item.id)));
  };

  useEffect(() => {
    if (!imageViewer) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeImageViewer();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        showRelativeImage(-1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        showRelativeImage(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageViewer]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showEmojiPicker) {
        if (
          emojiPickerRef.current &&
          !emojiPickerRef.current.contains(event.target as Node) &&
          emojiButtonRef.current &&
          !emojiButtonRef.current.contains(event.target as Node)
        ) {
          setShowEmojiPicker(false);
        }
      }
      if (showRoomMenu && roomMenuRef.current && !roomMenuRef.current.contains(event.target as Node)) {
        setShowRoomMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showRoomMenu]);

  const getPinnedPreview = (message: Message) => {
    if (message.content === '__MESSAGE_RECALLED__') return 'Tin nhắn đã thu hồi';
    if (message.type === 'file') return `File: ${message.fileName || message.content}`;
    if (message.type === 'image') return 'Hình ảnh';
    if (message.type === 'video') return 'Video';
    if (message.type === 'system') return 'Tin nhắn đã thu hồi';
    return message.content;
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const files = Array.from(e.clipboardData.files || []);
    if (files.length === 0) return;
    e.preventDefault();
    addPendingFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!selectedConvId) return;
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    setIsDraggingFiles(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingFiles(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!selectedConvId) return;
    e.preventDefault();
    setIsDraggingFiles(false);
    if (e.dataTransfer.files.length > 0) {
      addPendingFiles(e.dataTransfer.files);
    }
  };

  const handleSendComposer = async () => {
    if (!selectedConvId || isUploading) return;

    const text = inputText.trim();
    const attachmentsToSend = pendingAttachments;
    if (!text && attachmentsToSend.length === 0) return;

    setInputText('');
    setReplyTo(null);
    clearPendingAttachments();
    window.setTimeout(() => inputRef.current?.focus(), 0);
    setIsUploading(true);

    try {
      if (text) {
        await sendMessage(selectedConvId, text, 'text', replyTo?.id);
      }

      await runWithConcurrency(attachmentsToSend, MAX_CONCURRENT_UPLOADS, async (item) => {
        const messageType = item.type === 'video' ? 'video' : item.type === 'file' ? 'file' : 'image';
        await sendFileMessage(selectedConvId, item.file, messageType);
      });
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra khi gửi file');
    } finally {
      setIsUploading(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  useEffect(() => {
    if (!selectedConvId) return;

    if (convMessages.length > 0) {
      const isNewRoom = lastScrolledRoomRef.current !== selectedConvId;
      const scrollBehavior = isNewRoom ? 'auto' : 'smooth';
      
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: scrollBehavior });
        if (isNewRoom) {
          lastScrolledRoomRef.current = selectedConvId;
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [convMessages.length, selectedConvId]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => () => {
    pendingAttachmentsRef.current.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }, []);

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const sidebar = (
    <aside
      className={`${mobileShowChat ? 'hidden' : 'flex'
        } md:flex flex-col w-full md:w-72 lg:w-80 border-r border-green-100 bg-green-50 flex-shrink-0`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-green-600 border-b border-white/10 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <span className="text-white truncate tracking-wide" style={{ fontWeight: 700, fontSize: '1rem' }}>
            InternalChat
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/85 hover:text-white transition-colors"
            title="Tạo nhóm mới"
          >
            <Plus className="w-4 h-4" />
          </button>
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/85 hover:text-white transition-colors"
              title="Quản trị"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowProfileMenu(prev => !prev)}
              className="relative p-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Tai khoan"
            >
                <div className="relative">
                  <img
                    src={currentUser.avatar || '/placeholder.png'}
                    alt={currentUser.name}
                    className={`w-9 h-9 rounded-full object-cover border-2 border-white/70 shadow-sm transition-opacity ${isUploadingAvatar ? 'opacity-50' : ''}`}
                  />
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${STATUS_COLOR[currentUser.status]} rounded-full border-2 border-green-600`} />
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-white text-green-600 shadow-sm flex items-center justify-center">
                    <ImageIcon className="w-2.5 h-2.5" />
                  </span>
                </div>
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 w-44 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-gray-800 truncate" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {currentUser.name}
                  </p>
                  <p className="text-gray-400 truncate" style={{ fontSize: '0.7rem' }}>
                    {currentUser.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-600 transition-colors"
                  style={{ fontSize: '0.82rem' }}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Đổi Avatar
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={avatarInputRef}
                  onChange={handleAvatarUpload}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-600 transition-colors"
                  style={{ fontSize: '0.82rem' }}
                >
                  <Settings className="w-3.5 h-3.5" /> Cài đặt
                </button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-600 transition-colors" style={{ fontSize: '0.82rem' }}>
                  <Bell className="w-3.5 h-3.5" /> Thông báo
                </button>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-500 transition-colors"
                  style={{ fontSize: '0.82rem' }}
                >
                  <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm hội thoại..."
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-green-100 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>

      {/* Conversations */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        users={users}
        currentUser={currentUser}
        onCreate={createGroupChat}
      />
      <div
        className="flex-1 overflow-y-auto"
        onClick={() => setShowProfileMenu(false)}
      >
        {filteredConvs.length === 0 && filteredContacts.length === 0 ? (
          <div className="text-center text-gray-400 py-8" style={{ fontSize: '0.85rem' }}>
            Không tìm thấy hội thoại
          </div>
        ) : (
          <>
          {filteredConvs.map(conv => {
            const isActive = conv.id === selectedConvId;
            const partner = getPartner(conv);
            const title = getConvTitle(conv);

            return (
              <button
                key={conv.id}
                onClick={() => selectConv(conv.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 transition-colors text-left ${isActive
                  ? 'md:bg-green-100 md:border-r-2 md:border-green-500'
                  : 'md:hover:bg-green-100/60'
                  }`}
              >
                {/* Avatar */}
                {conv.type === 'group' ? (
                  <GroupAvatar size="md" />
                ) : partner ? (
                  <Avatar user={partner} size="md" showStatus />
                ) : null}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-gray-800 truncate"
                      style={{ fontSize: '0.88rem', fontWeight: conv.unread > 0 ? 700 : 500 }}
                    >
                      {title}
                    </span>
                    <span
                      className={`flex-shrink-0 ml-1 ${conv.unread > 0 ? 'text-green-600' : 'text-gray-400'}`}
                      style={{ fontSize: '0.68rem', fontWeight: conv.unread > 0 ? 600 : 400 }}
                    >
                      {conv.lastTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p
                      className={`truncate ${conv.unread > 0 ? 'text-gray-700' : 'text-gray-400'}`}
                      style={{ fontSize: '0.78rem', fontWeight: conv.unread > 0 ? 500 : 400 }}
                    >
                      {conv.isTyping ? (
                        <span className="text-green-500 italic">đang soạn tin nhắn...</span>
                      ) : (
                        conv.lastMessage
                      )}
                    </p>
                    {conv.unread > 0 && (
                      <span
                        className="ml-1.5 flex-shrink-0 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                        style={{ fontSize: '0.65rem', fontWeight: 700 }}
                      >
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredContacts.length > 0 && (
            <div className="px-3 pt-3 pb-1 text-gray-400 uppercase tracking-wide" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
              Đồng nghiệp
            </div>
          )}
          {filteredContacts.map(user => (
            <button
              key={user.id}
              onClick={() => startDirectChat(user.id)}
              className="w-full flex items-center gap-3 px-3 py-3 transition-colors text-left md:hover:bg-green-100/60"
            >
              <Avatar user={user} size="md" showStatus />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className="text-gray-800 truncate"
                    style={{ fontSize: '0.88rem', fontWeight: 500 }}
                  >
                    {user.name}
                  </span>
                  <span className="flex-shrink-0 ml-1 text-green-600" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                    Mới
                  </span>
                </div>
                <p className="truncate text-gray-400 mt-0.5" style={{ fontSize: '0.78rem', fontWeight: 400 }}>
                  Bắt đầu trò chuyện
                </p>
              </div>
            </button>
          ))}
          </>
        )}
      </div>

      {/* Sidebar Footer - Nút Đăng Xuất rõ ràng */}
      <div className="p-3 border-t border-green-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar user={currentUser} size="sm" showStatus />
          <div className="flex flex-col">
            <span className="text-gray-800" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser.name}</span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );

  // ── Empty state ──────────────────────────────────────────────────────────
  const emptyState = (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <MessageCircle className="w-10 h-10 text-green-400" />
      </div>
      <h3 className="text-gray-700 mb-2" style={{ fontWeight: 600, fontSize: '1.1rem' }}>
        Chào mừng, {currentUser.name.split(' ').pop()}! 👋
      </h3>
      <p className="text-gray-400 max-w-xs" style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
        Chọn một hội thoại ở bên trái để bắt đầu trò chuyện cùng đồng nghiệp
      </p>
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        {['🔒 Bảo mật', '⚡ Realtime', '📎 Chia sẻ file', '🔔 Thông báo'].map(f => (
          <span
            key={f}
            className="px-3 py-1.5 bg-green-50 border border-green-100 text-green-700 rounded-full"
            style={{ fontSize: '0.78rem', fontWeight: 500 }}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );

  // ── Chat area ────────────────────────────────────────────────────────────
  const partner = selectedConv ? getPartner(selectedConv) : undefined;

  const chatArea = selectedConv ? (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-3 py-3 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm">
        {/* Back button (mobile) */}
        <button
          onClick={() => setMobileShowChat(false)}
          className="md:hidden p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        {selectedConv.type === 'group' ? (
          <GroupAvatar size="md" />
        ) : partner ? (
          <Avatar user={partner} size="md" showStatus />
        ) : null}

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-800 truncate" style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {getConvTitle(selectedConv)}
          </h3>
          {selectedConv.type === 'dm' && partner && (
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLOR[partner.status]}`} />
              <span className="text-gray-400" style={{ fontSize: '0.72rem' }}>
                {STATUS_LABEL[partner.status]}
              </span>
            </div>
          )}
          {selectedConv.type === 'group' && (
            <span className="text-gray-400" style={{ fontSize: '0.72rem' }}>
              {selectedConv.participants.length} thành viên
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-full transition-colors ${showInfo
              ? 'bg-green-100 text-green-600'
              : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
              }`}
            title="Nội dung chia sẻ"
          >
            <Info className="w-4 h-4" />
          </button>
          <div className="relative" ref={roomMenuRef}>
            <button
              type="button"
              onClick={() => setShowRoomMenu(prev => !prev)}
              className={`p-2 rounded-full transition-colors ${showRoomMenu
                ? 'bg-green-100 text-green-600'
                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
              title="Tùy chọn cuộc trò chuyện"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showRoomMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-200/60 py-1.5 z-50 overflow-hidden">
                <button
                  type="button"
                  onClick={handleMarkRoomUnread}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ fontSize: '0.82rem', fontWeight: 500 }}
                >
                  <Bell className="w-4 h-4 text-gray-400" />
                  <span>Đánh dấu chưa đọc</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenConversationSearch}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ fontSize: '0.82rem', fontWeight: 500 }}
                >
                  <Search className="w-4 h-4 text-gray-400" />
                  <span>Tìm trong cuộc trò chuyện</span>
                </button>
                {selectedConv.type === 'group' && (
                  <button
                    type="button"
                    onClick={handleLeaveGroup}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors"
                    style={{ fontSize: '0.82rem', fontWeight: 600 }}
                  >
                    <UserMinus className="w-4 h-4 text-red-500" />
                    <span>Rời khỏi nhóm</span>
                  </button>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showConversationSearch && (
        <div className="px-4 py-2 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={conversationSearchInputRef}
              value={conversationSearchQuery}
              onChange={event => setConversationSearchQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  goToConversationSearchMatch(event.shiftKey ? -1 : 1);
                }
                if (event.key === 'Escape') {
                  setShowConversationSearch(false);
                  setConversationSearchQuery('');
                }
              }}
              placeholder="Tìm trong cuộc trò chuyện..."
              className="flex-1 min-w-0 bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
              style={{ fontSize: '0.86rem' }}
            />
            {conversationSearchQuery && (
              <span className="text-gray-400 tabular-nums flex-shrink-0" style={{ fontSize: '0.72rem' }}>
                {conversationSearchMatches.length > 0 ? `${activeSearchMatchIndex + 1}/${conversationSearchMatches.length}` : '0'}
              </span>
            )}
            <button
              type="button"
              onClick={() => goToConversationSearchMatch(-1)}
              disabled={conversationSearchMatches.length === 0}
              className="p-1.5 rounded-full text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              title="Kết quả trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => goToConversationSearchMatch(1)}
              disabled={conversationSearchMatches.length === 0}
              className="p-1.5 rounded-full text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              title="Kết quả tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConversationSearch(false);
                setConversationSearchQuery('');
              }}
              className="p-1.5 rounded-full text-gray-400 hover:bg-white hover:text-gray-700 transition-colors"
              title="Đóng tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Body: messages + optional info panel */}
      <div className="flex flex-1 min-h-0">
        {/* Messages + Input */}
        <div
          className={`relative flex flex-col flex-1 min-w-0 ${showInfo ? 'hidden sm:flex' : 'flex'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDraggingFiles && (
            <div className="absolute inset-0 z-30 bg-green-50/90 border-2 border-dashed border-green-400 flex items-center justify-center pointer-events-none">
              <div className="bg-white border border-green-100 rounded-xl shadow-sm px-5 py-4 flex items-center gap-3 text-green-700">
                <Paperclip className="w-5 h-5" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Thả file vào đây</span>
              </div>
            </div>
          )}

          {/* Pinned Messages Banner */}
          {pinnedMessages.length > 0 && (
            <div className="bg-white border-b border-green-100 px-3 py-2 flex flex-col gap-1 shadow-sm">
              {pinnedMessages.map(pinned => (
                <div
                  key={`pin-${pinned.id}`}
                  onClick={() => scrollToMessage(pinned.id)}
                  className="flex items-center justify-between text-sm rounded-xl border border-green-100 bg-green-50 px-2.5 py-2 cursor-pointer hover:bg-green-100 hover:border-green-300 transition-colors"
                  title="Di toi tin ghim"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    <span className="text-gray-800 font-medium whitespace-nowrap">Tin ghim:</span>
                    <span className="text-gray-600 truncate">
                      {getPinnedPreview(pinned)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pinMessage(pinned.id, false).catch(() => {
                        alert('Không thể bỏ ghim tin nhắn. Vui lòng thử lại.');
                      });
                    }}
                    className="text-gray-400 hover:text-green-600 flex-shrink-0 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-3 bg-gray-50">
            {/* Date separator */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-gray-400 flex-shrink-0" style={{ fontSize: '0.72rem' }}>
                Hôm nay
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {convMessages.map((msg, idx) => {
              const isMine = msg.senderId === currentUser.id;
              const sender = users.find(u => u.id === msg.senderId);
              const previousMsg = idx > 0 ? convMessages[idx - 1] : null;
              const isGroupedImageChild = msg.type === 'image'
                && previousMsg?.type === 'image'
                && isSameMessageBatch(msg, previousMsg);
              const isGroupedRecalledChild = msg.content === '__MESSAGE_RECALLED__'
                && previousMsg?.content === '__MESSAGE_RECALLED__'
                && isSameMessageBatch(msg, previousMsg);
              if (isGroupedImageChild || isGroupedRecalledChild) return null;

              const imageGroup = msg.type === 'image'
                ? convMessages.slice(idx).filter((item, groupIdx) => {
                  if (item.type !== 'image' || !isSameMessageBatch(item, msg)) return false;
                  return convMessages.slice(idx, idx + groupIdx).every(prev => prev.type === 'image' && isSameMessageBatch(prev, msg));
                })
                : undefined;
              const replyMsg = msg.replyTo ? ({
                id: msg.replyTo.id,
                conversationId: msg.conversationId,
                senderId: '',
                content: msg.replyTo.content,
                type: msg.replyTo.type as Message['type'],
                timestamp: '',
                status: 'seen',
                userName: msg.replyTo.userName
              } as Message & { userName: string }) : msg.replyToId
                ? convMessages.find(m => m.id === msg.replyToId)
                : undefined;

              const prevMsg = idx > 0 ? convMessages[idx - 1] : null;
              const showDateSep =
                idx > 0 && prevMsg && msg.senderId !== prevMsg.senderId && idx === 4;
              const isActiveSearchMatch = activeSearchMatch?.id === msg.id;

              return (
                <div
                  key={msg.id}
                  ref={(el) => { messageRefs.current[msg.id] = el; }}
                  className={`rounded-2xl transition-colors duration-500 ${
                    highlightedMessageId === msg.id || isActiveSearchMatch ? 'bg-yellow-100/80' : ''
                  }`}
                >
                  {showDateSep && (
                    <div className="flex items-center gap-2 my-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-gray-400" style={{ fontSize: '0.72rem' }}>
                        08:30
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                  <MessageBubble
                    msg={msg}
                    isMine={isMine}
                    sender={sender}
                    isGroup={selectedConv.type === 'group'}
                    replyMsg={replyMsg}
                    imageGroup={imageGroup}
                    onReply={setReplyTo}
                    onPin={handlePinMessage}
                    onReact={(m, emoji) => reactToMessage(m.id, emoji)}
                    onRecall={handleRecallMessage}
                    onOpenImage={openImageViewer}
                    onLinkClick={setPendingExternalLink}
                  />
                </div>
              );
            })}

            {/* Typing indicator */}
            {selectedConv.isTyping && partner && (
              <TypingIndicator user={partner} />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Reply bar */}
          {replyTo && (
            <div className="px-3 py-2 bg-green-50 border-t border-green-100 flex items-center gap-2">
              <div className="flex-1 border-l-2 border-green-500 pl-2">
                <p className="text-green-600" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                  Trả lời{' '}
                  {replyTo.senderId === currentUser.id ? 'chính bạn' : users.find(u => u.id === replyTo.senderId)?.name}
                </p>
                <p className="text-gray-500 truncate" style={{ fontSize: '0.75rem' }}>
                  {replyTo.type === 'file' ? `📎 ${replyTo.fileName}` : replyTo.content}
                </p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="p-1 rounded-full hover:bg-gray-200 text-gray-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {pendingAttachments.length > 0 && (
            <div className="px-3 py-2 bg-white border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  {pendingAttachments.length} file sẵn sàng gửi
                </span>
                <button
                  onClick={clearPendingAttachments}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  style={{ fontSize: '0.72rem', fontWeight: 600 }}
                >
                  Xóa tất cả
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pendingAttachments.map(item => {
                  const iconStyle = getFileIcon(item.file.name);
                  return (
                    <div
                      key={item.id}
                      className="relative w-28 h-24 flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden"
                    >
                      {item.type === 'image' && item.previewUrl ? (
                        <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                      ) : item.type === 'video' && item.previewUrl ? (
                        <div className="relative w-full h-full bg-black">
                          <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Video className="w-7 h-7 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-2">
                          <div className={`${iconStyle.bg} p-2 rounded-lg`}>
                            <FileText className={`w-5 h-5 ${iconStyle.color}`} />
                          </div>
                          <span className="text-gray-700 truncate w-full text-center" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                            {item.file.name}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => removePendingAttachment(item.id)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
                        title="Bỏ file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="relative px-3 py-2.5 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAttachmentInput}
              className="hidden"
              accept={ACCEPTED_ATTACHMENT_TYPES}
              multiple
            />

            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-[calc(100%+10px)] left-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-100"
              >
                <EmojiPicker
                  onEmojiClick={(e) => {
                    setInputText(prev => prev + e.emoji);
                  }}
                />
              </div>
            )}
            <button
              ref={emojiButtonRef}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-full transition-colors flex-shrink-0 ${showEmojiPicker ? 'bg-green-100 text-green-500' : 'hover:bg-gray-100 text-gray-400 hover:text-green-500'}`}
            >
              <Smile className="w-5 h-5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`p-2 rounded-full transition-colors flex-shrink-0 ${isUploading ? 'text-green-300 animate-pulse' : 'hover:bg-gray-100 text-gray-400 hover:text-green-500'}`}
              title="Đính kèm file (Tối đa 40MB)"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && selectedConvId && (inputText.trim() || pendingAttachments.length > 0)) {
                  e.preventDefault();
                  handleSendComposer();
                  setShowEmojiPicker(false);
                }
              }}
              onFocus={() => setShowEmojiPicker(false)}
              placeholder={isUploading ? "Đang tải file lên..." : "Nhập tin nhắn..."}
              disabled={isUploading}
              className="flex-1 min-w-0 bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white transition-all disabled:opacity-50"
              style={{ fontSize: '16px' }}
            />
            <button
              onClick={handleSendComposer}
              disabled={isUploading || (!inputText.trim() && pendingAttachments.length === 0)}
              className={`p-2.5 rounded-full flex-shrink-0 transition-all disabled:cursor-not-allowed ${inputText.trim() || pendingAttachments.length > 0
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-200'
                : 'bg-gray-100 text-gray-300'
                }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media filter panel */}
        {showInfo && (
          <div className="w-full sm:w-72 flex-shrink-0 border-l border-gray-100">
            <MediaFilterPanel
              tab={mediaTab}
              onTabChange={setMediaTab}
              onClose={() => setShowInfo(false)}
              messages={convMessages}
              users={users}
              onOpenImage={openImageViewer}
              onLinkClick={setPendingExternalLink}
            />
          </div>
        )}
      </div>
    </div>
  ) : (
    emptyState
  );

  return (
    <div
      className="flex h-full bg-white overflow-hidden"
      onClick={() => setShowProfileMenu(false)}
    >
      {sidebar}
      <main
        className={`${mobileShowChat ? 'flex' : 'hidden'
          } md:flex flex-col flex-1 min-w-0`}
      >
        {chatArea}
      </main>
      {activeImage?.fileUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
          onClick={() => {
            if (imageTouchMovedRef.current) {
              imageTouchMovedRef.current = false;
              return;
            }
            closeImageViewer();
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            imageTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(e) => {
            const start = imageTouchStartRef.current;
            const touch = e.changedTouches[0];
            imageTouchStartRef.current = null;
            if (!start || !touch || !canNavigateImages) return;

            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.3) return;

            imageTouchMovedRef.current = true;
            showRelativeImage(dx < 0 ? 1 : -1);
            window.setTimeout(() => {
              imageTouchMovedRef.current = false;
            }, 350);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeImageViewer();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Dong"
          >
            <X className="w-5 h-5" />
          </button>

          {canNavigateImages && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showRelativeImage(-1);
                }}
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/12 text-white hover:bg-white/25 active:bg-white/30 transition-colors"
                title="Anh truoc"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showRelativeImage(1);
                }}
                className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/12 text-white hover:bg-white/25 active:bg-white/30 transition-colors"
                title="Anh tiep theo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/45 text-white" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                {imageViewer!.index + 1} / {imageViewerCount}
              </div>
            </>
          )}

          <div
            className="max-w-full max-h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              key={activeImage.id}
              src={activeImage.fileUrl}
              alt={activeImage.fileName || 'Hinh anh'}
              className="max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-8rem)] max-h-[calc(100vh-7rem)] object-contain rounded-lg shadow-2xl select-none"
              draggable={false}
            />
          </div>
          {activeImage.fileId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadAttachment(activeImage.fileId, activeImage.fileName || 'image');
              }}
              className="absolute bottom-4 right-4 px-3 py-2 rounded-lg bg-white text-gray-800 hover:bg-gray-100 flex items-center gap-2 shadow-lg"
              style={{ fontSize: '0.85rem', fontWeight: 600 }}
            >
              <Download className="w-4 h-4" />
              Tải xuống
            </button>
          )}
        </div>
      )}

      {/* Recall Confirm Modal */}
      {recallConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-transform duration-300 scale-100 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-800 font-bold text-lg">Xác nhận thu hồi</h3>
              <button onClick={() => setRecallConfirm(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6 font-medium">{recallConfirm.label}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRecallConfirm(null)}
                className="px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmRecall}
                className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 shadow-md shadow-red-200 transition-all"
              >
                Thu hồi
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {pendingExternalLink && (
        <div
          className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4 transition-opacity"
          onClick={() => setPendingExternalLink(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-transform duration-300 scale-100 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-gray-900 font-bold text-lg">Cảnh báo liên kết ngoài</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Bạn đang rời khỏi ứng dụng để truy cập một liên kết ngoài. Hãy chắc chắn rằng bạn tin tưởng liên kết này.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-6">
              <span className="text-xs text-gray-400 font-semibold uppercase block mb-1">Liên kết đích:</span>
              <p className="text-gray-700 text-sm break-all font-medium select-all hover:text-green-600 transition-colors">
                {pendingExternalLink}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingExternalLink(null)}
                className="px-4 py-2 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
                style={{ fontSize: '0.9rem' }}
              >
                Quay lại
              </button>
              <a
                href={pendingExternalLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPendingExternalLink(null)}
                className="px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 shadow-md shadow-green-200 transition-all flex items-center justify-center"
                style={{ fontSize: '0.9rem' }}
              >
                Tiếp tục
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

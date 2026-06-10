export type UserRole = 'admin' | 'member';
export type UserStatus = 'online' | 'offline' | 'busy';
export type MessageType = 'text' | 'image' | 'video' | 'file' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'seen';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  initials: string;
  color: string;
  avatar?: string;
  isActive?: boolean;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  name: string;
  participants: string[];
  lastMessage: string;
  lastTime: string;
  updatedAt?: number;
  unread: number;
  isPinned?: boolean;
  isTyping?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  timestamp: string;
  createdAt?: string;
  status: MessageStatus;
  reactions?: { emoji: string; userIds: string[] }[];
  replyToId?: string;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  fileId?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadError?: string;
  isPinned?: boolean;
  replyTo?: { id: string; content: string; type: string; userName: string };
}

import { User, Conversation, Message } from '../types';

export const USERS: User[] = [
  { id: 'u1', name: 'Nam Nguyễn', email: 'nam@company.vn', role: 'admin', status: 'online', initials: 'NN', color: 'bg-green-600' },
  { id: 'u2', name: 'Hoa Trần', email: 'hoa@company.vn', role: 'member', status: 'online', initials: 'HT', color: 'bg-blue-500' },
];

export const CONVERSATIONS: Conversation[] = [
  { id: 'c1', type: 'dm', name: 'Hoa Trần', participants: ['u1', 'u2'], lastMessage: 'Em sẽ review ngay ạ', lastTime: '10:35', unread: 0 },
];

export const ALL_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: 'm1', conversationId: 'c1', senderId: 'u2', content: 'Anh ơi, em đã upload báo cáo', type: 'text', timestamp: '10:28', status: 'seen' },
  ],
};

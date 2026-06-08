/// <reference types="vite/client" />
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../lib/api';
import { registerPushNotifications } from '../lib/pushNotifications';
import type { User, Conversation, Message } from '../types/index';

const getDirectFileUrl = (fileId: string) => {
  const token = localStorage.getItem('token') || '';
  return `${import.meta.env.VITE_API_URL}/files/${fileId}/download-direct?token=${encodeURIComponent(token)}`;
};

const isExternalUrl = (value?: string) => /^https?:\/\//i.test(value || '');

const getFilePreviewUrl = (file: any) => {
  const url = file?.file_url || file?.secure_url || file?.url || file?.r2_key;
  return isExternalUrl(url) ? url : getDirectFileUrl(file.id);
};

const uploadWithProgress = (
  url: string,
  options: {
    method: 'POST' | 'PUT';
    body: XMLHttpRequestBodyInit;
    headers?: Record<string, string>;
    onProgress: (progress: number) => void;
  }
) => new Promise<any>((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open(options.method, url);

  Object.entries(options.headers || {}).forEach(([key, value]) => {
    xhr.setRequestHeader(key, value);
  });

  xhr.upload.onprogress = (event) => {
    if (!event.lengthComputable) return;
    options.onProgress(Math.round((event.loaded / event.total) * 100));
  };

  xhr.onload = () => {
    if (xhr.status < 200 || xhr.status >= 300) {
      reject(new Error(xhr.responseText || 'Upload failed'));
      return;
    }

    const contentType = xhr.getResponseHeader('content-type') || '';
    if (contentType.includes('application/json')) {
      resolve(JSON.parse(xhr.responseText));
      return;
    }
    resolve(xhr.responseText);
  };

  xhr.onerror = () => reject(new Error('Upload failed'));
  xhr.send(options.body);
});

const notificationAudio = new Audio('/notnew.mp3');

const formatReactions = (reactions?: Record<string, string> | null): Message['reactions'] => {
  if (!reactions || typeof reactions !== 'object') return undefined;

  return Object.entries(reactions).reduce((acc: { emoji: string; userIds: string[] }[], [userId, emoji]) => {
    const existing = acc.find(x => x.emoji === emoji);
    if (existing) existing.userIds.push(userId);
    else acc.push({ emoji, userIds: [userId] });
    return acc;
  }, []);
};

const getFirstFile = (files: any) => Array.isArray(files) ? files[0] : files;

const formatMessageFromApi = (m: any, status: Message['status'] = 'sent'): Message => {
  const file = getFirstFile(m.files);
  const validReply = Boolean(m.reply_to?.id && (m.reply_to.content || m.reply_to.type));

  return {
    id: m.id,
    conversationId: m.room_id,
    senderId: m.sender_id,
    content: m.content,
    type: m.type,
    timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: m.created_at,
    status,
    fileId: file?.id,
    fileName: file?.original_name,
    fileSize: file?.file_size ? `${(file.file_size / 1024 / 1024).toFixed(2)} MB` : undefined,
    fileUrl: file ? getFilePreviewUrl(file) : undefined,
    isPinned: Boolean(m.is_pinned),
    reactions: formatReactions(m.reactions),
    replyToId: validReply ? (m.reply_to_id || m.reply_to?.id) : undefined,
    replyTo: m.content === '__MESSAGE_RECALLED__' || !validReply ? undefined : {
      id: m.reply_to.id,
      content: m.reply_to.content,
      type: m.reply_to.type,
      userName: m.reply_to.users?.name || ''
    }
  };
};

export function useChat(currentUser: User | null, selectedConvId: string | null) {
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const socketRef = useRef<Socket | null>(null);

  const selectedConvIdRef = useRef(selectedConvId);
  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  const usersRef = useRef<User[]>([]);
  const onlineUserIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // 1. Khởi tạo Socket.io và tải danh sách ban đầu
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Xin quyền Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      registerPushNotifications().catch(error => {
        console.warn('Push notification registration failed:', error);
      });
    }

    // Connect socket
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token }
    });

    socketRef.current.on('force_logout', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('requirePasswordChange');
      window.location.href = '/login';
    });

    socketRef.current.on('connect', () => {
      console.log('Đã kết nối Socket.io');
    });

    socketRef.current.on('presence_snapshot', (data: { onlineUserIds: string[] }) => {
      const onlineIds = new Set(data.onlineUserIds || []);
      onlineUserIdsRef.current = onlineIds;
      setUsers(prev => prev.map(user => ({
        ...user,
        status: onlineIds.has(user.id) ? 'online' : 'offline'
      })));
    });

    socketRef.current.on('presence_update', (data: { userId: string; status: 'online' | 'offline' }) => {
      if (data.status === 'online') {
        onlineUserIdsRef.current.add(data.userId);
      } else {
        onlineUserIdsRef.current.delete(data.userId);
      }

      setUsers(prev => prev.map(user => user.id === data.userId ? {
        ...user,
        status: data.status
      } : user));
    });

    socketRef.current.on('receive_message', (rawMsg: any) => {
      const newMsg = formatMessageFromApi(rawMsg, 'sent');

      setMessages(prev => {
        const roomMsgs = prev[newMsg.conversationId] || [];
        // Lọc trùng lặp id nếu socket bị gọi 2 lần do mạng
        if (roomMsgs.some(m => m.id === newMsg.id)) return prev;
        
        // 🔔 Hiển thị thông báo & Phát âm thanh
        if (currentUser && newMsg.senderId !== currentUser.id) {
          const isNotFocused = document.hidden || selectedConvIdRef.current !== newMsg.conversationId;
          if (isNotFocused && 'Notification' in window && Notification.permission === 'granted') {
            const sender = usersRef.current.find(u => u.id === newMsg.senderId);
            const senderName = sender?.name || 'Ai đó';
            const body = newMsg.type === 'file' ? '📎 Gửi một tệp tin' : newMsg.type === 'image' ? '🖼️ Gửi một hình ảnh' : newMsg.content;
            
            notificationAudio.play().catch(e => console.log('Không thể phát âm thanh:', e));
            
            const notification = new Notification(`Tin nhắn từ ${senderName}`, {
              body,
              icon: '/pwa-192x192.png',
            });
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }
        }

        return {
          ...prev,
          [newMsg.conversationId]: [...roomMsgs, newMsg]
        };
      });
      
      // Update unread and last message in conversations
      setConversations(prevConvs => {
        const exists = prevConvs.some(c => c.id === newMsg.conversationId);
        
        // Nếu nhận tin nhắn từ phòng mới toanh chưa có trong list, tải lại danh sách phòng
        if (!exists) {
          api.get('/chat/rooms').then(res => {
            const formattedRooms = res.data.data.rooms.map((r: any) => {
              const room = r.rooms;
              const participants = room.room_members?.map((m: any) => m.user_id) || [];
              const isNewRoom = room.id === newMsg.conversationId;
              const isSelected = room.id === selectedConvIdRef.current;
              
              let lastMsgText = '...';
              if (isNewRoom) {
                if (newMsg.content === '__MESSAGE_RECALLED__') lastMsgText = 'Tin nhắn đã bị thu hồi';
                else {
                  lastMsgText = newMsg.type === 'file' ? '📎 File' : newMsg.type === 'image' ? '🖼️ Hình ảnh' : newMsg.content;
                  if (newMsg.senderId === currentUser?.id) lastMsgText = `Bạn: ${lastMsgText}`;
                }
              }

              return {
                id: room.id,
                type: room.type === 'direct' ? 'dm' : 'group',
                name: room.name || 'Unnamed',
                participants,
                lastMessage: lastMsgText,
                lastTime: isNewRoom ? newMsg.timestamp : '',
                unread: isNewRoom && !isSelected ? 1 : 0,
                isPinned: r.is_pinned || false
              };
            });
            setConversations(formattedRooms);
          });
          return prevConvs;
        }

        return prevConvs.map(c => {
          if (c.id === newMsg.conversationId) {
            const isSelected = c.id === selectedConvIdRef.current;
            let lastMsgText = '';
            if (newMsg.content === '__MESSAGE_RECALLED__') lastMsgText = 'Tin nhắn đã bị thu hồi';
            else {
              lastMsgText = newMsg.type === 'file' ? `📎 File` : newMsg.type === 'image' ? '🖼️ Hình ảnh' : newMsg.content;
              if (newMsg.senderId === currentUser?.id) lastMsgText = `Bạn: ${lastMsgText}`;
            }

            return {
              ...c,
              lastMessage: lastMsgText,
              lastTime: newMsg.timestamp,
              updatedAt: Date.now(),
              unread: isSelected ? 0 : c.unread + 1
            };
          }
          return c;
        });
      });
    });

    socketRef.current.on('update_message', (data: any) => {
      setMessages(prev => {
        const newPrev = { ...prev };
        for (const roomId in newPrev) {
          newPrev[roomId] = newPrev[roomId].map(m => m.id === data.messageId ? {
            ...m,
            fileId: data.file.id,
            fileName: data.file.original_name,
            fileSize: `${(data.file.file_size / 1024 / 1024).toFixed(2)} MB`,
            fileUrl: getFilePreviewUrl(data.file)
          } : m);
        }
        return newPrev;
      });
    });

    socketRef.current.on('message_pinned', (data: { messageId: string; isPinned: boolean }) => {
      setMessages(prev => {
        const newPrev = { ...prev };
        for (const roomId in newPrev) {
          newPrev[roomId] = newPrev[roomId].map(m => m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m);
        }
        return newPrev;
      });
    });

    socketRef.current.on('message_reacted', (data: { messageId: string; reactions: Record<string, string> }) => {
      setMessages(prev => {
        const newPrev = { ...prev };
        for (const roomId in newPrev) {
          newPrev[roomId] = newPrev[roomId].map(m => {
            if (m.id === data.messageId) {
              return { ...m, reactions: formatReactions(data.reactions) };
            }
            return m;
          });
        }
        return newPrev;
      });
    });

    socketRef.current.on('message_recalled', (data: { messageId: string }) => {
      setMessages(prev => {
        const newPrev = { ...prev };
        for (const roomId in newPrev) {
          newPrev[roomId] = newPrev[roomId].map(m => m.id === data.messageId ? {
            ...m,
            content: '__MESSAGE_RECALLED__',
            type: 'text',
            fileId: undefined,
            fileName: undefined,
            fileSize: undefined,
            fileUrl: undefined,
            isPinned: false,
            reactions: undefined,
            replyToId: undefined,
            replyTo: undefined
          } : m);
        }
        return newPrev;
      });

      // Cập nhật lại list phòng để Sidebar hiển thị đúng tin nhắn cuối cùng bị thu hồi
      api.get('/chat/rooms').then(res => {
        const rawRooms = res.data.data.rooms;
        const formattedRooms: Conversation[] = rawRooms.map((r: any) => {
          const room = r.rooms;
          const participants = room.room_members?.map((m: any) => m.user_id) || [];
          const lastMsgObj = r.last_message;
          let lastMsgText = 'Bắt đầu trò chuyện...';
          let lastTimeText = '';
          let updatedAt = 0;
          if (lastMsgObj) {
            if (lastMsgObj.content === '__MESSAGE_RECALLED__') {
              lastMsgText = 'Tin nhắn đã bị thu hồi';
            } else {
              lastMsgText = lastMsgObj.type === 'file' ? '📎 File' : lastMsgObj.type === 'image' ? '🖼️ Hình ảnh' : lastMsgObj.content;
              if (lastMsgObj.sender_id === currentUser?.id) {
                lastMsgText = `Bạn: ${lastMsgText}`;
              }
            }
            const msgDate = new Date(lastMsgObj.created_at);
            lastTimeText = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            updatedAt = msgDate.getTime();
          }
          return {
            id: room.id,
            type: room.type === 'direct' ? 'dm' : 'group',
            name: room.name || 'Unnamed',
            participants,
            lastMessage: lastMsgText,
            lastTime: lastTimeText,
            updatedAt,
            unread: 0,
            isPinned: r.is_pinned || false
          };
        });
        setConversations(prev => formattedRooms.map(nr => {
          const old = prev.find(p => p.id === nr.id);
          return { ...nr, unread: old ? old.unread : 0 };
        }));
      }).catch(err => console.error('Failed to reload rooms after recall', err));
    });

    socketRef.current.on('group_created', (newRoom: any) => {
      // Khi có nhóm mới tạo, fetch lại danh sách nhóm
      api.get('/chat/rooms').then(res => {
        const rawRooms = res.data.data.rooms;
        const formattedRooms: Conversation[] = rawRooms.map((r: any) => {
          // Re-use logic từ fetch ban đầu
          const room = r.rooms;
          const participants = room.room_members?.map((m: any) => m.user_id) || [];
          const lastMsgObj = r.last_message;
          let lastMsgText = 'Bắt đầu trò chuyện...';
          let lastTimeText = '';
          let updatedAt = 0;
          if (lastMsgObj) {
            if (lastMsgObj.content === '__MESSAGE_RECALLED__') {
              lastMsgText = 'Tin nhắn đã bị thu hồi';
            } else {
              lastMsgText = lastMsgObj.type === 'file' ? '📎 File' : lastMsgObj.type === 'image' ? '🖼️ Hình ảnh' : lastMsgObj.content;
              if (lastMsgObj.sender_id === currentUser?.id) {
                lastMsgText = `Bạn: ${lastMsgText}`;
              }
            }
            const msgDate = new Date(lastMsgObj.created_at);
            lastTimeText = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            updatedAt = msgDate.getTime();
          }
          return {
            id: room.id,
            type: room.type === 'direct' ? 'dm' : 'group',
            name: room.name || 'Unnamed',
            participants,
            lastMessage: lastMsgText,
            lastTime: lastTimeText,
            updatedAt,
            unread: 0,
            isPinned: r.is_pinned || false
          };
        });
        setConversations(prev => formattedRooms.map(nr => {
          const old = prev.find(p => p.id === nr.id);
          return { ...nr, unread: old ? old.unread : 0 };
        }));
      }).catch(err => console.error('Failed to reload rooms', err));
    });

    // Tải danh sách Users
    api.get('/users').then(res => {
      const formattedUsers = res.data.data.users.map((u: any) => ({
        ...u,
        avatar: u.avatar || '/placeholder.png',
        status: onlineUserIdsRef.current.has(u.id) ? 'online' : 'offline',
        initials: u.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
        color: 'bg-green-600'
      }));
      setUsers(formattedUsers);
    });

    // Tải danh sách Rooms
    api.get('/chat/rooms').then(res => {
      const formattedRooms = res.data.data.rooms.map((r: any) => {
        const room = r.rooms;
        const participants = room.room_members?.map((m: any) => m.user_id) || [];
        const lastMsgObj = r.last_message;
        let lastMsgText = 'Bắt đầu trò chuyện...';
        let lastTimeText = '';
        let updatedAt = 0;
        
        if (lastMsgObj) {
          if (lastMsgObj.content === '__MESSAGE_RECALLED__') {
            lastMsgText = 'Tin nhắn đã bị thu hồi';
          } else {
            lastMsgText = lastMsgObj.type === 'file' ? '📎 File' : lastMsgObj.type === 'image' ? '🖼️ Hình ảnh' : lastMsgObj.content;
            if (lastMsgObj.sender_id === currentUser?.id) {
              lastMsgText = `Bạn: ${lastMsgText}`;
            }
          }
          const msgDate = new Date(lastMsgObj.created_at);
          lastTimeText = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          updatedAt = msgDate.getTime();
        }

        return {
          id: room.id,
          type: room.type === 'direct' ? 'dm' : 'group',
          name: room.name || 'Unnamed',
          participants,
          lastMessage: lastMsgText,
          lastTime: lastTimeText,
          updatedAt,
          unread: 0,
          isPinned: r.is_pinned || false
        };
      });
      setConversations(formattedRooms);
    });

    socketRef.current.on('user_updated', (data: { userId: string, avatar?: string, name?: string }) => {
      setUsers(prev => prev.map(u => {
        if (u.id === data.userId) {
          const updatedUser = { ...u };
          if (data.avatar) updatedUser.avatar = data.avatar;
          if (data.name) {
            updatedUser.name = data.name;
            updatedUser.initials = data.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
          }
          return updatedUser;
        }
        return u;
      }));
    });


    return () => {
      socketRef.current?.off('receive_message');
      socketRef.current?.off('user_updated');
      socketRef.current?.off('update_message');
      socketRef.current?.off('force_logout');
      socketRef.current?.off('message_pinned');
      socketRef.current?.off('message_reacted');
      socketRef.current?.off('message_recalled');
      socketRef.current?.off('presence_snapshot');
      socketRef.current?.off('presence_update');
      socketRef.current?.disconnect();
    };
  }, []);

  // 2. Tải tin nhắn khi chọn một phòng
  useEffect(() => {
    if (!selectedConvId) return;

    // Reset unread count
    setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, unread: 0 } : c));

    // Nếu đã tải rồi thì không tải lại
    if (messages[selectedConvId]) return;

    api.get(`/chat/rooms/${selectedConvId}/messages`).then(res => {
      const rawMsgs = res.data.data.messages;
      const formattedMsgs: Message[] = rawMsgs.map((m: any) => ({
        id: m.id,
        conversationId: m.room_id,
        senderId: m.sender_id,
        content: m.content,
        type: m.type,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: m.created_at,
        status: 'seen',
        fileId: m.files?.[0]?.id,
        fileName: m.files?.[0]?.original_name,
        fileSize: m.files?.[0]?.file_size ? `${(m.files[0].file_size / 1024 / 1024).toFixed(2)} MB` : undefined,
        fileUrl: m.files?.[0] ? getFilePreviewUrl(m.files[0]) : undefined,
        isPinned: m.is_pinned,
        reactions: m.reactions ? 
          Object.entries(m.reactions).reduce((acc: any[], [userId, emoji]) => {
            const existing = acc.find(x => x.emoji === emoji);
            if (existing) existing.userIds.push(userId);
            else acc.push({ emoji, userIds: [userId] });
            return acc;
          }, []) 
        : undefined,
        replyToId: m.reply_to?.id && (m.reply_to.content || m.reply_to.type)
          ? (m.reply_to_id || m.reply_to.id)
          : undefined,
        replyTo: m.reply_to?.id && (m.reply_to.content || m.reply_to.type) ? {
          id: m.reply_to.id,
          content: m.reply_to.content,
          type: m.reply_to.type,
          userName: m.reply_to.users?.name || ''
        } : undefined
      }));

      setMessages(prev => ({
        ...prev,
        [selectedConvId]: formattedMsgs
      }));
    });

    // Emit join_room cho Socket
    socketRef.current?.emit('join_room', selectedConvId);
  }, [selectedConvId]);

  // 3. Hàm gửi tin nhắn
  const sendMessage = (roomId: string, content: string, type: 'text' | 'file' | 'image' | 'video' = 'text', replyToId: string | null = null) => {
    return new Promise<Message>((resolve, reject) => {
      if (!currentUser) return reject(new Error('Chưa đăng nhập'));
      
      socketRef.current?.emit('send_message', {
        roomId,
        content,
        type,
        replyToId
      }, (response: any) => {
        if (response.status === 'success') {
          // Socket sẽ tự broadcast lại tin nhắn qua receive_message, 
          // nhưng ta vẫn cần lấy ID ngay lập tức để lưu File
          resolve(response.message);
        } else {
          reject(new Error(response.error || 'Lỗi gửi tin nhắn'));
        }
      });
    });
  };

  // 3.5 Hàm Gửi File
  const sendFileMessage = async (roomId: string, file: File, type: 'file' | 'image' | 'video' = 'file') => {
    if (!currentUser) throw new Error('Chưa đăng nhập');

    // Bước 1: Xin link Upload
    const res = await api.post('/files/upload-url', {
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      roomId
    });
    const { provider, uploadUrl, r2Key, signature, timestamp, folder, apiKey } = res.data.data;

    let finalR2Key = r2Key;

    if (provider === 'cloudinary') {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });
      
      if (!uploadRes.ok) throw new Error('Lỗi khi tải file lên Cloudinary');
      const cloudData = await uploadRes.json();
      finalR2Key = cloudData.secure_url;
    } else {
      // Bước 2: Upload trực tiếp lên B2 bằng fetch
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        }
      });

      if (!uploadRes.ok) throw new Error('Lỗi khi tải file lên máy chủ lưu trữ');
    }

    // Bước 3: Bắn socket báo tin nhắn mới
    const msg = await sendMessage(roomId, type === 'image' ? 'Hình ảnh' : file.name, type);

    // Bước 4: Gọi API lưu file record
    const recordRes = await api.post('/files', {
      messageId: msg.id,
      originalName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      r2Key: finalR2Key
    });

    // Cập nhật state cho Sender để hiện ảnh ngay lập tức
    const savedFile = recordRes.data.data.file;
    setMessages(prev => {
      const roomMsgs = prev[roomId] || [];
      const fileFields = {
        fileId: savedFile.id,
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        fileUrl: getFilePreviewUrl({ ...savedFile, r2_key: savedFile.r2_key || finalR2Key })
      };

      if (!roomMsgs.some(m => m.id === msg.id)) {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          ...prev,
          [roomId]: [
            ...roomMsgs,
            {
              id: msg.id,
              conversationId: roomId,
              senderId: currentUser.id,
              content: type === 'image' ? 'Hình ảnh' : file.name,
              type,
              timestamp: now,
              status: 'sent',
              ...fileFields
            }
          ]
        };
      }

      return {
        ...prev,
        [roomId]: roomMsgs.map(m => m.id === msg.id ? { 
          ...m, 
          ...fileFields
        } : m)
      };
    });

    return msg;
  };


  // 4. Hàm tạo phòng mới
  const sendFileMessageWithPreview = async (roomId: string, file: File, type: 'file' | 'image' | 'video' = 'file') => {
    if (!currentUser) throw new Error('Chưa đăng nhập');

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const localPreviewUrl = type === 'image' || type === 'video' ? URL.createObjectURL(file) : undefined;
    const createdAt = new Date().toISOString();
    const timestampText = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fileSize = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

    const patchTempMessage = (patch: Partial<Message>) => {
      setMessages(prev => ({
        ...prev,
        [roomId]: (prev[roomId] || []).map(m => m.id === tempId ? { ...m, ...patch } : m)
      }));
    };

    setMessages(prev => ({
      ...prev,
      [roomId]: [
        ...(prev[roomId] || []),
        {
          id: tempId,
          conversationId: roomId,
          senderId: currentUser.id,
          content: type === 'image' ? 'Hình ảnh' : file.name,
          type,
          timestamp: timestampText,
          createdAt,
          status: 'sent',
          fileName: file.name,
          fileSize,
          fileUrl: localPreviewUrl,
          isUploading: true,
          uploadProgress: 0
        }
      ]
    }));

    setConversations(prev => prev.map(c => c.id === roomId ? {
      ...c,
      lastMessage: type === 'image' ? 'Hình ảnh' : 'File',
      lastTime: timestampText,
      updatedAt: Date.now()
    } : c));

    try {
      patchTempMessage({ uploadProgress: 3 });

      const res = await api.post('/files/upload-url', {
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        roomId
      });
      const { provider, uploadUrl, r2Key, signature, timestamp, folder, apiKey } = res.data.data;

      let finalR2Key = r2Key;
      patchTempMessage({ uploadProgress: 8 });

      if (provider === 'cloudinary') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('folder', folder);

        const cloudData = await uploadWithProgress(uploadUrl, {
          method: 'POST',
          body: formData,
          onProgress: progress => patchTempMessage({
            uploadProgress: Math.min(88, Math.max(8, Math.round(progress * 0.88)))
          })
        });
        finalR2Key = cloudData.secure_url;
      } else {
        await uploadWithProgress(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream'
          },
          onProgress: progress => patchTempMessage({
            uploadProgress: Math.min(88, Math.max(8, Math.round(progress * 0.88)))
          })
        });
      }

      patchTempMessage({ uploadProgress: 90 });

      const msg = await sendMessage(roomId, type === 'image' ? 'Hình ảnh' : file.name, type);
      patchTempMessage({ uploadProgress: 94 });

      const recordRes = await api.post('/files', {
        messageId: msg.id,
        originalName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        r2Key: finalR2Key
      });

      const savedFile = recordRes.data.data.file;
      const realCreatedAt = (msg as any).created_at || createdAt;
      const realTimestamp = new Date(realCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const fileFields = {
        fileId: savedFile.id,
        fileName: file.name,
        fileSize,
        fileUrl: getFilePreviewUrl({ ...savedFile, r2_key: savedFile.r2_key || finalR2Key }),
        isUploading: false,
        uploadProgress: 100,
        uploadError: undefined
      };

      setMessages(prev => {
        const roomMsgs = prev[roomId] || [];
        const withoutSocketDuplicate = roomMsgs.filter(m => m.id !== msg.id);
        const hasTemp = withoutSocketDuplicate.some(m => m.id === tempId);
        const updatedMsgs = withoutSocketDuplicate.map(m => m.id === tempId ? {
          ...m,
          id: msg.id,
          content: msg.content,
          timestamp: realTimestamp,
          createdAt: realCreatedAt,
          ...fileFields
        } : m);

        return {
          ...prev,
          [roomId]: hasTemp ? updatedMsgs : [
            ...updatedMsgs,
            {
              id: msg.id,
              conversationId: roomId,
              senderId: currentUser.id,
              content: msg.content,
              type,
              timestamp: realTimestamp,
              createdAt: realCreatedAt,
              status: 'sent',
              ...fileFields
            }
          ]
        };
      });

      if (localPreviewUrl) {
        window.setTimeout(() => URL.revokeObjectURL(localPreviewUrl), 3000);
      }

      return msg;
    } catch (error) {
      patchTempMessage({
        isUploading: false,
        uploadProgress: 0,
        uploadError: 'Upload failed'
      });
      throw error;
    }
  };

  const createRoom = async (userId: string) => {
    try {
      const res = await api.post('/chat/rooms', {
        type: 'direct',
        memberIds: [userId]
      });
      
      const responseData = res.data.data;
      const roomId = responseData.room ? responseData.room.id : responseData.roomId;

      // Fetch lại để có đầy đủ thông tin users join (do backend trả về)
      const roomsRes = await api.get('/chat/rooms');
      const formattedRooms = roomsRes.data.data.rooms.map((r: any) => {
        const room = r.rooms;
        const participants = room.room_members?.map((m: any) => m.user_id) || [];
        const lastMsgObj = r.last_message;
        let lastMsgText = 'Bắt đầu trò chuyện...';
        let lastTimeText = '';

        if (lastMsgObj) {
          lastMsgText = lastMsgObj.type === 'file' ? '📎 File' : lastMsgObj.type === 'image' ? '🖼️ Hình ảnh' : lastMsgObj.content;
          lastTimeText = new Date(lastMsgObj.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return {
          id: room.id,
          type: room.type === 'direct' ? 'dm' : 'group',
          name: room.name || 'Unnamed',
          participants,
          lastMessage: lastMsgText,
          lastTime: lastTimeText,
          unread: 0,
          isPinned: r.is_pinned || false
        };
      });
      setConversations(formattedRooms);
      return roomId;
    } catch (err) {
      console.error('Lỗi khi tạo phòng', err);
      return null;
    }
  };

  // 5. Hàm Ghim/Bỏ ghim
  const togglePin = async (roomId: string) => {
    try {
      setConversations(prev => prev.map(c => 
        c.id === roomId ? { ...c, isPinned: !c.isPinned } : c
      ));
      await api.put(`/chat/rooms/${roomId}/pin`);
    } catch (err) {
      console.error('Lỗi khi ghim phòng', err);
      setConversations(prev => prev.map(c => 
        c.id === roomId ? { ...c, isPinned: !c.isPinned } : c
      ));
    }
  };

  const createGroupChat = async (name: string, memberIds: string[]) => {
    const res = await api.post('/chat/rooms', {
      name,
      type: 'group',
      memberIds
    });
    // Giao lại việc fetch cho sự kiện socket `group_created`
    return res.data.data.room;
  };

  const pinMessage = async (messageId: string, isPinned: boolean) => {
    try {
      await api.put(`/chat/messages/${messageId}/pin`, { isPinned });
    } catch (err) {
      console.error('Lỗi khi ghim tin nhắn', err);
    }
  };

  const reactToMessage = async (messageId: string, emoji: string | null) => {
    try {
      await api.put(`/chat/messages/${messageId}/react`, { emoji });
    } catch (err) {
      console.error('Lỗi khi thả tim', err);
    }
  };

  const recallMessage = async (messageId: string) => {
    try {
      await api.put(`/chat/messages/${messageId}/recall`);
    } catch (err) {
      console.error('Lỗi khi thu hồi tin nhắn:', err);
    }
  };

  return {
    users,
    conversations,
    messages,
    sendMessage,
    sendFileMessage: sendFileMessageWithPreview,
    createGroupChat,
    createRoom,
    togglePin,
    pinMessage,
    reactToMessage,
    recallMessage
  };
}

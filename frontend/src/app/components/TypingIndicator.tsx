import React from 'react';
import type { User } from '../../types';
import { Avatar } from './Avatar';

export function TypingIndicator({ user }: { user: User }) {
  return (
    <div className="flex items-end gap-2 px-3 py-1">
      <Avatar user={user} size="xs" />
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1">
        {[0, 150, 300].map(delay => (
          <div
            key={delay}
            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <span className="text-gray-400" style={{ fontSize: '0.72rem' }}>
        đang soạn...
      </span>
    </div>
  );
}

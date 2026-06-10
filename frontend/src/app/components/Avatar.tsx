import React from 'react';
import type { User } from '../../types';

export const STATUS_COLOR: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-yellow-500',
};

export const STATUS_LABEL: Record<string, string> = {
  online: 'Đang hoạt động',
  offline: 'Ngoại tuyến',
  busy: 'Đang bận',
};

export function Avatar({
  user,
  size = 'md',
  showStatus = false,
}: {
  user: User;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}) {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };
  const dotMap = { xs: 'w-2 h-2', sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5' };
  return (
    <div className="relative flex-shrink-0">
      <img
        src={user.avatar || '/placeholder.png'}
        alt={user.name}
        className={`${sizeMap[size]} rounded-full object-cover shadow-sm`}
      />
      {showStatus && (
        <div
          className={`absolute bottom-0 right-0 ${dotMap[size]} ${STATUS_COLOR[user.status]} rounded-full border-2 border-white`}
        />
      )}
    </div>
  );
}

export function GroupAvatar({ size = 'md' }: { size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizeMap = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
  return (
    <img
      src="/group_placeholder.png"
      alt="Group Avatar"
      className={`${sizeMap[size]} rounded-full object-cover flex-shrink-0 shadow-sm`}
    />
  );
}

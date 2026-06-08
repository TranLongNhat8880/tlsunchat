import React, { useState } from 'react';
import type { User } from '../../types/index';
import { X, Users, Check } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onCreate: (name: string, memberIds: string[]) => Promise<void>;
  currentUser: User | null;
}

export function CreateGroupModal({ isOpen, onClose, users, onCreate, currentUser }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const availableUsers = users.filter(u => u.id !== currentUser?.id);

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      alert('Vui lòng nhập tên nhóm!');
      return;
    }
    if (selectedUserIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 thành viên!');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreate(groupName.trim(), selectedUserIds);
      // Reset & close
      setGroupName('');
      setSelectedUserIds([]);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Lỗi khi tạo nhóm!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Tạo nhóm mới</h2>
              <p className="text-xs text-gray-500">Thêm thành viên vào cuộc trò chuyện chung</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* Tên nhóm */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tên nhóm</label>
            <input 
              type="text" 
              placeholder="Nhập tên nhóm..." 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all text-sm"
              autoFocus
            />
          </div>

          {/* Chọn thành viên */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Thành viên <span className="text-gray-400 font-normal">({selectedUserIds.length} đã chọn)</span>
            </label>
            <div className="space-y-2">
              {availableUsers.map(user => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <div 
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatar || '/placeholder.png'} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full object-cover shadow-sm" 
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
              {availableUsers.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-4">Không có nhân viên nào khác.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Hủy
          </button>
          <button 
            onClick={handleCreate}
            disabled={isSubmitting || selectedUserIds.length === 0 || !groupName.trim()}
            className="flex-1 py-3 px-4 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md shadow-green-500/20"
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo nhóm'}
          </button>
        </div>

      </div>
    </div>
  );
}

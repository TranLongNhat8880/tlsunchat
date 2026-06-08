import React, { useState, useEffect } from 'react';
import type { User } from '../App';
import {
  ChevronLeft, Shield, Users, HardDrive, Plus, Trash2, Key,
  Lock, Search, MoreVertical, X, Check, AlertTriangle, TrendingUp,
  UserPlus, Edit3, ChevronRight, ChevronLeft as ChevronLeftIcon
} from 'lucide-react';
import api from '../../lib/api';

interface Props {
  currentUser: User;
  onBack: () => void;
  onLogout: () => void;
}

type AdminTab = 'members' | 'storage';

const TOTAL_CAPACITY_MB = 10240; // 10GB Cloudflare R2 free tier

const STATUS_COLOR: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-yellow-500',
};
const STATUS_LABEL: Record<string, string> = {
  online: 'Trực tuyến',
  offline: 'Ngoại tuyến',
  busy: 'Đang bận',
};

const FILE_ICON_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  pdf: { bg: 'bg-red-100', text: 'text-red-500', label: 'PDF' },
  xlsx: { bg: 'bg-green-100', text: 'text-green-600', label: 'Excel' },
  xls: { bg: 'bg-green-100', text: 'text-green-600', label: 'Excel' },
  pptx: { bg: 'bg-orange-100', text: 'text-orange-500', label: 'PPT' },
  ppt: { bg: 'bg-orange-100', text: 'text-orange-500', label: 'PPT' },
  docx: { bg: 'bg-blue-100', text: 'text-blue-500', label: 'Word' },
  doc: { bg: 'bg-blue-100', text: 'text-blue-500', label: 'Word' },
  zip: { bg: 'bg-purple-100', text: 'text-purple-500', label: 'ZIP' },
  mp4: { bg: 'bg-pink-100', text: 'text-pink-500', label: 'MP4' },
  png: { bg: 'bg-cyan-100', text: 'text-cyan-500', label: 'PNG' },
  jpg: { bg: 'bg-cyan-100', text: 'text-cyan-500', label: 'JPG' },
};

function getFileStyle(type: string) {
  return FILE_ICON_COLOR[type] ?? { bg: 'bg-gray-100', text: 'text-gray-500', label: type.toUpperCase() };
}

function Avatar({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' }) {
  const sizeMap = { sm: 'w-8 h-8', md: 'w-10 h-10' };
  return (
    <div className="relative flex-shrink-0">
      <img
        src={user.avatar || '/placeholder.png'}
        alt={user.name}
        className={`${sizeMap[size]} rounded-full object-cover shadow-sm`}
      />
    </div>
  );
}

// ─── Create User Modal ───────────────────────────────────────────────────────
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');

  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/create-user', { name, email, role });
      setStep('done');
      onSuccess?.();
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-gray-800" style={{ fontWeight: 600, fontSize: '1rem' }}>
            {step === 'form' ? 'Tạo tài khoản mới' : ''}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'done' ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h4 className="text-gray-800 mb-1" style={{ fontWeight: 600 }}>Tạo thành công!</h4>
            <p className="text-gray-500 mb-1" style={{ fontSize: '0.85rem' }}>{name}</p>
            <p className="text-gray-400" style={{ fontSize: '0.8rem' }}>{email}</p>
            <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-100 text-left">
              <p className="text-green-700" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Mật khẩu tạm thời
              </p>
              <p className="text-green-600 mt-1" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Abc@123456
              </p>
              <p className="text-green-500 mt-1" style={{ fontSize: '0.72rem' }}>
                Nhắc nhân viên đổi mật khẩu khi đăng nhập lần đầu
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl transition-colors"
              style={{ fontWeight: 600, fontSize: '0.9rem' }}
            >
              Hoàn thành
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                Họ và tên
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                style={{ fontSize: '0.9rem' }}
                required
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@company.vn"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                style={{ fontSize: '0.9rem' }}
                required
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1.5" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                Vai trò
              </label>
              <div className="flex gap-2">
                {(['member', 'admin'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2 rounded-xl border transition-all ${
                      role === r
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                    style={{ fontSize: '0.85rem', fontWeight: role === r ? 600 : 400 }}
                  >
                    {r === 'admin' ? '👑 Admin' : '👤 Nhân viên'}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-xl transition-colors shadow-md shadow-green-200"
              style={{ fontWeight: 600, fontSize: '0.9rem' }}
            >
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── AdminPanel ──────────────────────────────────────────────────────────────
export function AdminPanel({ currentUser, onBack, onLogout }: Props) {
  const [tab, setTab] = useState<AdminTab>('members');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Users state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);

  // Files state
  const [filesList, setFilesList] = useState<any[]>([]);
  const [filesPage, setFilesPage] = useState(1);
  const [filesTotalPages, setFilesTotalPages] = useState(1);
  const [filesTotal, setFilesTotal] = useState(0);
  const [usedBytes, setUsedBytes] = useState(0);

  const limit = 5; // Giới hạn 5 items mỗi trang để dễ test phân trang

  // 1. Fetch Users
  useEffect(() => {
    if (tab === 'members') {
      api.get(`/users/admin?page=${usersPage}&limit=${limit}&search=${search}`).then(res => {
        const { users, pagination } = res.data.data;
        const formatted = users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          status: u.is_active ? 'online' : 'offline',
          role: u.role,
          color: 'bg-green-500',
          initials: (u.name || '').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        }));
        setUsersList(formatted);
        setUsersTotalPages(pagination.totalPages);
        setUsersTotal(pagination.total);
      }).catch(err => console.error(err));
    }
  }, [tab, usersPage, search, refreshTrigger]);

  // Reset page when search changes
  useEffect(() => {
    setUsersPage(1);
  }, [search]);

  // 2. Fetch Files & Stats
  useEffect(() => {
    if (tab === 'storage') {
      api.get(`/files/admin?page=${filesPage}&limit=${limit}`).then(res => {
        const { files, pagination } = res.data.data;
        setFilesList(files);
        setFilesTotalPages(pagination.totalPages);
        setFilesTotal(pagination.total);
      }).catch(err => console.error(err));

      api.get('/files/admin/stats').then(res => {
        setUsedBytes(res.data.data.totalBytes);
      }).catch(err => console.error(err));
    }
  }, [tab, filesPage]);

  const usedMB = usedBytes / (1024 * 1024);
  const usagePercent = Math.min(100, Math.round((usedMB / TOTAL_CAPACITY_MB) * 100));

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 px-4 py-3.5 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-white" style={{ fontWeight: 700, fontSize: '1rem' }}>
            Bảng điều khiển Admin
          </h1>
          <p className="text-green-200" style={{ fontSize: '0.72rem' }}>
            {currentUser.name}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg transition-colors"
          style={{ fontSize: '0.8rem', fontWeight: 500 }}
        >
          Đăng xuất
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex bg-white border-b border-gray-100 px-4">
        {(
          [
            { key: 'members', label: 'Thành viên', icon: <Users className="w-4 h-4" /> },
            { key: 'storage', label: 'Lưu trữ', icon: <HardDrive className="w-4 h-4" /> },
          ] as { key: AdminTab; label: string; icon: React.ReactNode }[]
        ).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors mr-2 ${
              tab === t.key
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={{ fontSize: '0.875rem', fontWeight: tab === t.key ? 600 : 400 }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* ── Members Tab ── */}
        {tab === 'members' && (
          <div className="space-y-4 max-w-2xl mx-auto flex flex-col h-full">
            {/* Actions bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm tên hoặc email..."
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  style={{ fontSize: '0.875rem' }}
                />
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors shadow-md shadow-green-200 flex-shrink-0"
                style={{ fontSize: '0.85rem', fontWeight: 600 }}
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Thêm tài khoản</span>
                <span className="sm:hidden">Thêm</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Tổng tìm thấy', value: usersTotal, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Trang hiện tại', value: usersPage, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Tổng số trang', value: usersTotalPages, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              ].map(stat => (
                <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
                  <p className={stat.color} style={{ fontWeight: 700, fontSize: '1.5rem' }}>
                    {stat.value}
                  </p>
                  <p className="text-gray-500 mt-0.5" style={{ fontSize: '0.72rem' }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* User list */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex-1">
              {usersList.map((user, idx) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${
                    idx < usersList.length - 1 ? 'border-b border-gray-50' : ''
                  } hover:bg-gray-50 transition-colors`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar user={user} size="md" />
                    <div
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${
                        STATUS_COLOR[user.status]
                      } rounded-full border-2 border-white`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 truncate" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {user.name}
                      </span>
                      {user.role === 'admin' && (
                        <span
                          className="flex-shrink-0 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-md"
                          style={{ fontSize: '0.65rem', fontWeight: 700 }}
                        >
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 truncate" style={{ fontSize: '0.78rem' }}>
                      {user.email}
                    </p>
                  </div>

                  {/* Actions */}
                  {user.id !== currentUser.id && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setResetUserId(user.id === resetUserId ? null : user.id)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Reset mật khẩu"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này không?')) {
                            try {
                              await api.delete(`/users/admin/${user.id}`);
                              setUsersList(prev => prev.filter(u => u.id !== user.id));
                              alert('Xóa tài khoản thành công');
                            } catch (error: any) {
                              alert(error.response?.data?.message || 'Có lỗi xảy ra');
                            }
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Xóa tài khoản"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {user.id === currentUser.id && (
                    <span className="text-gray-300 flex-shrink-0" style={{ fontSize: '0.72rem' }}>
                      (Bạn)
                    </span>
                  )}
                </div>
              ))}

              {/* Reset password inline UI */}
              {resetUserId && (
                <div className="border-t border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-blue-700" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        Reset mật khẩu cho {usersList.find(u => u.id === resetUserId)?.name}?
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={async () => {
                            try {
                              await api.put(`/users/admin/${resetUserId}/reset-password`);
                              setResetUserId(null);
                              alert('Đã reset mật khẩu về 123456');
                            } catch (error: any) {
                              alert(error.response?.data?.message || 'Có lỗi xảy ra');
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          style={{ fontSize: '0.78rem', fontWeight: 600 }}
                        >
                          Xác nhận reset
                        </button>
                        <button
                          onClick={() => setResetUserId(null)}
                          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ fontSize: '0.78rem' }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {usersTotalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl shadow-sm">
                <button
                  onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                  disabled={usersPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600 font-medium">
                  Trang {usersPage} / {usersTotalPages}
                </span>
                <button
                  onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                  disabled={usersPage === usersTotalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Storage Tab ── */}
        {tab === 'storage' && (
          <div className="space-y-4 max-w-2xl mx-auto flex flex-col h-full">
            {/* Usage card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-gray-800" style={{ fontWeight: 600, fontSize: '1rem' }}>
                    Backblaze B2 Storage
                  </h3>
                  <p className="text-gray-400 mt-0.5" style={{ fontSize: '0.78rem' }}>
                    Lưu trữ S3 Tương thích
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-800" style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                    {usedMB.toFixed(1)} MB
                  </p>
                  <p className="text-gray-400" style={{ fontSize: '0.78rem' }}>
                    / {(TOTAL_CAPACITY_MB / 1024).toFixed(0)} GB miễn phí
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePercent > 80
                      ? 'bg-red-500'
                      : usagePercent > 60
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-400" style={{ fontSize: '0.72rem' }}>
                  Đã dùng: {usagePercent}%
                </span>
                <span className="text-gray-400" style={{ fontSize: '0.72rem' }}>
                  Còn lại: {((TOTAL_CAPACITY_MB - usedMB) / 1024).toFixed(2)} GB
                </span>
              </div>
            </div>

            {/* File list */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 px-1 flex-shrink-0">
                <h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Danh sách file (Tổng {filesTotal})
                </h3>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-y-auto shadow-sm flex-1">
                {filesList.map((file, idx) => {
                  const ext = file.original_name.split('.').pop()?.toLowerCase() || '';
                  const style = getFileStyle(ext);
                  const mbSize = (file.file_size / 1024 / 1024).toFixed(2);
                  const uploadDate = new Date(file.created_at).toLocaleDateString('vi-VN');
                  return (
                    <div
                      key={file.id}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        idx < filesList.length - 1 ? 'border-b border-gray-50' : ''
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <div className={`${style.bg} px-2 py-1.5 rounded-lg flex-shrink-0`}>
                        <span className={`${style.text}`} style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                          {style.label}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 truncate" style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                          {file.original_name}
                        </p>
                        <p className="text-gray-400" style={{ fontSize: '0.72rem' }}>
                          {mbSize} MB · {file.users?.name || 'Unknown'} · {uploadDate}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {filesList.length === 0 && (
                  <div className="text-center py-10 text-gray-400">
                    <HardDrive className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p style={{ fontSize: '0.875rem' }}>Không có file nào</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pagination Files */}
            {filesTotalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl shadow-sm">
                <button
                  onClick={() => setFilesPage(p => Math.max(1, p - 1))}
                  disabled={filesPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600 font-medium">
                  Trang {filesPage} / {filesTotalPages}
                </span>
                <button
                  onClick={() => setFilesPage(p => Math.min(filesTotalPages, p + 1))}
                  disabled={filesPage === filesTotalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create user modal */}
      {showCreateModal && (
        <CreateUserModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={() => {
            setUsersPage(1);
            setRefreshTrigger(prev => prev + 1);
          }} 
        />
      )}
    </div>
  );
}

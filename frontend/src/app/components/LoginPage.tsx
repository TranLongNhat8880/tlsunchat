import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Eye, EyeOff, Lock, Mail, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, data, requirePasswordChange } = response.data;

      login(token, data.user, requirePasswordChange);
      navigate('/');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      if (errMsg.toLowerCase().includes('vô hiệu hóa') || errMsg.toLowerCase().includes('vo hieu hoa')) {
        setShowLockedModal(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4 shadow-lg shadow-green-200">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-gray-900" style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>
            InternalChat
          </h1>
          <p className="text-gray-500 mt-1" style={{ fontSize: '0.875rem' }}>
            Hệ thống trò chuyện nội bộ doanh nghiệp
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-green-100/50 p-6 border border-green-100">
          <h2 className="text-gray-800 mb-5" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            Đăng nhập
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-gray-600 mb-1.5"
                style={{ fontSize: '0.875rem', fontWeight: 500 }}
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@company.vn"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  style={{ fontSize: '0.9rem' }}
                  required
                />
              </div>
            </div>

            <div>
              <label
                className="block text-gray-600 mb-1.5"
                style={{ fontSize: '0.875rem', fontWeight: 500 }}
              >
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  style={{ fontSize: '0.9rem' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ fontSize: '0.8rem' }}>
                <span className="shrink-0">!</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-green-200"
              style={{ fontWeight: 600, fontSize: '0.95rem' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 mt-5" style={{ fontSize: '0.75rem' }}>
          Dữ liệu được mã hóa và bảo mật - v1.0.0
        </p>
      </div>

      {showLockedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-red-50 shadow-2xl relative overflow-hidden transform scale-100 transition-all duration-300 ease-out animate-slide-up">
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-red-100 rounded-full blur-2xl opacity-60 pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-red-50 rounded-full blur-2xl opacity-50 pointer-events-none" />

            <div className="flex justify-between items-start relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <button
                onClick={() => setShowLockedModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 relative z-10">
              <h3 className="text-gray-900 font-extrabold text-xl leading-tight">
                Tài khoản bị vô hiệu hóa
              </h3>
              <p className="text-gray-500 text-sm mt-3 leading-relaxed">
                Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên do vi phạm quy chế bảo mật hệ thống hoặc ngừng hoạt động.
              </p>
              
              <div className="mt-4 p-3 bg-red-50/50 rounded-2xl border border-red-100/50 text-left">
                <p className="text-red-700 text-xs font-bold uppercase tracking-wider">
                  Trạng thái:
                </p>
                <p className="text-red-600 mt-1 text-sm font-semibold">
                  Ngăn chặn truy cập thiết bị (SESSION_LOCKED)
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 relative z-10">
              <button
                onClick={() => setShowLockedModal(false)}
                className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-md shadow-red-200 transition-all text-center text-sm"
              >
                Tôi đã hiểu
              </button>
              <a
                href="mailto:support@company.vn?subject=Yêu cầu mở khóa tài khoản InternalChat"
                className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold transition-all text-center text-sm"
              >
                Liên hệ Quản trị viên
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

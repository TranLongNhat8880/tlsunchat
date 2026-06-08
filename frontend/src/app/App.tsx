import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginPage } from './components/LoginPage';
import { ChatLayout } from './components/ChatLayout';
import { AdminPanel } from './components/AdminPanel';
import { ForceChangePassword } from './components/ForceChangePassword';
import { useAuth } from '../contexts/AuthContext';

// --- Tạm thời export Types từ đây để không phá vỡ code ChatLayout cũ ---
export * from '../types';

export default function App() {
  const { user, isLoading, logout, requirePasswordChange, setRequirePasswordChange } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user && requirePasswordChange) {
    return (
      <ForceChangePassword 
        onSuccess={() => {
          localStorage.removeItem('requirePasswordChange');
          setRequirePasswordChange(false);
          navigate('/');
        }}
        onLogout={() => {
          logout();
          navigate('/login');
        }}
      />
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!user ? <LoginPage /> : <Navigate to="/" replace />} 
      />
      
      <Route 
        path="/" 
        element={
          user ? (
            <ChatLayout
              currentUser={user}
              onLogout={() => {
                logout();
                navigate('/login');
              }}
              onOpenAdmin={user.role === 'admin' ? () => navigate('/admin') : undefined}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      <Route 
        path="/admin" 
        element={
          user && user.role === 'admin' ? (
            <AdminPanel
              currentUser={user}
              onBack={() => navigate('/')}
              onLogout={() => {
                logout();
                navigate('/login');
              }}
            />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
    </Routes>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AuthCallback() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    // Wait for auth state to settle
    if (!loading) {
      if (session) {
        // User is authenticated, go to chat
        navigate('/chat', { replace: true });
      } else {
        // User is not authenticated, go back to login
        navigate('/login', { replace: true });
      }
    }
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Authenticating...</p>
      </div>
    </div>
  );
}

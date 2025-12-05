import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './components/auth/LoginPage';
import { AuthCallback } from './components/auth/AuthCallback';
import { ChatPage } from './pages/ChatPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { useEffect } from 'react';

// Component to handle Supabase auth redirects
function SupabaseAuthHandler() {
  const location = useLocation();

  useEffect(() => {
    // If we're on a Supabase auth path, redirect to the actual Supabase server
    if (location.pathname.startsWith('/auth/v1/')) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        // Redirect to the actual Supabase auth endpoint
        window.location.href = `${supabaseUrl}${location.pathname}${location.search}`;
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Redirecting to authentication...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            {/* Handle Supabase auth paths */}
            <Route path="/auth/v1/*" element={<SupabaseAuthHandler />} />
            <Route
              path="/chat"
              element={<ProtectedRoute><ChatPage /></ProtectedRoute>}
            />
            <Route
              path="/chat/:id"
              element={<ProtectedRoute><ChatPage /></ProtectedRoute>}
            />
            <Route path="/" element={<Navigate to="/chat" replace />} />
            {/* Catch-all for unknown routes */}
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

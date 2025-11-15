import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './components/auth/LoginPage';
import { AuthCallback } from './components/auth/AuthCallback';
import { ChatPage } from './pages/ChatPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/chat"
              element={<ProtectedRoute><ChatPage /></ProtectedRoute>}
            />
            <Route
              path="/chat/:id"
              element={<ProtectedRoute><ChatPage /></ProtectedRoute>}
            />
            <Route path="/" element={<Navigate to="/chat" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

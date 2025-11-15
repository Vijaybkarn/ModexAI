import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Moon, Sun, LogOut, Menu, Settings } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onMenuToggle?: () => void;
  title?: string;
}

export function Header({ onMenuToggle, title = 'AI Chat' }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
      <div className="max-w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors md:hidden"
          >
            <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-slate-600" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.email}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                  {user?.email?.[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm text-slate-700 dark:text-slate-300 hidden sm:inline">
                {user?.full_name || user?.email}
              </span>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                {user?.role === 'admin' && (
                  <a
                    href="/admin"
                    className="flex items-center gap-2 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border-b border-slate-200 dark:border-slate-600"
                  >
                    <Settings className="w-4 h-4" />
                    Admin Panel
                  </a>
                )}
                <button
                  onClick={() => {
                    handleSignOut();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

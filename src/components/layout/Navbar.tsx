import React, { useState, useEffect } from 'react';
import {
  Bell,
  GraduationCap,
  LogOut,
  LogIn,
  Compass,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/supabaseService';
import { NotificationItem } from '../../types';

interface NavbarProps {
  activeTab: 'browse' | 'candidate-dash';
  setActiveTab: (tab: 'browse' | 'candidate-dash') => void;
  onOpenCreateExam?: () => void;
  onOpenLogin: () => void;
  onSelectExam?: (examId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLogin,
  onSelectExam,
}) => {
  const { user, logout } = useAuth();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Load real notifications from Supabase
  useEffect(() => {
    if (user?.id) {
      notificationService.getNotifications(user.id).then(({ data }) => {
        setNotifications(data || []);
      });
    } else {
      setNotifications([]);
    }
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await logout();
    setActiveTab('browse');
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    await notificationService.markAsRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (notif.examId && onSelectExam) {
      onSelectExam(notif.examId);
      setShowNotifMenu(false);
    }
  };

  return (
    <header className="sticky top-3 sm:top-4 z-40 w-full px-3 sm:px-6 pointer-events-none">
      {/* Floating Spatial Glass Navigation Island */}
      <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-3.5 sm:px-6 rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/5 pointer-events-auto transition-all">
        {/* Zone 1: Brand Wordmark with Spatial Crystal Mark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('browse')}
            className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
          >
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-teal-500/5 border border-emerald-500/30 text-emerald-300 font-bold tracking-tight shadow-[0_0_15px_rgba(16,185,129,0.25)] group-hover:shadow-[0_0_22px_rgba(16,185,129,0.4)] transition-all">
              <span className="text-sm font-extrabold tracking-tighter bg-gradient-to-br from-emerald-200 to-teal-400 bg-clip-text text-transparent">
                M
              </span>
              <div className="absolute inset-0 rounded-xl bg-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                Muqabla
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 -mt-1 hidden sm:block">
                Exam Intelligence PK
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Spatial Navigation Controls */}
        <nav className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Explore Exams</span>
          </button>

          {user && (
            <button
              onClick={() => setActiveTab('candidate-dash')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'candidate-dash'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>My Standings</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Actions & Candidate Identity */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer border border-transparent hover:border-white/10"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#070b14]" />
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl p-3.5 shadow-2xl z-50 ring-1 ring-white/5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Notifications
                    </span>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      {unreadCount} unread
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No notifications yet.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-2.5 rounded-xl cursor-pointer text-xs transition-colors border ${
                            notif.read
                              ? 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05]'
                              : 'bg-emerald-950/30 border-emerald-500/30 text-slate-200 hover:bg-emerald-950/40'
                          }`}
                        >
                          <p className="font-semibold text-slate-200 line-clamp-1">{notif.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{notif.message}</p>
                          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                            {notif.timestamp}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile or Sign In Button */}
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 backdrop-blur-sm">
                <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold max-w-[90px] sm:max-w-[130px] truncate leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[90px] sm:max-w-[130px]">
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] cursor-pointer border border-emerald-400/30"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

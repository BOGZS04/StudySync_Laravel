import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PATHS } from "../../routes/path";
import { Button, Icon, LoadingSpinner } from "../ui";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { notify } from "../../util/notify";
import type { Notification } from "../../interfaces/notification";
import NotificationService from "../../services/NotificationService";
import { formatDate, unwrapData } from "../../util/studySyncData";
import Logo from "../../assets/vite.svg";

interface NavbarProps {
  onMenuClick: () => void;
}

interface NotificationData {
  notifications: Notification[];
  unread_count: number;
}

interface EchoChannel {
  listen: (event: string, callback: (payload: { notification?: Notification }) => void) => EchoChannel;
  stopListening?: (event: string) => EchoChannel;
}

interface EchoClient {
  private: (channel: string) => EchoChannel;
  leave?: (channel: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const themeConfig = {
    light: { icon: "FaSun" as const, label: "Light Mode" },
    dark: { icon: "FaMoon" as const, label: "Dark Mode" },
    system: { icon: "FaDesktop" as const, label: "System" },
  };

  useOnClickOutside(dropdownRef, () => setIsDropdownOpen(false));
  useOnClickOutside(notificationRef, () => setIsNotificationOpen(false));

  const avatarUrl = user?.avatar
    ? `${import.meta.env.VITE_STORAGE_URL}/${user.avatar}`
    : null;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsNotificationLoading(true);
    try {
      const response = await NotificationService.getAll({ limit: 20 });
      const data = unwrapData<NotificationData>(response, {
        notifications: [],
        unread_count: 0,
      });
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      notify.error("Failed to load notifications.");
    } finally {
      setIsNotificationLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    const interval = window.setInterval(fetchNotifications, 10000);
    return () => window.clearInterval(interval);
  }, [fetchNotifications, user]);

  useEffect(() => {
    const echo = (window as Window & { Echo?: EchoClient }).Echo;
    if (!echo || !user) return;

    const channelName = `users.${user.id}`;
    const channel = echo.private(channelName).listen(".notification.created", (payload) => {
      if (!payload.notification) return;
      setNotifications((current) => [payload.notification as Notification, ...current].slice(0, 20));
      setUnreadCount((value) => value + 1);
    });

    return () => {
      channel.stopListening?.(".notification.created");
      echo.leave?.(channelName);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      notify.success("Logged out successfully.");
      navigate(PATHS.LOGIN, { replace: true });
    } catch {
      notify.error("Failed to log out. Please try again.");
    }
  };

  const openNotifications = () => {
    setIsNotificationOpen((value) => !value);
    if (!isNotificationOpen) {
      fetchNotifications();
    }
  };

  const handleMarkRead = async (notification: Notification) => {
    if (notification.read_at) return;

    try {
      await NotificationService.markRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((value) => Math.max(0, value - 1));
    } catch {
      notify.error("Failed to mark notification as read.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await NotificationService.markAllRead();
      setNotifications((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      notify.error("Failed to mark notifications as read.");
    }
  };

  const handleClearNotification = async (notification: Notification, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!notification.read_at) {
      notify.warning("Mark this notification as read before clearing it.");
      return;
    }

    try {
      await NotificationService.delete(notification.id);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
    } catch {
      notify.error("Failed to clear notification.");
    }
  };

  const handleClearRead = async () => {
    try {
      await NotificationService.clearRead();
      setNotifications((current) => current.filter((item) => !item.read_at));
    } catch {
      notify.error("Failed to clear read notifications.");
    }
  };

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border-muted bg-bg-light">
      <div className="px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={onMenuClick}
              className="mr-2 rounded-lg p-2 text-text-muted sm:hidden"
              aria-label="Open menu"
            >
              <Icon iconName="FaAlignJustify" />
            </button>
            <Link to={PATHS.APP.DASHBOARD} className="flex items-center gap-3">
              <img src={Logo} alt="StudySync Logo" className="h-8 w-8" />
              <span className="hidden text-lg font-black uppercase italic tracking-tighter text-text sm:block">
                StudySync
              </span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={openNotifications}
                  className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border-muted bg-bg-main text-text transition-all duration-300 hover:border-primary hover:text-primary active:scale-95"
                  aria-label="Notifications"
                >
                  <Icon iconName="FaBell" size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-black text-bg-dark">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 flex max-h-[calc(100vh-5rem)] w-[min(22rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-border-muted bg-bg-light shadow-lg">
                    <div className="shrink-0 border-b border-border-muted bg-bg-main/50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-black uppercase italic tracking-tighter text-text">
                          Notifications
                        </h2>
                        <p className="text-xs font-medium text-text-muted">{unreadCount} unread</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        iconName="FaCheckDouble"
                        onClick={handleMarkAllRead}
                        disabled={unreadCount === 0}
                      />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          iconName="FaCheck"
                          onClick={handleMarkAllRead}
                          disabled={unreadCount === 0}
                          fullWidth
                        >
                          Read All
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          iconName="FaTrash"
                          onClick={handleClearRead}
                          disabled={!notifications.some((item) => item.read_at)}
                          fullWidth
                        >
                          Clear Read
                        </Button>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-3">
                      {isNotificationLoading ? (
                        <LoadingSpinner height="min-h-32" text="Loading" />
                      ) : notifications.length === 0 ? (
                        <div className="rounded-2xl border border-border-muted bg-bg-main p-4 text-center">
                          <p className="text-sm font-black uppercase italic tracking-tighter text-text">
                            No notifications yet
                          </p>
                          <p className="mt-1 text-xs font-medium text-text-muted">
                            New assignments and messages will show here.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {notifications.map((item) => (
                            <div
                              key={item.id}
                              className={`w-full rounded-2xl border p-3 text-left transition-all duration-300 hover:border-primary/50 ${
                                item.read_at
                                  ? "border-border-muted bg-bg-main text-text-muted"
                                  : "border-primary/30 bg-primary/10 text-text"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                                    item.read_at ? "bg-border" : "bg-primary"
                                  }`}
                                />
                                <div className="min-w-0">
                                  <button type="button" onClick={() => handleMarkRead(item)} className="block w-full text-left">
                                    <h3 className="break-words text-sm font-black uppercase italic tracking-tighter">
                                      {item.title}
                                    </h3>
                                    <p className="mt-1 break-words text-xs font-medium leading-relaxed">
                                      {item.message}
                                    </p>
                                  </button>
                                  <p className="mt-2 text-[10px] font-black uppercase italic tracking-widest opacity-70">
                                    {formatDate(item.created_at, { hour: "numeric", minute: "2-digit" })}
                                  </p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {!item.read_at && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        iconName="FaCheck"
                                        onClick={() => handleMarkRead(item)}
                                      >
                                        Read
                                      </Button>
                                    )}
                                    {item.read_at && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="danger"
                                        iconName="FaTrash"
                                        onClick={(event) => handleClearNotification(item, event)}
                                      >
                                        Clear
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={dropdownRef}>
                <button
                  id="user-profile-btn"
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 rounded-2xl p-1.5 transition-colors duration-200 hover:bg-bg-main"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-border-muted bg-primary/10">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-black uppercase text-primary">
                        {user.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="hidden flex-col items-start md:flex">
                    <span className="max-w-35 truncate text-sm font-bold leading-tight text-text">
                      {user.name}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      {user.role}
                    </span>
                  </div>

                  <Icon
                    iconName="FaChevronDown"
                    size={10}
                    className={`hidden text-text-muted transition-transform duration-200 md:block ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border-muted bg-bg-light shadow-lg">
                    <div className="border-b border-border-muted bg-bg-main/50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-border-muted bg-primary/10">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-base font-black uppercase text-primary">
                              {user.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-bold text-text">{user.name}</span>
                          <span className="truncate text-xs text-text-muted">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="py-1.5">
                      <button
                        id="theme-toggle-btn"
                        type="button"
                        onClick={toggleTheme}
                        className="group flex w-full cursor-pointer items-center justify-between px-4 py-2.5 transition-colors duration-200 hover:bg-primary/10"
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            iconName={themeConfig[theme].icon}
                            size={14}
                            className="text-text-muted transition-colors duration-200 group-hover:text-primary"
                          />
                          <span className="text-sm font-semibold text-text transition-colors duration-200 group-hover:text-primary">
                            {themeConfig[theme].label}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 rounded-lg bg-bg-main p-0.5">
                          {(["light", "dark", "system"] as const).map((mode) => (
                            <div
                              key={mode}
                              className={`rounded-md p-1 transition-all duration-200 ${
                                theme === mode ? "bg-primary text-bg-dark shadow-sm" : "text-text-muted"
                              }`}
                            >
                              <Icon iconName={themeConfig[mode].icon} size={10} />
                            </div>
                          ))}
                        </div>
                      </button>

                      <div className="mx-3 my-1 border-t border-border-muted" />

                      <button
                        id="logout-btn"
                        type="button"
                        onClick={handleLogout}
                        className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-danger/10"
                      >
                        <Icon
                          iconName="FaRightFromBracket"
                          size={14}
                          className="text-text-muted transition-colors duration-200 group-hover:text-danger"
                        />
                        <span className="text-sm font-semibold text-text transition-colors duration-200 group-hover:text-danger">
                          Sign Out
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import {
  LogOut,
  User,
  Settings,
  X,
  LucideGlobe,
  Users,
  Bell,
  UserPlus,
  UserCheck,
  UserX,
} from "lucide-react";

const Navbar = () => {
  const {
    logout,
    authUser,
    notifications,
    unreadCount,
    markAllNotificationsRead,
  } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const previousPath = useRef("/");
  const notificationRef = useRef(null);
  const notificationButtonRef = useRef(null);

  // Click outside to close notifications
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Kiểm tra xem click có phải từ notification button không
      if (
        notificationButtonRef.current &&
        notificationButtonRef.current.contains(event.target)
      ) {
        return; // Không đóng nếu click vào button
      }

      // Kiểm tra xem click có phải từ notification dropdown không
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  // Close notifications when navigating
  useEffect(() => {
    setShowNotifications(false);
  }, [location.pathname]);

  const toggleModal = () => {
    if (isModalOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setIsClosing(false);
      }, 300);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications((prev) => !prev);
    if (!showNotifications) {
      markAllNotificationsRead();
    }
  };

  return (
    <header className="bg-base-100 border-b border-base-300 fixed top-0 w-full z-50 backdrop-sm bg-base-100/90">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo Section */}
        <Link
          to="/"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity duration-300"
        >
          <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center">
            <LucideGlobe className="w-4 h-4 text-primary" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Talkify
          </span>
        </Link>

        {/* Navigation Buttons */}
        <nav className="flex items-center gap-3">
          {authUser && (
            <div className="relative">
              <button
                ref={notificationButtonRef}
                type="button"
                className="btn btn-sm btn-ghost flex items-center gap-1.5 hover:bg-base-200 rounded-lg transition-colors duration-300"
                aria-label="Open notifications"
                onClick={handleNotificationClick}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] flex items-center justify-center notification-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div
                  ref={notificationRef}
                  className="absolute right-0 mt-2 w-80 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto notification-dropdown"
                >
                  <div className="p-3 border-b font-semibold text-base-content flex items-center justify-between">
                    <span>Notifications</span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="btn btn-ghost btn-xs"
                      aria-label="Close notifications"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-base-content/60">
                      No notifications
                    </div>
                  ) : (
                    <ul>
                      {notifications.slice(0, 4).map((n, idx) => (
                        <li
                          key={n._id || idx}
                          className="px-4 py-4 border-b last:border-b-0 hover:bg-base-200/50 cursor-pointer transition-all duration-200 group"
                          onClick={() => {
                            setShowNotifications(false);
                            if (n.type === "friend_request")
                              navigate("/friends");
                            if (n.type === "friend_accepted")
                              navigate("/friends");
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                                n.type === "friend_request"
                                  ? "bg-primary animate-pulse"
                                  : n.type === "friend_accepted"
                                  ? "bg-success"
                                  : "bg-error"
                              }`}
                            ></div>
                            <div className="flex-1">
                              {n.type === "friend_request" && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <UserPlus
                                      size={16}
                                      className="text-primary"
                                    />
                                    <span className="font-medium text-base-content">
                                      New Friend Request
                                    </span>
                                  </div>
                                  <p className="text-sm text-base-content/60 mb-2">
                                    {n.message}
                                  </p>
                                </div>
                              )}
                              {n.type === "friend_accepted" && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <UserCheck
                                      size={16}
                                      className="text-success"
                                    />
                                    <span className="font-medium text-success">
                                      Friend Request Accepted
                                    </span>
                                  </div>
                                  <p className="text-sm text-base-content/60 mb-2">
                                    {n.message}
                                  </p>
                                </div>
                              )}
                              {n.type === "friend_declined" && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <UserX size={16} className="text-error" />
                                    <span className="font-medium text-error">
                                      Friend Request Declined
                                    </span>
                                  </div>
                                  <p className="text-sm text-base-content/60 mb-2">
                                    {n.message}
                                  </p>
                                </div>
                              )}
                              <div className="text-xs text-base-content/40 group-hover:text-base-content/60 transition-colors duration-200">
                                {new Date(n.createdAt).toLocaleString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          {authUser ? (
            <button
              type="button"
              onClick={toggleModal}
              aria-label={`Open user menu for ${authUser.fullName || "User"}`}
              aria-expanded={isModalOpen}
              className="btn btn-sm btn-ghost flex items-center gap-1.5 hover:bg-base-200 rounded-lg transition-colors duration-300"
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline text-sm font-medium">
                {authUser.fullName || "User"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (location.pathname === "/settings") {
                  navigate(previousPath.current);
                } else {
                  previousPath.current = location.pathname;
                  navigate("/settings");
                }
              }}
              aria-label="Navigate to settings page"
              className="btn btn-sm btn-ghost flex items-center gap-1.5 hover:bg-base-200 rounded-lg transition-colors duration-300"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline text-sm font-medium">
                Settings
              </span>
            </button>
          )}
        </nav>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-50 transition-opacity duration-300"
            onClick={toggleModal}
            aria-hidden="true"
            role="presentation"
          ></div>

          {/* Modal Content */}
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div
              className={`bg-base-100/80 border border-base-300 rounded-lg shadow-xl w-full max-w-sm p-6 font-sans ${
                isClosing ? "animate-fadeOut" : "animate-fadeIn"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-base-content">
                  User Menu
                </h2>
                <button
                  onClick={toggleModal}
                  className="btn btn-ghost btn-sm"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <Link
                  to="/profile"
                  onClick={toggleModal}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors duration-200"
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>

                <Link
                  to="/friends"
                  onClick={toggleModal}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors duration-200"
                >
                  <Users className="w-4 h-4" />
                  <span>Friends</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={toggleModal}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors duration-200"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>

                <button
                  onClick={() => {
                    toggleModal();
                    logout();
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors duration-200 w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Navbar;

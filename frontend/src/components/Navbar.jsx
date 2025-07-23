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
  House,
  Bell,
  UserPlus,
  UserCheck,
  UserX,
} from "lucide-react";
import socket from "../lib/socket";
import toast from "react-hot-toast";

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
  const [localUnread, setLocalUnread] = useState(0);

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

  useEffect(() => {
    if (!authUser) return;
    socket.connect();
    const handlePostNotification = (notification) => {
      // Xác định loại toast
      let toastType = "info";
      if (
        notification.type === "friend_declined" ||
        notification.type === "error"
      )
        toastType = "error";
      if (
        notification.type === "friend_accepted" ||
        notification.type === "success"
      )
        toastType = "success";
      // Nội dung tiếng Anh
      let toastMsg = notification.message;
      if (notification.type === "post_like")
        toastMsg = "Someone liked your post!";
      if (notification.type === "post_comment")
        toastMsg = "Someone commented on your post!";
      if (notification.type === "comment_reply")
        toastMsg = "Someone replied to your comment!";
      if (notification.type === "friend_request")
        toastMsg = "You have a new friend request!";
      if (notification.type === "friend_accepted")
        toastMsg = "You're now friends!";
      if (notification.type === "friend_declined")
        toastMsg = "Friend request declined.";
      // Hiện toast notification
      toast.custom((t) => (
        <div
          className={`bg-base-100 border px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            toastType === "error"
              ? "border-red-500"
              : toastType === "success"
              ? "border-green-500"
              : "border-blue-500"
          }`}
          style={{ minWidth: 220 }}
        >
          <Bell
            className={`w-5 h-5 ${
              toastType === "error"
                ? "text-red-500"
                : toastType === "success"
                ? "text-green-500"
                : "text-blue-500"
            }`}
          />
          <div>
            <div
              className={`font-semibold ${
                toastType === "error"
                  ? "text-red-500"
                  : toastType === "success"
                  ? "text-green-500"
                  : "text-blue-500"
              }`}
            >
              {toastType === "error"
                ? "Error"
                : toastType === "success"
                ? "Success"
                : "Notification"}
            </div>
            <div className="text-sm">{toastMsg}</div>
          </div>
          <button
            className="ml-auto btn btn-xs btn-ghost"
            onClick={() => toast.dismiss(t.id)}
          >
            &times;
          </button>
        </div>
      ));
      // Thêm vào danh sách notification (không ghi đè, không phân tách)
      if (typeof window !== "undefined" && window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent("newPostNotification", {
            detail: { ...notification, toastMsg },
          })
        );
      }
      setLocalUnread((c) => c + 1);
    };
    socket.on("postNotification", handlePostNotification);
    return () => {
      socket.off("postNotification", handlePostNotification);
      socket.disconnect();
    };
  }, [authUser]);

  // Lắng nghe event để thêm notification bài viết vào store (nếu store không có sẵn logic này)
  useEffect(() => {
    const handler = (e) => {
      if (typeof window !== "undefined" && window.addNotification) {
        window.addNotification(e.detail);
      }
    };
    window.addEventListener("newPostNotification", handler);
    return () => window.removeEventListener("newPostNotification", handler);
  }, []);

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
      setLocalUnread(0);
      markAllNotificationsRead && markAllNotificationsRead();
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
          {/* Bell notification realtime */}
          <div className="relative">
            <button
              ref={notificationButtonRef}
              type="button"
              className="btn btn-sm btn-ghost flex items-center gap-1.5 hover:bg-base-200 rounded-lg transition-colors duration-300"
              aria-label="Open notifications"
              onClick={handleNotificationClick}
            >
              <Bell className="w-5 h-5" />
              {(localUnread > 0 || unreadCount > 0) && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] flex items-center justify-center notification-badge">
                  {localUnread + unreadCount > 99
                    ? "99+"
                    : localUnread + unreadCount}
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
                    {notifications
                      .filter((n) =>
                        [
                          "friend_request",
                          "friend_accepted",
                          "post_like",
                          "post_comment",
                          "comment_reply",
                        ].includes(n.type)
                      )
                      .slice(0, 10)
                      .map((n, idx) => {
                        // Cá nhân hóa nội dung
                        let mainMsg = "Notification";
                        if (n.type === "friend_request") {
                          mainMsg = n.senderName
                            ? `${n.senderName} sent you a friend request`
                            : "You have a new friend request!";
                        } else if (n.type === "friend_accepted") {
                          mainMsg = n.senderName
                            ? `${n.senderName} accepted your friend request`
                            : "Your friend request was accepted!";
                        } else if (n.type === "post_like") {
                          mainMsg = n.senderName
                            ? `${n.senderName} liked your post`
                            : "You got a like!";
                        } else if (n.type === "post_comment") {
                          mainMsg = n.senderName
                            ? `${n.senderName} commented on your post`
                            : "You got a comment!";
                        } else if (n.type === "comment_reply") {
                          mainMsg = n.senderName
                            ? `${n.senderName} replied to your comment`
                            : "You got a reply!";
                        }
                        return (
                          <li
                            key={n._id || idx}
                            className="px-4 py-4 border-b last:border-b-0 hover:bg-base-200/50 cursor-pointer transition-all duration-200 group"
                            onClick={() => {
                              setShowNotifications(false);
                              if (
                                n.type === "friend_request" ||
                                n.type === "friend_accepted"
                              )
                                navigate("/friends");
                              // Nếu là post_like, post_comment, comment_reply thì mở modal bài viết
                              if (
                                [
                                  "post_like",
                                  "post_comment",
                                  "comment_reply",
                                ].includes(n.type) &&
                                n.post
                              ) {
                                navigate(`/feed?postId=${n.post}`);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 bg-primary animate-pulse"></div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Bell size={16} className="text-primary" />
                                  <span className="font-medium text-base-content">
                                    {mainMsg}
                                  </span>
                                </div>
                                {n.message && (
                                  <p className="text-sm text-base-content/60 mb-2">
                                    {n.message}
                                  </p>
                                )}
                                <div className="text-xs text-base-content/40 group-hover:text-base-content/60 transition-colors duration-200">
                                  {new Date(
                                    n.createdAt || Date.now()
                                  ).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            )}
          </div>
          {/* End Bell notification */}
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
                  to="/feed"
                  onClick={toggleModal}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors duration-200"
                >
                  <House className="w-4 h-4" />
                  <span>Feed</span>
                </Link>

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

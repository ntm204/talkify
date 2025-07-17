import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore";

const BASE_URL =
  import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) =>
    set((state) => {
      // Kiểm tra xem notification đã tồn tại chưa
      const existingIndex = state.notifications.findIndex(
        (n) => n._id === notification._id
      );

      let newNotifications;
      if (existingIndex !== -1) {
        // Cập nhật notification hiện có
        newNotifications = [...state.notifications];
        newNotifications[existingIndex] = notification;
      } else {
        // Thêm notification mới
        newNotifications = [notification, ...state.notifications];
        if (newNotifications.length > 4) newNotifications.length = 4;
      }

      return {
        notifications: newNotifications,
        unreadCount: notification.isRead
          ? state.unreadCount
          : state.unreadCount + 1,
      };
    }),

  markAllNotificationsRead: async () => {
    try {
      await axiosInstance.patch("/notifications/mark-all-read");
      set((state) => ({
        unreadCount: 0,
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  },

  markNotificationAsRead: async (notificationId) => {
    try {
      await axiosInstance.patch(`/notifications/${notificationId}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  },

  fetchNotifications: async () => {
    try {
      const res = await axiosInstance.get("/notifications");
      set({ notifications: res.data });
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await axiosInstance.get("/notifications/unread-count");
      set({ unreadCount: res.data.count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating account");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error logging in");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null, notifications: [], unreadCount: 0 });
      useChatStore.getState().reset(); // Reset toàn bộ state chat khi logout
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error logging out");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message || "Error updating profile");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: { userId: authUser._id },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    set({ socket });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      useChatStore.getState().subscribeToMessages();
      // Fetch notifications when socket connects
      get().fetchNotifications();
      get().fetchUnreadCount();
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      useChatStore.getState().unsubscribeFromMessages();
      set({ socket: null });
    });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("friendRequestNotification", (notification) => {
      console.log("Received notification:", notification);
      get().addNotification(notification);
    });

    socket.on("allNotificationsRead", () => {
      set((state) => ({
        unreadCount: 0,
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    });

    socket.on("friendshipUpdate", (update) => {
      // Handle real-time friendship updates
      const { type, request, friendship } = update;
      console.log("Friendship update received:", type);

      // Trigger appropriate store updates based on type
      if (
        type === "new_friend_request" ||
        type === "request_accepted" ||
        type === "request_declined" ||
        type === "request_cancelled" ||
        type === "unfriended"
      ) {
        // Refresh friendship data
        useChatStore.getState().fetchFriends();
        useChatStore.getState().fetchSentRequests();
        useChatStore.getState().fetchReceivedRequests();
      }
    });

    socket.on("userSettingsUpdate", (update) => {
      // Handle user settings updates
      const { userId, allowStrangerMessage } = update;
      const { authUser } = get();

      if (authUser && authUser._id === userId) {
        set({ authUser: { ...authUser, allowStrangerMessage } });
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect error:", err.message);
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket && socket.connected) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));

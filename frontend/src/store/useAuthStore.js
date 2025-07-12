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
      const newNotifications = [notification, ...state.notifications];
      if (newNotifications.length > 4) newNotifications.length = 4;
      return {
        notifications: newNotifications,
        unreadCount: state.unreadCount + 1,
      };
    }),
  markAllNotificationsRead: () =>
    set((state) => ({
      unreadCount: 0,
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

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
      set({ authUser: null });
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
      get().addNotification(notification);
    });

    socket.on("friendshipUpdate", (update) => {
      // Handle real-time friendship updates
      const { type, request, friendship } = update;
      console.log("Friendship update received:", type);

      // Trigger appropriate store updates based on type
      if (
        type === "new_received_request" ||
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

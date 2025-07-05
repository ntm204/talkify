import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, users } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const newMessage = res.data;
      // Cập nhật messages
      set({ messages: [...messages, newMessage] });
      // Cập nhật lastMessage trong users
      const updatedUsers = users.map((user) =>
        user._id === selectedUser._id
          ? {
              ...user,
              lastMessage: {
                text: newMessage.text,
                image: newMessage.image,
                createdAt: newMessage.createdAt,
                isSentByLoggedInUser: true,
              },
            }
          : user
      );
      set({ users: updatedUsers });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages, users } = get();
      const loggedInUserId = useAuthStore.getState().user?._id;

      // Xác định userId liên quan (người gửi hoặc người nhận)
      const relatedUserId =
        newMessage.senderId === loggedInUserId
          ? newMessage.receiverId
          : newMessage.senderId;

      // Cập nhật messages nếu tin nhắn từ hoặc gửi đến selectedUser
      if (
        selectedUser &&
        (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id)
      ) {
        set({
          messages: [...messages, newMessage],
        });
      }

      // Cập nhật lastMessage trong users
      const updatedUsers = users.map((user) =>
        user._id === relatedUserId
          ? {
              ...user,
              lastMessage: {
                text: newMessage.text,
                image: newMessage.image,
                createdAt: newMessage.createdAt,
                isSentByLoggedInUser: newMessage.senderId === loggedInUserId,
              },
            }
          : user
      );
      set({ users: updatedUsers });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));

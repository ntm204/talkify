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
  typingUsers: [],

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      const sortedUsers = res.data.sort((a, b) => {
        const aTime = a.lastMessage
          ? new Date(a.lastMessage.createdAt).getTime()
          : 0;
        const bTime = b.lastMessage
          ? new Date(b.lastMessage.createdAt).getTime()
          : 0;
        return bTime - aTime;
      });
      set({ users: sortedUsers });
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
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      const newMessage = res.data;
      set({ messages: [...messages, newMessage] });

      const updatedUsers = users
        .map((user) =>
          user._id === selectedUser._id
            ? {
                ...user,
                lastMessage: {
                  text: newMessage.text,
                  image: newMessage.image,
                  sticker: newMessage.sticker, // Thêm sticker vào đây
                  createdAt: newMessage.createdAt,
                  isSentByLoggedInUser: true,
                },
              }
            : user
        )
        .sort((a, b) => {
          const aTime = a.lastMessage
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0;
          const bTime = b.lastMessage
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0;
          return bTime - aTime;
        });
      set({ users: updatedUsers });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("typing");
    socket.off("stopTyping");

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages, users } = get();
      const loggedInUserId = useAuthStore.getState().authUser?._id;

      const relatedUserId =
        newMessage.senderId === loggedInUserId
          ? newMessage.receiverId
          : newMessage.senderId;

      if (
        selectedUser &&
        (newMessage.senderId === selectedUser._id ||
          newMessage.receiverId === selectedUser._id)
      ) {
        set({ messages: [...messages, newMessage] });

        if (newMessage.senderId === selectedUser._id) {
          set((state) => ({
            typingUsers: state.typingUsers.filter(
              (id) => id !== newMessage.senderId
            ),
          }));
        }
      }

      const updatedUsers = users
        .map((user) =>
          user._id === relatedUserId
            ? {
                ...user,
                lastMessage: {
                  text: newMessage.text,
                  image: newMessage.image,
                  sticker: newMessage.sticker, // Thêm sticker vào đây
                  createdAt: newMessage.createdAt,
                  isSentByLoggedInUser: newMessage.senderId === loggedInUserId,
                },
              }
            : user
        )
        .sort((a, b) => {
          const aTime = a.lastMessage
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0;
          const bTime = b.lastMessage
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0;
          return bTime - aTime;
        });
      set((state) => ({ users: [...updatedUsers] }));
    });

    // NEW: Handle typing event
    socket.on("typing", (senderId) => {
      const { selectedUser } = get();
      if (selectedUser && senderId === selectedUser._id) {
        set((state) => {
          if (!state.typingUsers.includes(senderId)) {
            return { typingUsers: [...state.typingUsers, senderId] };
          }
          return state;
        });
      }
    });

    socket.on("stopTyping", (senderId) => {
      const { selectedUser } = get();
      if (selectedUser && senderId === selectedUser._id) {
        set((state) => ({
          typingUsers: state.typingUsers.filter((id) => id !== senderId),
        }));
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("typing");
      socket.off("stopTyping");
    }

    set({ typingUsers: [] });
  },

  sendTypingStatus: (isTyping) => {
    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();
    const { selectedUser } = get();

    if (!socket || !authUser || !selectedUser) return;

    if (isTyping) {
      socket.emit("typing", {
        receiverId: selectedUser._id,
        senderId: authUser._id,
      });
    } else {
      socket.emit("stopTyping", {
        receiverId: selectedUser._id,
        senderId: authUser._id,
      });
    }
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser, typingUsers: [] });
  },
}));

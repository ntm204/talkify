import { create } from "zustand";
import toast from "react-hot-toast";
import {
  axiosInstance,
  fetchFriends,
  fetchSentRequests,
  fetchReceivedRequests,
  acceptFriendRequest as apiAcceptFriendRequest,
  declineFriendRequest as apiDeclineFriendRequest,
  cancelFriendRequest as apiCancelFriendRequest,
  searchUsers as apiSearchUsers,
  sendFriendRequest as apiSendFriendRequest,
  unfriend as apiUnfriend,
} from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: [],
  friends: [],
  isFriendsLoading: false,
  sentRequests: [],
  receivedRequests: [],
  isSentRequestsLoading: false,
  isReceivedRequestsLoading: false,
  globalSearchResults: [],
  isGlobalSearchLoading: false,

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

      // Cập nhật messages nếu đang mở đúng cuộc trò chuyện
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

      // Tạo preview cho lastMessage
      let previewText = "";
      if (newMessage.text) previewText = newMessage.text;
      else if (newMessage.image) previewText = "[Photo]";
      else if (newMessage.sticker) previewText = "[Sticker]";
      // Nếu có unsent, bạn có thể bổ sung logic ở đây

      // Update users list: đẩy user có tin nhắn mới lên đầu
      let updatedUsers = users.map((user) => {
        if (user._id === relatedUserId) {
          return {
            ...user,
            lastMessage: {
              text: newMessage.text,
              image: newMessage.image,
              sticker: newMessage.sticker,
              createdAt: newMessage.createdAt,
              isSentByLoggedInUser: newMessage.senderId === loggedInUserId,
              // previewText: previewText, // nếu muốn dùng trực tiếp
            },
          };
        }
        return user;
      });
      // Đẩy user có tin nhắn mới lên đầu
      const idx = updatedUsers.findIndex((u) => u._id === relatedUserId);
      if (idx > -1) {
        const [userToTop] = updatedUsers.splice(idx, 1);
        updatedUsers = [userToTop, ...updatedUsers];
      }
      set((state) => ({ users: [...updatedUsers] }));
    });

    // Handle typing event
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

    // Handle friendship updates
    socket.on("friendshipUpdate", (update) => {
      const { type } = update;
      console.log("Friendship update in chat store:", type);

      // Refresh relevant data based on update type
      if (
        type === "new_received_request" ||
        type === "request_accepted" ||
        type === "request_declined" ||
        type === "request_cancelled" ||
        type === "unfriended"
      ) {
        // Small delay to ensure backend has processed the update
        setTimeout(() => {
          get().fetchFriends();
          get().fetchSentRequests();
          get().fetchReceivedRequests();
        }, 100);
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

  fetchFriends: async () => {
    set({ isFriendsLoading: true });
    try {
      const data = await fetchFriends();
      set({ friends: data });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Error fetching friends list"
      );
    } finally {
      set({ isFriendsLoading: false });
    }
  },

  fetchSentRequests: async () => {
    set({ isSentRequestsLoading: true });
    try {
      const data = await fetchSentRequests();
      set({ sentRequests: data });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Error fetching sent requests"
      );
    } finally {
      set({ isSentRequestsLoading: false });
    }
  },

  fetchReceivedRequests: async () => {
    set({ isReceivedRequestsLoading: true });
    try {
      const data = await fetchReceivedRequests();
      set({ receivedRequests: data });
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Error fetching received requests"
      );
    } finally {
      set({ isReceivedRequestsLoading: false });
    }
  },

  acceptFriendRequest: async (requesterId) => {
    try {
      await apiAcceptFriendRequest(requesterId);
      await get().fetchReceivedRequests();
      await get().fetchFriends();
      toast.success("Friend request accepted");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Error accepting friend request"
      );
    }
  },

  declineFriendRequest: async (requesterId) => {
    try {
      await apiDeclineFriendRequest(requesterId);
      await get().fetchReceivedRequests();
      toast.success("Friend request declined");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Error declining friend request"
      );
    }
  },

  cancelFriendRequest: async (recipientId) => {
    try {
      await apiCancelFriendRequest(recipientId);
      await get().fetchSentRequests();
      toast.success("Friend request cancelled");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Error cancelling friend request"
      );
    }
  },

  searchUsersGlobal: async (query, excludeFriends = false) => {
    set({ isGlobalSearchLoading: true });
    try {
      const data = await apiSearchUsers(query, excludeFriends);
      set({ globalSearchResults: data });
    } catch (error) {
      set({ globalSearchResults: [] });
    } finally {
      set({ isGlobalSearchLoading: false });
    }
  },

  sendFriendRequest: async (recipientId) => {
    try {
      await apiSendFriendRequest(recipientId);
      toast.success("Friend request sent");
      // Có thể fetch lại sentRequests nếu muốn
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Error sending friend request"
      );
    }
  },

  unfriend: async (friendId) => {
    try {
      await apiUnfriend(friendId);
      await get().fetchFriends();
      toast.success("Unfriended successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error unfriending");
    }
  },
}));

import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5001/api"
      : "/api",
  withCredentials: true,
});

export const fetchFriends = async () => {
  const res = await axiosInstance.get("/friends/list");
  return res.data;
};

export const fetchSentRequests = async () => {
  const res = await axiosInstance.get("/friends/sent");
  return res.data;
};

export const fetchReceivedRequests = async () => {
  const res = await axiosInstance.get("/friends/received");
  return res.data;
};

export const acceptFriendRequest = async (requesterId) => {
  const res = await axiosInstance.post("/friends/accept", { requesterId });
  return res.data;
};

export const declineFriendRequest = async (requesterId) => {
  const res = await axiosInstance.post("/friends/decline", { requesterId });
  return res.data;
};

export const cancelFriendRequest = async (recipientId) => {
  const res = await axiosInstance.post("/friends/cancel", { recipientId });
  return res.data;
};

export const unfriend = async (friendId) => {
  const res = await axiosInstance.post("/friends/unfriend", { friendId });
  return res.data;
};

export const searchUsers = async (query, excludeFriends = false) => {
  const res = await axiosInstance.get("/auth/search-users", {
    params: { query, excludeFriends },
  });
  return res.data;
};

export const sendFriendRequest = async (recipientId) => {
  const res = await axiosInstance.post("/friends/request", { recipientId });
  return res.data;
};

export const fetchFriendCount = async (userId) => {
  const res = await axiosInstance.get(`/friends/count/${userId}`);
  return res.data.count;
};

export const updateAllowStrangerMessage = async (allowStrangerMessage) => {
  const res = await axiosInstance.patch("/auth/stranger-message", {
    allowStrangerMessage,
  });
  return res.data;
};

export const canMessage = async (userId) => {
  const res = await axiosInstance.get(`/friends/can-message/${userId}`);
  return res.data.canMessage;
};

import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import Friendship from "../models/friendship.model.js";
import { sendNotificationToUser, sendFriendshipUpdate } from "../lib/socket.js";

// Lấy tất cả thông báo của người dùng
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "fullName profilePic")
      .populate("friendship")
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error getting notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Đánh dấu một thông báo đã đọc
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(200).json(notification);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Đánh dấu tất cả thông báo đã đọc
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
    // Gửi realtime update
    sendNotificationToUser(userId, {
      type: "all_read",
      message: "All notifications marked as read",
      timestamp: new Date(),
    });
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Lấy số lượng thông báo chưa đọc
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });
    res.status(200).json({ count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Xóa một thông báo
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId,
    });
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Tạo thông báo (dùng nội bộ)
export const createNotification = async (
  recipientId,
  senderId,
  type,
  friendshipId,
  message
) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      friendship: friendshipId,
      message,
    });
    await notification.save();
    // Lấy thông tin sender để gửi realtime
    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "fullName profilePic")
      .populate("friendship");
    // Gửi thông báo realtime
    sendNotificationToUser(recipientId, {
      _id: notification._id,
      type,
      message,
      sender: populatedNotification.sender,
      friendship: populatedNotification.friendship,
      isRead: false,
      createdAt: notification.createdAt,
      timestamp: new Date(),
    });
    return populatedNotification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Tạo thông báo liên quan kết bạn
export const createFriendshipNotification = async (
  recipientId,
  senderId,
  type,
  friendshipId,
  customMessage = null
) => {
  try {
    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);
    let message = customMessage;
    if (!message) {
      switch (type) {
        case "friend_request":
          message = `${sender.fullName} sent you a friend request`;
          break;
        case "friend_accepted":
          message = `${sender.fullName} accepted your friend request`;
          break;
        default:
          message = "You have a new notification";
      }
    }
    return await createNotification(
      recipientId,
      senderId,
      type,
      friendshipId,
      message
    );
  } catch (error) {
    console.error("Error creating friendship notification:", error);
    throw error;
  }
};

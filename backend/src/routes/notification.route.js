import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} from "../controllers/notification.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(protectRoute);

// Lấy tất cả thông báo
router.get("/", getNotifications);

// Đếm số thông báo chưa đọc
router.get("/unread-count", getUnreadCount);

// Đánh dấu thông báo đã đọc
router.patch("/:notificationId/read", markAsRead);

// Đánh dấu tất cả thông báo đã đọc
router.patch("/mark-all-read", markAllAsRead);

// Xóa thông báo
router.delete("/:notificationId", deleteNotification);

export default router;

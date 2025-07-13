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

router.use(protectRoute);

router.get("/", getNotifications);

router.get("/unread-count", getUnreadCount);

router.patch("/:notificationId/read", markAsRead);

router.patch("/mark-all-read", markAllAsRead);

router.delete("/:notificationId", deleteNotification);

export default router;

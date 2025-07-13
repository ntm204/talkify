// Định nghĩa các endpoint API cho chức năng kết bạn
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  getFriends,
  getSentRequests,
  getReceivedRequests,
  getFriendCount,
  canMessage,
  unfriend,
} from "../controllers/friendship.controller.js";

const router = express.Router();

// Các endpoint thao tác với lời mời kết bạn
router.post("/request", protectRoute, sendFriendRequest);
router.post("/accept", protectRoute, acceptFriendRequest);
router.post("/decline", protectRoute, declineFriendRequest);
router.post("/cancel", protectRoute, cancelFriendRequest);
router.post("/unfriend", protectRoute, unfriend);
// Các endpoint lấy danh sách, kiểm tra, đếm bạn bè
router.get("/list", protectRoute, getFriends);
router.get("/sent", protectRoute, getSentRequests);
router.get("/received", protectRoute, getReceivedRequests);
router.get("/count/:userId", protectRoute, getFriendCount);
router.get("/can-message/:userId", protectRoute, canMessage);

export default router;

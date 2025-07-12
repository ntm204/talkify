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

router.post("/request", protectRoute, sendFriendRequest);
router.post("/accept", protectRoute, acceptFriendRequest);
router.post("/decline", protectRoute, declineFriendRequest);
router.post("/cancel", protectRoute, cancelFriendRequest);
router.post("/unfriend", protectRoute, unfriend);
router.get("/list", protectRoute, getFriends);
router.get("/sent", protectRoute, getSentRequests);
router.get("/received", protectRoute, getReceivedRequests);
router.get("/count/:userId", protectRoute, getFriendCount);
router.get("/can-message/:userId", protectRoute, canMessage);

export default router;

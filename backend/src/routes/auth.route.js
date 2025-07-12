import express from "express";
import {
  checkAuth,
  login,
  logout,
  signup,
  updateProfile,
  updateAllowStrangerMessage,
  searchUsers,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);
router.patch("/stranger-message", protectRoute, updateAllowStrangerMessage);

router.get("/check", protectRoute, checkAuth);
router.get("/search-users", protectRoute, searchUsers);

export default router;

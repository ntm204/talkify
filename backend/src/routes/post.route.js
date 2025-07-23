import express from "express";
import * as postController from "../controllers/post.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Tạo bài viết mới
router.post("/", protectRoute, postController.createPost);
// Lấy danh sách bài viết (feed, infinite scroll)
router.get("/", protectRoute, postController.getPosts);
// Lấy bài viết theo user (profile)
router.get("/user/:userId", protectRoute, postController.getPostsByUser);
// Lấy chi tiết bài viết
router.get("/:id", protectRoute, postController.getPostById);
// Sửa bài viết
router.put("/:id", protectRoute, postController.updatePost);
// Xoá bài viết
router.delete("/:id", protectRoute, postController.deletePost);
// Ghim bài viết
router.post("/:id/pin", protectRoute, postController.pinPost);
// Đổi quyền riêng tư
router.post("/:id/privacy", protectRoute, postController.changePrivacy);
// Like/Unlike bài viết (toggle)
router.post("/:id/like", protectRoute, postController.likePost);
// Lấy danh sách like
router.get("/:id/likes", protectRoute, postController.getLikes);
// Comment/Reply
router.post("/:id/comment", protectRoute, postController.commentPost);
router.post(
  "/comment/:commentId/reply",
  protectRoute,
  postController.replyComment
);
// Lấy danh sách comment
router.get("/:id/comments", protectRoute, postController.getComments);

export default router;

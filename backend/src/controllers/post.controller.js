import Post from "../models/post.model.js";
import Like from "../models/like.model.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import Comment from "../models/comment.model.js";
import Friendship from "../models/friendship.model.js";
import {
  sendPostLikeUpdate,
  sendPostCommentUpdate,
  sendPostNotification,
} from "../lib/socket.js";

export const createPost = async (req, res) => {
  try {
    console.log("[createPost] req.user:", req.user);
    console.log("[createPost] req.body:", req.body);
    const { content, media, privacy, background, feeling } = req.body;
    const userId = req.user?._id;

    // Validate
    if (!userId) {
      console.error("[createPost] Missing userId (not authenticated)");
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!content && (!media || media.length === 0)) {
      console.error("[createPost] Missing content or media");
      return res.status(400).json({ message: "Content or media is required" });
    }
    if (privacy && !["public", "friends", "private"].includes(privacy)) {
      console.error("[createPost] Invalid privacy:", privacy);
      return res.status(400).json({ message: "Invalid privacy value" });
    }

    const post = await Post.create({
      user: userId,
      content: content || "",
      media: media || [],
      privacy: privacy || "public",
      background: background || "",
      feeling: feeling || { icon: "", label: "" },
    });

    // Populate user info cho realtime
    const populatedPost = await Post.findById(post._id)
      .populate("user", "_id fullName profilePic")
      .lean();
    // Emit realtime nếu là public hoặc friends
    if (["public", "friends"].includes(populatedPost.privacy)) {
      const { io } = await import("../lib/socket.js");
      io.emit("newPost", populatedPost);
    }

    res.status(201).json({ post });
  } catch (error) {
    console.error("[createPost] Error:", error);
    res.status(500).json({ message: error.message || "Failed to create post" });
  }
};

export const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    // Lấy bài public, bài friend chỉ cho bạn bè hoặc chủ post
    const userId = req.user?._id;
    // Lấy tất cả bài public
    let publicPosts = await Post.find({ deleted: false, privacy: "public" })
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user", "_id fullName profilePic")
      .lean();
    // Lấy bài friend mà user là bạn bè hoặc chủ post
    let friendPosts = [];
    if (userId) {
      // Lấy danh sách bạn bè
      const friendships = await Friendship.find({
        $or: [
          { requester: userId, status: "accepted" },
          { recipient: userId, status: "accepted" },
        ],
      });
      const friendIds = friendships.map((f) =>
        f.requester.toString() === userId.toString()
          ? f.recipient.toString()
          : f.requester.toString()
      );
      friendPosts = await Post.find({
        deleted: false,
        privacy: "friends",
        $or: [{ user: { $in: friendIds } }, { user: userId }],
      })
        .sort({ pinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("user", "_id fullName profilePic")
        .lean();
    }
    // Gộp và sort lại
    const posts = [...publicPosts, ...friendPosts].sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned - a.pinned;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    // Thêm likedByMe cho từng post
    let userIdStr = userId ? userId.toString() : null;
    if (userIdStr) {
      const postIds = posts.map((p) => p._id);
      const liked = await Like.find({
        post: { $in: postIds },
        user: userIdStr,
      });
      const likedSet = new Set(liked.map((l) => l.post.toString()));
      posts.forEach((p) => {
        p.likedByMe = likedSet.has(p._id.toString());
      });
    } else {
      posts.forEach((p) => (p.likedByMe = false));
    }
    res.json({ posts });
  } catch (error) {
    console.error("Error getPosts:", error);
    res.status(500).json({ message: "Lấy danh sách bài viết thất bại" });
  }
};

export const getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const currentUserId = req.user._id.toString();
    // Nếu là profile của chính mình thì lấy tất cả
    if (currentUserId === userId) {
      const posts = await Post.find({ user: userId, deleted: false })
        .sort({ pinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("user", "_id fullName profilePic")
        .lean();
      // Thêm likedByMe cho từng post
      let userIdStr = currentUserId;
      if (userIdStr) {
        const postIds = posts.map((p) => p._id);
        const liked = await Like.find({
          post: { $in: postIds },
          user: userIdStr,
        });
        const likedSet = new Set(liked.map((l) => l.post.toString()));
        posts.forEach((p) => {
          p.likedByMe = likedSet.has(p._id.toString());
        });
      } else {
        posts.forEach((p) => (p.likedByMe = false));
      }
      return res.json({ posts });
    }
    // Kiểm tra bạn bè
    const friendship = await Friendship.findOne({
      $or: [
        { requester: currentUserId, recipient: userId, status: "accepted" },
        { requester: userId, recipient: currentUserId, status: "accepted" },
      ],
    });
    const posts = await Post.find({
      user: userId,
      deleted: false,
      $or: [
        { privacy: "public" },
        { privacy: "friends", ...(friendship ? {} : { _id: null }) },
      ],
    })
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user", "_id fullName profilePic")
      .lean();
    // Thêm likedByMe cho từng post
    let userIdStr = currentUserId;
    if (userIdStr) {
      const postIds = posts.map((p) => p._id);
      const liked = await Like.find({
        post: { $in: postIds },
        user: userIdStr,
      });
      const likedSet = new Set(liked.map((l) => l.post.toString()));
      posts.forEach((p) => {
        p.likedByMe = likedSet.has(p._id.toString());
      });
    } else {
      posts.forEach((p) => (p.likedByMe = false));
    }
    res.json({ posts });
  } catch (error) {
    console.error("Error getPostsByUser:", error);
    res.status(500).json({ message: "Lấy bài viết theo user thất bại" });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id)
      .populate("user", "_id fullName profilePic")
      .lean();
    if (!post || post.deleted) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }
    const userId = req.user._id.toString();
    // Nếu là private chỉ chủ post mới xem được
    if (post.privacy === "private" && userId !== post.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Không có quyền xem bài viết này" });
    }
    // Nếu là friends chỉ bạn bè hoặc chủ post mới xem được
    if (post.privacy === "friends" && userId !== post.user._id.toString()) {
      const friendship = await Friendship.findOne({
        $or: [
          { requester: userId, recipient: post.user._id, status: "accepted" },
          { requester: post.user._id, recipient: userId, status: "accepted" },
        ],
      });
      if (!friendship) {
        return res
          .status(403)
          .json({ message: "Không có quyền xem bài viết này" });
      }
    }
    // Trả về likedByMe và likeCount
    const likeCount = await Like.countDocuments({ post: id });
    const likedByMe = await Like.exists({ post: id, user: userId });
    res.json({ post: { ...post, likeCount, likedByMe: !!likedByMe } });
  } catch (error) {
    console.error("Error getPostById:", error);
    res.status(500).json({ message: "Lấy chi tiết bài viết thất bại" });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, media, privacy, background, feeling } = req.body;
    const userId = req.user._id;
    const post = await Post.findById(id);
    if (!post || post.deleted) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }
    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Chỉ chủ bài viết mới được sửa" });
    }
    if (content !== undefined) post.content = content;
    if (media !== undefined) post.media = media;
    if (privacy !== undefined) post.privacy = privacy;
    if (background !== undefined) post.background = background;
    if (feeling !== undefined) post.feeling = feeling;
    await post.save();
    res.json({ post });
  } catch (error) {
    console.error("Error updatePost:", error);
    res.status(500).json({ message: "Sửa bài viết thất bại" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const post = await Post.findById(id);
    if (!post || post.deleted) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }
    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Chỉ chủ bài viết mới được xoá" });
    }
    post.deleted = true;
    await post.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error deletePost:", error);
    res.status(500).json({ message: "Xoá bài viết thất bại" });
  }
};

export const pinPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const post = await Post.findById(id);
    if (!post || post.deleted) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }
    if (post.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Chỉ chủ bài viết mới được ghim" });
    }
    post.pinned = true;
    await post.save();
    res.json({ post });
  } catch (error) {
    console.error("Error pinPost:", error);
    res.status(500).json({ message: "Ghim bài viết thất bại" });
  }
};

export const changePrivacy = async (req, res) => {
  try {
    const { id } = req.params;
    const { privacy } = req.body;
    const userId = req.user._id;
    const post = await Post.findById(id);
    if (!post || post.deleted) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }
    if (post.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Chỉ chủ bài viết mới được đổi quyền riêng tư" });
    }
    if (!privacy || !["public", "friends", "private"].includes(privacy)) {
      return res.status(400).json({ message: "Giá trị privacy không hợp lệ" });
    }
    post.privacy = privacy;
    await post.save();
    res.json({ post });
  } catch (error) {
    console.error("Error changePrivacy:", error);
    res.status(500).json({ message: "Đổi quyền riêng tư thất bại" });
  }
};

export const likePost = async (req, res) => {
  try {
    const { id } = req.params; // postId
    const userId = req.user._id;
    const post = await Post.findById(id);
    if (!post || post.deleted) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }
    // Kiểm tra đã like chưa
    const existingLike = await Like.findOne({ post: id, user: userId });
    if (existingLike) {
      // Nếu đã like thì unlike (toggle)
      await existingLike.deleteOne();
      post.likeCount = Math.max(0, post.likeCount - 1);
      await post.save();
      // Emit realtime update
      sendPostLikeUpdate(id, post.likeCount, userId);
      return res.json({ liked: false, likeCount: post.likeCount });
    } else {
      // Nếu chưa like thì tạo like
      await Like.create({ post: id, user: userId });
      post.likeCount += 1;
      await post.save();
      // Emit realtime update
      sendPostLikeUpdate(id, post.likeCount, userId);
      // Gửi notification nếu không phải tự like
      if (post.user.toString() !== userId.toString()) {
        const notification = await Notification.create({
          recipient: post.user,
          sender: userId,
          type: "post_like",
          post: id,
          message: `${req.user.fullName} liked your post!`,
        });
        sendPostNotification(post.user, notification);
      }
      return res.json({ liked: true, likeCount: post.likeCount });
    }
  } catch (error) {
    console.error("Error likePost:", error);
    res.status(500).json({ message: "Like/unlike bài viết thất bại" });
  }
};

export const getLikes = async (req, res) => {
  try {
    const { id } = req.params; // postId
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const likes = await Like.find({ post: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user", "_id fullName profilePic")
      .lean();
    res.json({ likes });
  } catch (error) {
    console.error("Error getLikes:", error);
    res.status(500).json({ message: "Lấy danh sách like thất bại" });
  }
};

export const commentPost = async (req, res) => {
  try {
    const { id } = req.params; // postId
    const { content } = req.body;
    const userId = req.user._id;
    if (!content || !content.trim()) {
      return res
        .status(400)
        .json({ message: "Nội dung bình luận không được để trống" });
    }
    const post = await Post.findById(id);
    if (!post || post.deleted) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }
    let comment = await Comment.create({
      post: id,
      user: userId,
      content,
      parentId: null,
    });
    post.commentCount += 1;
    await post.save();
    // Populate user
    comment = await comment.populate("user", "_id fullName profilePic");
    // Emit realtime update
    sendPostCommentUpdate(id, comment);
    // Gửi notification cho chủ post nếu không phải tự comment
    if (post.user.toString() !== userId.toString()) {
      const notification = await Notification.create({
        recipient: post.user,
        sender: userId,
        type: "post_comment",
        post: id,
        comment: comment._id,
        message: `${req.user.fullName} commented on your post!`,
      });
      sendPostNotification(post.user, notification);
    }
    res.status(201).json({ comment });
  } catch (error) {
    console.error("Error commentPost:", error);
    res.status(500).json({ message: "Bình luận thất bại" });
  }
};

export const replyComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    if (!content || !content.trim()) {
      return res
        .status(400)
        .json({ message: "Nội dung trả lời không được để trống" });
    }
    const parentComment = await Comment.findById(commentId);
    if (!parentComment || parentComment.deleted) {
      return res.status(404).json({ message: "Bình luận gốc không tồn tại" });
    }
    const post = await Post.findById(parentComment.post);
    if (!post || post.deleted) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }
    let reply = await Comment.create({
      post: post._id,
      user: userId,
      content,
      parentId: commentId,
    });
    post.commentCount += 1;
    await post.save();
    // Populate user
    reply = await reply.populate("user", "_id fullName profilePic");
    // Emit realtime update
    sendPostCommentUpdate(post._id, reply);
    // Gửi notification cho người được reply nếu không phải tự reply
    if (parentComment.user.toString() !== userId.toString()) {
      const notification = await Notification.create({
        recipient: parentComment.user,
        sender: userId,
        type: "comment_reply",
        post: post._id,
        comment: reply._id,
        message: `${req.user.fullName} replied to your comment!`,
      });
      sendPostNotification(parentComment.user, notification);
    }
    res.status(201).json({ reply });
  } catch (error) {
    console.error("Error replyComment:", error);
    res.status(500).json({ message: "Trả lời bình luận thất bại" });
  }
};

export const getComments = async (req, res) => {
  try {
    const { id } = req.params; // postId
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    // Lấy comment gốc (parentId=null)
    const comments = await Comment.find({
      post: id,
      parentId: null,
      deleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user", "_id fullName profilePic")
      .lean();
    // Lấy mọi reply (parentId != null)
    const replies = await Comment.find({
      post: id,
      parentId: { $ne: null },
      deleted: false,
    })
      .sort({ createdAt: 1 })
      .populate("user", "_id fullName profilePic")
      .lean();
    res.json({ comments, replies });
  } catch (error) {
    console.error("Error getComments:", error);
    res.status(500).json({ message: "Lấy danh sách comment thất bại" });
  }
};

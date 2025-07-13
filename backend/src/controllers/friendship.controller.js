import Friendship from "../models/friendship.model.js";
import User from "../models/user.model.js";
import { createFriendshipNotification } from "./notification.controller.js";
import { sendFriendshipUpdate } from "../lib/socket.js";

// Gửi lời mời kết bạn
export const sendFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const requesterId = req.user._id;
    if (recipientId === String(requesterId)) {
      return res
        .status(400)
        .json({ message: "Cannot send friend request to yourself." });
    }

    // Kiểm tra đã có lời mời hoặc đã là bạn bè chưa
    const existing = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (existing) {
      // Nếu đã là bạn bè
      if (existing.status === "accepted") {
        return res.status(400).json({
          message: "You are already friends with this user.",
        });
      }

      // Nếu có lời mời pending từ người khác
      if (existing.status === "pending") {
      return res.status(400).json({
        message: "Friend request already exists or you are already friends.",
      });
    }

      // Nếu có lời mời đã từ chối, cập nhật thành pending
      if (existing.status === "declined") {
        existing.status = "pending";
        await existing.save();

        // Tạo thông báo cho người nhận
        await createFriendshipNotification(
          recipientId,
          requesterId,
          "friend_request",
          existing._id
        );

        // Populate user info for real-time updates
        const populatedRequest = await Friendship.findById(existing._id)
          .populate("requester", "fullName profilePic")
          .populate("recipient", "fullName profilePic");

        // Emit real-time updates
        sendFriendshipUpdate([recipientId, requesterId], {
          type: "new_friend_request",
          request: populatedRequest,
        });

        return res.status(200).json(populatedRequest);
      }
    }

    // Tạo lời mời mới
    const request = await Friendship.create({
      requester: requesterId,
      recipient: recipientId,
    });

    // Tạo thông báo cho người nhận
    await createFriendshipNotification(
      recipientId,
      requesterId,
      "friend_request",
      request._id
    );

    // Populate user info for real-time updates
    const populatedRequest = await Friendship.findById(request._id)
      .populate("requester", "fullName profilePic")
      .populate("recipient", "fullName profilePic");

    // Emit real-time updates
    sendFriendshipUpdate([recipientId, requesterId], {
      type: "new_friend_request",
      request: populatedRequest,
    });

    res.status(201).json(populatedRequest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Chấp nhận lời mời kết bạn
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.body;
    const recipientId = req.user._id;
    const friendship = await Friendship.findOneAndUpdate(
      { requester: requesterId, recipient: recipientId, status: "pending" },
      { status: "accepted" },
      { new: true }
    )
      .populate("requester", "fullName profilePic")
      .populate("recipient", "fullName profilePic");

    if (!friendship) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    // Tạo thông báo cho người gửi lời mời
    await createFriendshipNotification(
      requesterId,
      recipientId,
      "friend_accepted",
      friendship._id
    );

    // Emit real-time updates
    sendFriendshipUpdate([requesterId, recipientId], {
      type: "request_accepted",
      friendship,
    });

    res.json(friendship);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Từ chối lời mời kết bạn
export const declineFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.body;
    const recipientId = req.user._id;
    const friendship = await Friendship.findOneAndUpdate(
      { requester: requesterId, recipient: recipientId, status: "pending" },
      { status: "declined" },
      { new: true }
    );
    if (!friendship) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    // Tạo thông báo cho người gửi lời mời
    await createFriendshipNotification(
      requesterId,
      recipientId,
      "friend_declined",
      friendship._id
    );

    // Emit real-time updates
    sendFriendshipUpdate([requesterId, recipientId], {
      type: "request_declined",
      friendship,
    });

    res.json(friendship);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Hủy lời mời đã gửi
export const cancelFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const requesterId = req.user._id;
    const friendship = await Friendship.findOneAndDelete({
      requester: requesterId,
      recipient: recipientId,
      status: "pending",
    });
    if (!friendship) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    // Emit real-time updates
    sendFriendshipUpdate([requesterId, recipientId], {
      type: "request_cancelled",
      friendship,
    });

    res.json({ message: "Friend request cancelled successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy danh sách bạn bè
export const getFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const friendships = await Friendship.find({
      $or: [
        { requester: userId, status: "accepted" },
        { recipient: userId, status: "accepted" },
      ],
    });
    const friendIds = friendships.map((f) =>
      String(f.requester) === String(userId) ? f.recipient : f.requester
    );
    const friends = await User.find({ _id: { $in: friendIds } }).select(
      "-password"
    );
    res.json(friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy danh sách lời mời đã gửi
export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const requests = await Friendship.find({
      requester: userId,
      status: "pending",
    }).populate("recipient", "-password");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy danh sách lời mời nhận được
export const getReceivedRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const requests = await Friendship.find({
      recipient: userId,
      status: "pending",
    }).populate("requester", "-password");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy số lượng bạn bè
export const getFriendCount = async (req, res) => {
  try {
    const userId = req.params.userId;
    const count = await Friendship.countDocuments({
      $or: [
        { requester: userId, status: "accepted" },
        { recipient: userId, status: "accepted" },
      ],
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Kiểm tra quyền nhắn tin
export const canMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const targetId = req.params.userId;
    if (userId === targetId) return res.json({ canMessage: true });
    // Kiểm tra đã là bạn bè chưa
    const friendship = await Friendship.findOne({
      $or: [
        { requester: userId, recipient: targetId, status: "accepted" },
        { requester: targetId, recipient: userId, status: "accepted" },
      ],
    });
    if (friendship) return res.json({ canMessage: true });
    // Nếu không phải bạn bè, kiểm tra allowStrangerMessage
    const targetUser = await User.findById(targetId);
    if (targetUser && targetUser.allowStrangerMessage) {
      return res.json({ canMessage: true });
    }
    res.json({ canMessage: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const unfriend = async (req, res) => {
  try {
    const userId = req.user._id;
    const { friendId } = req.body;
    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { requester: userId, recipient: friendId, status: "accepted" },
        { requester: friendId, recipient: userId, status: "accepted" },
      ],
    });
    if (!friendship) {
      return res.status(404).json({ message: "Friendship not found." });
    }

    // Emit real-time updates
    sendFriendshipUpdate([userId, friendId], {
      type: "unfriended",
      friendship,
    });

    res.json({ message: "Unfriended successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

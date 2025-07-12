import Friendship from "../models/friendship.model.js";
import User from "../models/user.model.js";

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
      return res
        .status(400)
        .json({
          message: "Friend request already exists or you are already friends.",
        });
    }
    const request = await Friendship.create({
      requester: requesterId,
      recipient: recipientId,
    });

    // Populate user info for real-time updates
    const populatedRequest = await Friendship.findById(request._id)
      .populate("requester", "fullName profilePic")
      .populate("recipient", "fullName profilePic");

    // Emit socket notification to recipient (safe)
    try {
      const { io, getReceiverSocketId } = await import("../lib/socket.js");
      const recipientSocketId = getReceiverSocketId(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("friendRequestNotification", {
          type: "friend_request",
          from: requesterId,
          timestamp: new Date(),
        });
        // Emit real-time update for received requests
        io.to(recipientSocketId).emit("friendshipUpdate", {
          type: "new_received_request",
          request: populatedRequest,
        });
      }
      // Emit real-time update for sent requests
      const requesterSocketId = getReceiverSocketId(requesterId);
      if (requesterSocketId) {
        io.to(requesterSocketId).emit("friendshipUpdate", {
          type: "new_sent_request",
          request: populatedRequest,
        });
      }
    } catch (socketError) {
      console.log("Socket notification failed:", socketError.message);
    }
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

    // Emit socket notification to requester (safe)
    try {
      const { io, getReceiverSocketId } = await import("../lib/socket.js");
      const requesterSocketId = getReceiverSocketId(requesterId);
      if (requesterSocketId) {
        io.to(requesterSocketId).emit("friendRequestNotification", {
          type: "friend_accept",
          from: recipientId,
          timestamp: new Date(),
        });
        // Emit real-time updates
        io.to(requesterSocketId).emit("friendshipUpdate", {
          type: "request_accepted",
          friendship,
        });
      }
      // Emit real-time updates to recipient
      const recipientSocketId = getReceiverSocketId(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("friendshipUpdate", {
          type: "request_accepted",
          friendship,
        });
      }
    } catch (socketError) {
      console.log("Socket notification failed:", socketError.message);
    }
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

    // Emit real-time updates
    try {
      const { io, getReceiverSocketId } = await import("../lib/socket.js");
      const requesterSocketId = getReceiverSocketId(requesterId);
      const recipientSocketId = getReceiverSocketId(recipientId);

      if (requesterSocketId) {
        io.to(requesterSocketId).emit("friendshipUpdate", {
          type: "request_declined",
          friendship,
        });
      }
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("friendshipUpdate", {
          type: "request_declined",
          friendship,
        });
      }
    } catch (socketError) {
      console.log("Socket notification failed:", socketError.message);
    }

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
    try {
      const { io, getReceiverSocketId } = await import("../lib/socket.js");
      const requesterSocketId = getReceiverSocketId(requesterId);
      const recipientSocketId = getReceiverSocketId(recipientId);

      if (requesterSocketId) {
        io.to(requesterSocketId).emit("friendshipUpdate", {
          type: "request_cancelled",
          friendship,
        });
      }
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("friendshipUpdate", {
          type: "request_cancelled",
          friendship,
        });
      }
    } catch (socketError) {
      console.log("Socket notification failed:", socketError.message);
    }

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
    try {
      const { io, getReceiverSocketId } = await import("../lib/socket.js");
      const requesterSocketId = getReceiverSocketId(userId);
      const recipientSocketId = getReceiverSocketId(friendId);

      if (requesterSocketId) {
        io.to(requesterSocketId).emit("friendshipUpdate", {
          type: "unfriended",
          friendship,
        });
      }
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("friendshipUpdate", {
          type: "unfriended",
          friendship,
        });
      }
    } catch (socketError) {
      console.log("Socket notification failed:", socketError.message);
    }

    res.json({ message: "Unfriended successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

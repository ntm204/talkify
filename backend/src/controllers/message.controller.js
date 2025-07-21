import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Friendship from "../models/friendship.model.js";

// Lấy danh sách user (trừ bản thân) kèm tin nhắn cuối cho sidebar
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    // Lấy danh sách bạn bè
    const friendships = await Friendship.find({
      $or: [
        { requester: loggedInUserId, status: "accepted" },
        { recipient: loggedInUserId, status: "accepted" },
      ],
    });
    const friendIds = friendships.map((f) =>
      String(f.requester) === String(loggedInUserId) ? f.recipient : f.requester
    );
    // Lấy tất cả bạn bè (dù có hoặc không có tin nhắn)
    const friends = await User.find({ _id: { $in: friendIds } }).select(
      "-password"
    );
    // Lấy tất cả user đã từng nhắn tin với mình (kể cả người lạ)
    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    }).select("senderId receiverId");
    // Lấy id các user đã từng nhắn tin với mình (trừ bản thân và bạn bè)
    const strangerIds = Array.from(
      new Set(
        messages
          .map((msg) =>
            String(msg.senderId) === String(loggedInUserId)
              ? String(msg.receiverId)
              : String(msg.senderId)
          )
          .filter(
            (id) =>
              id !== String(loggedInUserId) &&
              !friendIds.map((fid) => String(fid)).includes(id)
          )
      )
    );
    // Lấy thông tin user lạ đã từng nhắn tin
    const strangers = await User.find({ _id: { $in: strangerIds } }).select(
      "-password"
    );
    // Gộp bạn bè và người lạ đã từng nhắn tin
    const allUsers = [
      ...friends.map((user) => ({ ...user.toObject(), isFriend: true })),
      ...strangers.map((user) => ({ ...user.toObject(), isFriend: false })),
    ];
    // Gắn lastMessage cho từng user
    let usersWithLastMessage = await Promise.all(
      allUsers.map(async (user) => {
        // Lấy message mới nhất giữa hai user
        let lastMessage;
        const messages = await Message.find({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        })
          .sort({ createdAt: -1 })
          .select(
            "text image sticker createdAt senderId system onlyForSender revoked edited"
          );
        if (messages.length === 0) {
          lastMessage = null;
        } else {
          // Nếu loggedInUser là sender, lấy message mới nhất (kể cả revoked)
          // Nếu loggedInUser là receiver, bỏ qua message system onlyForSender, nhưng KHÔNG bỏ qua revoked
          if (messages[0].senderId.toString() === loggedInUserId.toString()) {
            lastMessage = messages[0];
          } else {
            // Tìm message đầu tiên không phải system onlyForSender
            lastMessage = messages.find(
              (msg) => !(msg.system && msg.onlyForSender)
            );
            // Nếu không tìm thấy, lastMessage = null (KHÔNG fallback về message system onlyForSender)
            if (!lastMessage) lastMessage = null;
          }
        }

        // Xử lý lastMessage cho tin nhắn bị thu hồi
        let lastMessageText = lastMessage?.text || "";
        if (lastMessage?.revoked) {
          if (lastMessage.senderId.toString() === loggedInUserId.toString()) {
            lastMessageText = "You have revoked a message";
          } else {
            lastMessageText = "The other party has revoked a message";
          }
        }

        return {
          ...user,
          lastMessage: lastMessage
            ? {
                _id: lastMessage._id,
                text: lastMessageText,
                image: lastMessage.revoked ? null : lastMessage.image,
                sticker: lastMessage.revoked ? null : lastMessage.sticker,
                createdAt: lastMessage.createdAt,
                revoked: lastMessage.revoked,
                edited: lastMessage.revoked ? false : lastMessage.edited,
                isSentByLoggedInUser:
                  lastMessage.senderId.toString() === loggedInUserId.toString(),
              }
            : null,
        };
      })
    );
    // Loại bỏ user lạ không có lastMessage (chỉ giữ bạn bè hoặc user lạ có lastMessage hợp lệ)
    usersWithLastMessage = usersWithLastMessage.filter(
      (user) => user.isFriend || user.lastMessage
    );
    res.status(200).json(usersWithLastMessage);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Lấy toàn bộ tin nhắn giữa hai user
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;
    let messages = await Message.find({
      $or: [
        { senderId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: senderId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate({
        path: "replyTo",
        select: "text image sticker senderId",
      });
    // Lọc message system chỉ hiển thị cho người gửi nếu onlyForSender
    messages = messages.filter(
      (msg) =>
        !msg.system ||
        !msg.onlyForSender ||
        (msg.onlyForSender && String(msg.senderId) === String(senderId))
    );
    res.json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Gửi tin nhắn giữa hai user, kiểm tra quyền gửi
export const sendMessage = async (req, res) => {
  try {
    const { text, image, sticker, replyTo } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let canSend = false;
    let reason = "";

    if (senderId.toString() === receiverId.toString()) {
      canSend = true;
    } else {
      // Đã là bạn bè?
      const friendship = await Friendship.findOne({
        $or: [
          { requester: senderId, recipient: receiverId, status: "accepted" },
          { requester: receiverId, recipient: senderId, status: "accepted" },
        ],
      });
      if (friendship) {
        canSend = true;
      } else {
        // Nếu không phải bạn bè, kiểm tra allowStrangerMessage của người nhận
        const targetUser = await User.findById(receiverId);
        if (targetUser && targetUser.allowStrangerMessage) {
          canSend = true;
        } else {
          canSend = false;
          reason =
            "Người này không nhận tin nhắn từ người lạ, kết bạn ngay để gửi tin nhắn.";
        }
      }
    }

    if (!canSend) {
      // Lưu message system vào DB, chỉ cho người gửi thấy
      const systemMessage = new Message({
        senderId: senderId, // người gửi
        receiverId: receiverId, // người nhận
        text: "This user doesn't accept messages from strangers.",
        image: null,
        sticker: null,
        system: true,
        onlyForSender: true,
      });
      await systemMessage.save();
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId)
        io.to(senderSocketId).emit("newMessage", systemMessage);
      return res.status(200).json(systemMessage);
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      sticker,
      replyTo: replyTo || null,
    });
    await newMessage.save();

    // Populate replyTo trước khi emit socket và trả về response
    await newMessage.populate({
      path: "replyTo",
      select: "text image sticker senderId",
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId);
    if (receiverSocketId)
      io.to(receiverSocketId).emit("newMessage", newMessage);
    if (senderSocketId) io.to(senderSocketId).emit("newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Thu hồi tin nhắn
export const revokeMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Tìm tin nhắn
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Tin nhắn không tồn tại" });
    }

    // Kiểm tra quyền: chỉ người gửi mới được thu hồi
    if (message.senderId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You do not have permission to revoke this message." });
    }

    // --- BỔ SUNG: Nếu không còn là bạn bè và receiver không cho phép nhận tin nhắn từ người lạ thì không cho phép thu hồi ---
    const Friendship = (await import("../models/friendship.model.js")).default;
    const User = (await import("../models/user.model.js")).default;
    const friendship = await Friendship.findOne({
      $or: [
        {
          requester: userId,
          recipient: message.receiverId,
          status: "accepted",
        },
        {
          requester: message.receiverId,
          recipient: userId,
          status: "accepted",
        },
      ],
    });
    if (!friendship) {
      const receiverUser = await User.findById(message.receiverId);
      if (!receiverUser.allowStrangerMessage) {
        return res.status(403).json({
          error:
            "You cannot revoke this message because the receiver does not allow messages from strangers and you are not friends.",
        });
      }
    }
    // --- END BỔ SUNG ---

    // Kiểm tra thời gian: chỉ thu hồi trong 2 phút
    const messageTime = new Date(message.createdAt);
    const currentTime = new Date();
    const timeDiff = (currentTime - messageTime) / 1000 / 60; // phút

    if (timeDiff > 2) {
      return res.status(400).json({
        error: "You can only revoke a message within 2 minutes after sending.",
      });
    }

    // Kiểm tra trạng thái: không thu hồi tin nhắn đã thu hồi
    if (message.revoked) {
      return res
        .status(400)
        .json({ error: "This message has already been revoked." });
    }

    // Thu hồi tin nhắn
    message.revoked = true;
    message.revokedBy = userId;
    message.text = "";
    message.image = null;
    message.sticker = null;
    await message.save();

    // Gửi socket event
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    const senderSocketId = getReceiverSocketId(message.senderId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageRevoked", message);
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageRevoked", message);
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in revokeMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Chỉnh sửa tin nhắn
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || text === "") {
      return res
        .status(400)
        .json({ error: "Message content cannot be empty." });
    }

    // Tìm tin nhắn
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Tin nhắn không tồn tại" });
    }

    // Kiểm tra quyền: chỉ người gửi mới được chỉnh sửa
    if (message.senderId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You do not have permission to edit this message." });
    }

    // --- BỔ SUNG: Nếu không còn là bạn bè và receiver không cho phép nhận tin nhắn từ người lạ thì không cho phép chỉnh sửa ---
    const Friendship = (await import("../models/friendship.model.js")).default;
    const User = (await import("../models/user.model.js")).default;
    const friendship = await Friendship.findOne({
      $or: [
        {
          requester: userId,
          recipient: message.receiverId,
          status: "accepted",
        },
        {
          requester: message.receiverId,
          recipient: userId,
          status: "accepted",
        },
      ],
    });
    if (!friendship) {
      const receiverUser = await User.findById(message.receiverId);
      if (!receiverUser.allowStrangerMessage) {
        return res.status(403).json({
          error:
            "You cannot edit this message because the receiver does not allow messages from strangers and you are not friends.",
        });
      }
    }
    // --- END BỔ SUNG ---

    // Kiểm tra thời gian: chỉ chỉnh sửa trong 2 phút
    const messageTime = new Date(message.createdAt);
    const currentTime = new Date();
    const timeDiff = (currentTime - messageTime) / 1000 / 60; // phút

    if (timeDiff > 2) {
      return res.status(400).json({
        error: "You can only edit a message within 2 minutes after sending.",
      });
    }

    // Kiểm tra trạng thái: không chỉnh sửa tin nhắn đã thu hồi
    if (message.revoked) {
      return res
        .status(400)
        .json({ error: "You cannot edit a revoked message." });
    }

    // Chỉnh sửa tin nhắn
    message.text = text;
    message.edited = true;
    await message.save();

    // Gửi socket event
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    const senderSocketId = getReceiverSocketId(message.senderId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", message);
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageEdited", message);
    }

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in editMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

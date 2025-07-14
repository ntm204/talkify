import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Friendship from "../models/friendship.model.js";

// Lấy danh sách user (trừ bản thân) kèm tin nhắn cuối cho sidebar
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");
    const usersWithLastMessage = await Promise.all(
      filteredUsers.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        })
          .sort({ createdAt: -1 })
          .select("text image sticker createdAt senderId");
        return {
          ...user.toObject(),
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                image: lastMessage.image,
                sticker: lastMessage.sticker,
                createdAt: lastMessage.createdAt,
                isSentByLoggedInUser:
                  lastMessage.senderId.toString() === loggedInUserId.toString(),
              }
            : null,
        };
      })
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
    const messages = await Message.find({
      $or: [
        { senderId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Gửi tin nhắn giữa hai user, kiểm tra quyền gửi
export const sendMessage = async (req, res) => {
  try {
    const { text, image, sticker } = req.body;
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
        text: "This user doesn't accept messages from strangers. Send a friend request to start chatting.",
        image: null,
        sticker: null,
        system: true,
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
    });
    await newMessage.save();

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

import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

// Đăng ký tài khoản mới
export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Đăng nhập
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Email not found" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Đăng xuất
export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Cập nhật ảnh đại diện
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Cập nhật cho phép nhận tin nhắn từ người lạ
export const updateAllowStrangerMessage = async (req, res) => {
  try {
    const { allowStrangerMessage } = req.body;
    const userId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { allowStrangerMessage },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Emit real-time update to all connected users
    try {
      const { io } = await import("../lib/socket.js");
      io.emit("userSettingsUpdate", {
        userId: userId,
        allowStrangerMessage: allowStrangerMessage,
      });
    } catch (socketError) {
      console.log("Socket notification failed:", socketError.message);
    }

    res.json(updatedUser);
  } catch (error) {
    console.log("Error in updateAllowStrangerMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Kiểm tra đăng nhập
export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Tìm kiếm user theo tên hoặc email
export const searchUsers = async (req, res) => {
  try {
    const { query, excludeFriends } = req.query;
    const userId = req.user._id;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: "Từ khóa tìm kiếm quá ngắn" });
    }
    // Regex tìm kiếm không phân biệt hoa thường, có dấu/không dấu
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    let filter = {
      _id: { $ne: userId },
      $or: [{ fullName: regex }, { email: regex }],
    };
    // Nếu cần loại trừ bạn bè đã kết bạn
    if (excludeFriends === "true") {
      const Friendship = (await import("../models/friendship.model.js"))
        .default;
      const friends = await Friendship.find({
        $or: [
          { requester: userId, status: "accepted" },
          { recipient: userId, status: "accepted" },
        ],
      });
      const friendIds = friends.map((f) =>
        String(f.requester) === String(userId) ? f.recipient : f.requester
      );
      filter._id = { $nin: [userId, ...friendIds] };
    }
    const User = (await import("../models/user.model.js")).default;
    const users = await User.find(filter).select("-password").limit(20);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy user theo id (không trả về password)
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

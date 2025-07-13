import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
  },
});

// Function to get socket ID of a specific user
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

const userSocketMap = {};

// Handle client connections and events
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} connected with socket ${socket.id}`);
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    if (userId) {
      delete userSocketMap[userId];
      console.log(`User ${userId} disconnected`);
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  socket.on("typing", ({ receiverId, senderId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", senderId);
    }
  });

  socket.on("stopTyping", ({ receiverId, senderId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", senderId);
    }
  });

  // Handle notification events
  socket.on("sendNotification", ({ receiverId, notification }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequestNotification", notification);
    }
  });

  // Handle notification read events
  socket.on("markNotificationRead", ({ notificationId }) => {
    // This will be handled by the notification controller
    console.log(`Notification ${notificationId} marked as read`);
  });

  // Handle mark all notifications as read
  socket.on("markAllNotificationsRead", ({ userId }) => {
    // Emit to all connected clients of this user
    const userSocketId = getReceiverSocketId(userId);
    if (userSocketId) {
      io.to(userSocketId).emit("allNotificationsRead");
    }
  });
});

// Function to send notification to a specific user
export function sendNotificationToUser(userId, notification) {
  const receiverSocketId = getReceiverSocketId(userId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("friendRequestNotification", notification);
    console.log(
      `Notification sent to user ${userId} via socket ${receiverSocketId}`
    );
  } else {
    console.log(
      `User ${userId} is not online, notification will be stored in database`
    );
  }
}

// Function to send friendship update to specific users
export function sendFriendshipUpdate(userIds, update) {
  userIds.forEach((userId) => {
    const socketId = getReceiverSocketId(userId);
    if (socketId) {
      io.to(socketId).emit("friendshipUpdate", update);
    }
  });
}

// Function to broadcast to all connected users
export function broadcastToAll(event, data) {
  io.emit(event, data);
}

export { io, app, server };

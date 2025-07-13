import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["friend_request", "friend_accepted", "friend_declined"],
      required: true,
    },
    friendship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Friendship",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;

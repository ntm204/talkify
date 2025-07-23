import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    media: [
      {
        url: String, // link ảnh/video
        type: {
          type: String,
          enum: ["image", "video", "sticker"],
        },
        thumbnail: String, // nếu là video
      },
    ],
    background: {
      type: String,
      default: "",
    },
    feeling: {
      icon: { type: String, default: "" },
      label: { type: String, default: "" },
    },
    privacy: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);
export default Post;

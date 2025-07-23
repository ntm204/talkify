import { useEffect, useState } from "react";
import PostModal from "./PostModal";
import { useAuthStore } from "../store/useAuthStore";
import { Pin, Globe, Users, Lock, Heart, MessageCircle } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

const PostCard = ({ post, onPostUpdated, onPostDeleted, isProfile }) => {
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showModal, setShowModal] = useState(false);
  const { authUser } = useAuthStore();
  const isOwner = authUser && post.user && authUser._id === post.user._id;
  const [pinned, setPinned] = useState(post.pinned || false);
  const [pinLoading, setPinLoading] = useState(false);
  const [privacy, setPrivacy] = useState(post.privacy || "public");
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const privacyOptions = [
    { value: "public", label: "Public", icon: <Globe className="w-4 h-4" /> },
    { value: "friends", label: "Friends", icon: <Users className="w-4 h-4" /> },
    { value: "private", label: "Only me", icon: <Lock className="w-4 h-4" /> },
  ];
  const currentPrivacy = privacyOptions.find((p) => p.value === post.privacy);
  const theme = useThemeStore((state) => state.theme);
  // Định nghĩa style động theo theme
  const themeStyles = {
    Winter: {
      border: "border-blue-200",
      bg: "bg-white",
      hover: "hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100",
      shadow: "shadow-lg",
      icon: "text-blue-500",
    },
    Dark: {
      border: "border-zinc-700",
      bg: "bg-zinc-900",
      hover: "hover:bg-gradient-to-br hover:from-zinc-800 hover:to-zinc-900",
      shadow: "shadow-2xl",
      icon: "text-pink-400",
    },
    Light: {
      border: "border-zinc-200",
      bg: "bg-white",
      hover: "hover:bg-gradient-to-br hover:from-zinc-50 hover:to-zinc-100",
      shadow: "shadow-lg",
      icon: "text-emerald-500",
    },
    // Thêm các theme khác nếu có
  };
  const t = themeStyles[theme] || themeStyles["Winter"];

  // Luôn đồng bộ liked/likeCount với prop post khi post thay đổi (ví dụ sau khi sửa/xoá ở modal)
  useEffect(() => {
    setLiked(!!post.likedByMe);
    setLikeCount(post.likeCount || 0);
  }, [post.likedByMe, post.likeCount]);

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/posts/${post._id}/like`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {}
  };

  // Sử dụng class động của daisyUI/Tailwind để tự động đổi màu theo theme
  const cardClass = `bg-base-200 border border-base-300 shadow-lg rounded-2xl p-5 flex flex-col h-full gap-3 cursor-pointer transition-all duration-200 hover:bg-base-300/80 text-base-content ${
    !isProfile ? "hover:scale-[1.025]" : ""
  } hover:shadow-2xl hover:border-primary/60 transition-transform transition-shadow`;

  return (
    <>
      <div
        className={cardClass}
        onClick={(e) => {
          // Không mở modal khi click vào nút like/comment
          if (
            e.target.closest("button") ||
            e.target.closest("input") ||
            e.target.closest("select")
          )
            return;
          setShowModal(true);
        }}
      >
        <div className="flex items-center gap-3 mb-1">
          <img
            src={post.user?.profilePic || "/avatar.png"}
            alt="avatar"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <div className="font-semibold flex items-center gap-2">
              {post.user?.fullName}
              {currentPrivacy && (
                <span className="flex items-center gap-1 text-zinc-400 text-xs ml-2">
                  {currentPrivacy.icon}
                  {currentPrivacy.label}
                </span>
              )}
            </div>
            {/* Hiển thị cảm xúc nếu có */}
            {post.feeling && post.feeling.icon && post.feeling.label && (
              <div className="flex items-center gap-1 text-xs text-primary mt-0.5">
                <span className="text-lg">{post.feeling.icon}</span>
                <span>{post.feeling.label}</span>
              </div>
            )}
            <div className="text-xs text-zinc-400">
              {new Date(post.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
        {/* Hiển thị media nếu có */}
        {post.media?.length > 0 && (
          <div className="w-full aspect-video bg-zinc-200 rounded-lg overflow-hidden flex items-center justify-center">
            {post.media[0].type === "image" ? (
              <img
                src={post.media[0].url}
                alt="media"
                className="object-cover w-full h-full"
              />
            ) : (
              <video
                src={post.media[0].url}
                controls
                className="object-cover w-full h-full"
              />
            )}
          </div>
        )}
        {/* Hiển thị background nếu có */}
        {post.background ? (
          <div
            className={`rounded-xl w-full flex items-center justify-center min-h-[120px] py-8 px-2 ${post.background}`}
          >
            <span className="text-white text-2xl font-bold text-center break-words w-full">
              {post.content}
            </span>
          </div>
        ) : (
          <div className="whitespace-pre-line text-base">{post.content}</div>
        )}
        <div className="flex items-center gap-6 mt-auto pt-2">
          <button
            className={`flex items-center gap-1 rounded-full px-2 py-1 transition-all duration-150 ${
              liked
                ? "text-pink-500 bg-pink-100/60 hover:bg-pink-200/80"
                : "text-base-content/60 hover:bg-base-200/80"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
          >
            <Heart
              size={20}
              strokeWidth={2.2}
              fill={liked ? "#ec4899" : "none"}
            />
            <span>{likeCount}</span>
          </button>
          <div className="flex items-center gap-1 rounded-full px-2 py-1 text-zinc-500">
            <MessageCircle size={20} strokeWidth={2.2} />
            <span>{post.commentCount || 0}</span>
          </div>
          {pinned && <Pin className="w-5 h-5 text-primary" title="Pinned" />}
        </div>
      </div>
      {showModal && (
        <PostModal
          postId={post._id}
          onClose={() => setShowModal(false)}
          onPostUpdated={onPostUpdated}
          onPostDeleted={onPostDeleted}
        />
      )}
    </>
  );
};
export default PostCard;

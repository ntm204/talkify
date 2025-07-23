import { useEffect, useState } from "react";
import socket from "../lib/socket";
import {
  Heart,
  MessageCircle,
  Globe,
  Users,
  Lock,
  Edit,
  Trash2,
  X,
  Smile,
  Palette,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import UserInfoModal from "./UserInfoModal";
import toast from "react-hot-toast";

const PRIVACY_OPTIONS = [
  { value: "public", label: "Public", icon: <Globe size={16} /> },
  { value: "friends", label: "Friends", icon: <Users size={16} /> },
  { value: "private", label: "Only me", icon: <Lock size={16} /> },
];

const PostModal = ({ postId, onClose, onPostUpdated, onPostDeleted }) => {
  const { authUser } = useAuthStore();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [likedByMe, setLikedByMe] = useState(false);
  // State toggle replies cho từng comment gốc
  const [openReplies, setOpenReplies] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editPrivacy, setEditPrivacy] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // Custom dropdown quyền riêng tư
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const privacyValue = editMode ? editPrivacy : post?.privacy;
  const privacyLabel = privacyValue
    ? PRIVACY_OPTIONS.find((p) => p.value === privacyValue)?.label
    : "";
  const privacyIcon = privacyValue
    ? PRIVACY_OPTIONS.find((p) => p.value === privacyValue)?.icon
    : null;
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [editFeeling, setEditFeeling] = useState(null);
  const [editBg, setEditBg] = useState("");
  const [showEditFeelingModal, setShowEditFeelingModal] = useState(false);
  const [showEditBgModal, setShowEditBgModal] = useState(false);

  let globalNoPermissionToast = false;

  // Fetch chi tiết post và comment khi mở modal
  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    setError("");
    // Đảm bảo chỉ hiện 1 toast khi không có quyền xem post
    Promise.all([
      fetch(`/api/posts/${postId}`, { credentials: "include" }),
      fetch(`/api/posts/${postId}/comments`, { credentials: "include" }),
    ])
      .then(async ([postRes, commentRes]) => {
        const postData = await postRes.json();
        const commentData = await commentRes.json();
        if (postRes.ok) {
          setPost(postData.post);
          setLikedByMe(!!postData.post.likedByMe);
          setPost((prev) => ({ ...prev, likeCount: postData.post.likeCount }));
        } else {
          setError(postData.message || "Post not found");
          if (!globalNoPermissionToast) {
            toast.dismiss();
            toast.error(
              "You do not have permission to view this post or it is private."
            );
            globalNoPermissionToast = true;
            setTimeout(() => {
              globalNoPermissionToast = false;
            }, 2000);
          }
          setTimeout(() => {
            onClose && onClose();
          }, 1500);
        }
        if (commentRes.ok) {
          setComments(commentData.comments || []);
          setReplies(commentData.replies || []);
        }
      })
      .catch(() => {
        setError("Failed to load post");
        if (!globalNoPermissionToast) {
          toast.dismiss();
          toast.error(
            "You do not have permission to view this post or it is private."
          );
          globalNoPermissionToast = true;
          setTimeout(() => {
            globalNoPermissionToast = false;
          }, 2000);
        }
        setTimeout(() => {
          onClose && onClose();
        }, 1500);
      })
      .finally(() => setLoading(false));
  }, [postId]);

  // useEffect: socket connect, lắng nghe comment/like
  useEffect(() => {
    if (!postId) return;
    socket.connect();
    const handleCommentUpdate = (data) => {
      if (data.postId === postId && data.comment && !data.comment.parentId) {
        setComments((prev) => {
          // Tránh trùng lặp nếu đã có
          if (prev.some((c) => c._id === data.comment._id)) return prev;
          return [data.comment, ...prev];
        });
      }
    };
    socket.on("postCommentUpdate", handleCommentUpdate);

    const handleLikeUpdate = (data) => {
      if (data.postId === postId) {
        setPost((prev) =>
          prev ? { ...prev, likeCount: data.likeCount } : prev
        );
        // Nếu là mình vừa like/unlike thì không update likedByMe ở đây
      }
    };
    socket.on("postLikeUpdate", handleLikeUpdate);

    return () => {
      socket.off("postCommentUpdate", handleCommentUpdate);
      socket.off("postLikeUpdate", handleLikeUpdate);
      socket.disconnect();
    };
  }, [postId]);

  // useEffect: lắng nghe reply realtime
  useEffect(() => {
    if (!postId) return;
    const handleReplyUpdate = (data) => {
      if (data.postId === postId && data.reply) {
        setReplies((prev) => [...prev, data.reply]);
      }
    };
    socket.on("postCommentUpdate", handleReplyUpdate); // backend emit chung event cho comment/reply
    return () => {
      socket.off("postCommentUpdate", handleReplyUpdate);
    };
  }, [postId]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: comment }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments([data.comment, ...comments]);
        setComment("");
      } else {
        setError(data.message || "Failed to comment");
      }
    } catch {
      setError("Failed to comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (commentId) => {
    if (!replyContent.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/posts/comment/${commentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: replyContent }),
      });
      const data = await res.json();
      if (res.ok) {
        setReplies((prev) => [...prev, data.reply]);
        setReplyContent("");
        setReplyingTo(null);
      }
    } finally {
      setSubmittingReply(false);
    }
  };

  // Thêm hàm đổi quyền riêng tư
  const handlePrivacyChange = async (e) => {
    const newPrivacy = e.target.value;
    setPrivacyLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/privacy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ privacy: newPrivacy }),
      });
      const data = await res.json();
      if (res.ok) {
        setPost((prev) => ({ ...prev, privacy: newPrivacy }));
        if (onPostUpdated) onPostUpdated({ ...post, privacy: newPrivacy });
      } else {
        setError(data.message || "Failed to change privacy");
      }
    } catch {
      setError("Failed to change privacy");
    } finally {
      setPrivacyLoading(false);
    }
  };

  // Xử lý like/unlike
  const handleLike = async () => {
    if (!post) return;
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setLikedByMe(data.liked);
        setPost((prev) => {
          const updated = prev
            ? { ...prev, likeCount: data.likeCount, likedByMe: data.liked }
            : prev;
          if (onPostUpdated && updated) onPostUpdated(updated);
          return updated;
        });
      }
    } catch {}
  };

  // Hàm xoá bài viết
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        if (onPostDeleted) onPostDeleted(postId);
        onClose();
      } else {
        alert("Failed to delete post");
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Hàm lưu chỉnh sửa
  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: editContent,
          privacy: editPrivacy,
          background: editBg,
          feeling: editFeeling,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPost((prev) => ({
          ...prev,
          content: editContent,
          privacy: editPrivacy,
          background: editBg,
          feeling: editFeeling,
        }));
        setEditMode(false);
        if (onPostUpdated)
          onPostUpdated({
            ...post,
            content: editContent,
            privacy: editPrivacy,
            background: editBg,
            feeling: editFeeling,
          });
      } else {
        alert(data.message || "Failed to update post");
      }
    } catch {
      alert("Failed to update post");
    }
  };

  // Khi vào edit mode, set giá trị ban đầu
  useEffect(() => {
    if (editMode && post) {
      setEditContent(post.content);
      setEditPrivacy(post.privacy);
      setEditFeeling(post.feeling && post.feeling.icon ? post.feeling : null);
      setEditBg(post.background || "");
    }
  }, [editMode, post]);

  // Lấy replies cho comment gốc: gom mọi reply có parentId là comment gốc hoặc là reply của reply (bất kỳ cấp nào, nhưng chỉ hiển thị 1 cấp)
  function getAllRepliesFlat(commentId) {
    // Lấy tất cả reply có parentId là commentId hoặc là reply của reply (bất kỳ cấp)
    // Nhưng chỉ hiển thị 1 cấp dưới comment gốc
    // Ta sẽ lấy mọi reply mà parent chain dẫn về commentId
    const idMap = {};
    replies.forEach((r) => {
      idMap[r._id] = r;
    });
    function isDescendantOf(cid, rootId) {
      let cur = idMap[cid];
      while (cur && cur.parentId) {
        if (cur.parentId.toString() === rootId.toString()) return true;
        cur = idMap[cur.parentId];
      }
      return false;
    }
    return replies.filter(
      (r) =>
        r.parentId.toString() === commentId.toString() ||
        isDescendantOf(r._id, commentId)
    );
  }

  // Lấy tên người được reply
  function getReplyToName(parentId) {
    const parent = comments.concat(replies).find((c) => c._id === parentId);
    return parent?.user?.fullName || "";
  }

  // Render một reply (dùng cho mọi cấp)
  function renderReply(r) {
    return (
      <div key={r._id} className="flex items-start gap-2 mb-2">
        <img
          src={r.user?.profilePic || "/avatar.png"}
          alt="avatar"
          className="w-6 h-6 rounded-full object-cover mt-0.5"
        />
        <div className="flex-1">
          <span className="font-semibold text-xs mr-1">{r.user?.fullName}</span>
          <span className="text-xs text-primary mr-1">
            @{getReplyToName(r.parentId)}
          </span>
          <span className="text-xs">{r.content}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-400">
              {new Date(r.createdAt).toLocaleString()}
            </span>
            <button
              className="btn btn-xs btn-ghost ml-2"
              onClick={() => setReplyingTo(r._id)}
            >
              Reply
            </button>
          </div>
          {replyingTo === r._id && (
            <form
              className="flex gap-2 mt-2 items-center"
              onSubmit={(e) => {
                e.preventDefault();
                handleReply(r._id);
              }}
            >
              <input
                className="input input-bordered flex-1"
                placeholder={`Write a reply...@${getReplyToName(r._id)}`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                disabled={submittingReply}
                autoFocus
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={submittingReply || !replyContent.trim()}
              >
                Send
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent("");
                }}
                tabIndex={-1}
              >
                ✕
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Render comment gốc + mọi reply cùng cấp (không lồng sâu)
  function renderComments() {
    return comments.map((c) => {
      const replyList = getAllRepliesFlat(c._id);
      const isOpen = openReplies[c._id];
      return (
        <div key={c._id} className="bg-base-200 rounded-lg p-3 mb-2">
          {/* Dòng đầu: avatar, tên, nội dung */}
          <div className="flex items-start gap-2">
            <img
              src={c.user?.profilePic || "/avatar.png"}
              alt="avatar"
              className="w-7 h-7 rounded-full object-cover mt-0.5"
            />
            <div className="flex-1">
              <span className="font-semibold text-sm mr-2">
                {c.user?.fullName}
              </span>
              <span className="text-sm whitespace-pre-line">{c.content}</span>
            </div>
          </div>
          {/* Dòng dưới: thời gian, nút Reply, View replies */}
          <div className="flex items-center gap-2 mt-1 ml-9">
            <span className="text-xs text-zinc-400">
              {new Date(c.createdAt).toLocaleString()}
            </span>
            <button
              className="btn btn-xs btn-ghost ml-2"
              onClick={() => setReplyingTo(c._id)}
            >
              Reply
            </button>
            {replyList.length > 0 && (
              <button
                className="btn btn-xs btn-ghost ml-2"
                onClick={() =>
                  setOpenReplies((prev) => ({ ...prev, [c._id]: !isOpen }))
                }
              >
                {isOpen ? `Hide replies` : `View replies (${replyList.length})`}
              </button>
            )}
          </div>
          {/* Input reply */}
          {replyingTo === c._id && (
            <form
              className="flex gap-2 mt-2 ml-9 items-center"
              onSubmit={(e) => {
                e.preventDefault();
                handleReply(c._id);
              }}
            >
              <input
                className="input input-bordered flex-1"
                placeholder={`Write a reply...${
                  getReplyToName(c._id) ? " @" + getReplyToName(c._id) : ""
                }`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                disabled={submittingReply}
                autoFocus
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={submittingReply || !replyContent.trim()}
              >
                Send
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent("");
                }}
                tabIndex={-1}
              >
                ✕
              </button>
            </form>
          )}
          {/* Hiển thị replies nếu mở */}
          {isOpen && replyList.length > 0 && (
            <div className="ml-9 mt-2 space-y-2">
              {replyList.map((r) => renderReply(r))}
            </div>
          )}
        </div>
      );
    });
  }

  if (!post) return null;

  const isOwner = authUser && post.user && authUser._id === post.user._id;
  const privacyOption = PRIVACY_OPTIONS.find((p) => p.value === post.privacy);

  // Kết hợp comments và replies thành 1 mảng phẳng
  const allComments = [...comments, ...replies];

  // Hàm dựng tree comment từ mảng phẳng
  function buildCommentTree(list, parentId = null) {
    return list
      .filter(
        (c) =>
          (c.parentId ? c.parentId.toString() : null) ===
          (parentId ? parentId.toString() : null)
      )
      .map((c) => ({
        ...c,
        children: buildCommentTree(list, c._id),
      }));
  }

  // Render tree comment đệ quy
  function renderCommentTree(tree, level = 0) {
    return tree.map((c) => (
      <div
        key={c._id}
        className={`bg-base-200 rounded-lg p-3 mb-2 ml-[${level * 24}px]`}
        style={{ marginLeft: level ? level * 24 : 0 }}
      >
        {/* Dòng đầu: avatar, tên, nội dung */}
        <div className="flex items-start gap-2">
          <img
            src={c.user?.profilePic || "/avatar.png"}
            alt="avatar"
            className="w-7 h-7 rounded-full object-cover mt-0.5"
          />
          <div className="flex-1">
            <span className="font-semibold text-sm mr-2">
              {c.user?.fullName}
            </span>
            <span className="text-sm whitespace-pre-line">{c.content}</span>
          </div>
        </div>
        {/* Dòng dưới: thời gian, nút Reply */}
        <div className="flex items-center gap-2 mt-1 ml-9">
          <span className="text-xs text-zinc-400">
            {new Date(c.createdAt).toLocaleString()}
          </span>
          <button
            className="btn btn-xs btn-ghost ml-2"
            onClick={() => setReplyingTo(c._id)}
          >
            Reply
          </button>
        </div>
        {/* Input reply */}
        {replyingTo === c._id && (
          <form
            className="flex gap-2 mt-2 ml-9 items-center"
            onSubmit={(e) => {
              e.preventDefault();
              handleReply(c._id);
            }}
          >
            <input
              className="input input-bordered flex-1"
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              disabled={submittingReply}
              autoFocus
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={submittingReply || !replyContent.trim()}
            >
              Send
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => {
                setReplyingTo(null);
                setReplyContent("");
              }}
              tabIndex={-1}
            >
              ✕
            </button>
          </form>
        )}
        {/* Render children (reply) đệ quy */}
        {c.children && c.children.length > 0 && (
          <div className="mt-2">{renderCommentTree(c.children, level + 1)}</div>
        )}
      </div>
    ));
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-xl p-0 w-full max-w-2xl relative max-h-[90vh] flex flex-col overflow-hidden shadow-xl animate-[fadeIn_0.45s_ease] scale-92 transition-all duration-450">
        <button
          className="absolute top-2 right-2 btn btn-sm btn-ghost z-10"
          onClick={onClose}
        >
          &times;
        </button>
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-2 border-b border-base-200">
              <img
                src={post.user?.profilePic || "/avatar.png"}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-2">
                  <button
                    className="font-semibold truncate hover:underline hover:text-primary transition-colors"
                    onClick={() => setShowUserInfo(true)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      cursor: "pointer",
                    }}
                  >
                    {post.user?.fullName}
                  </button>
                  {/* Custom dropdown quyền riêng tư */}
                  {isOwner ? (
                    <div className="relative ml-2">
                      <button
                        type="button"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-base-300 bg-base-100 hover:bg-base-200 transition shadow-sm text-xs"
                        onClick={() => setShowPrivacyDropdown((v) => !v)}
                        disabled={privacyLoading || deleting}
                      >
                        {privacyIcon}
                        <span>{privacyLabel}</span>
                        <svg className="w-3 h-3 ml-1" viewBox="0 0 20 20">
                          <path
                            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.293l3.71-3.06a.75.75 0 1 1 .96 1.15l-4.25 3.5a.75.75 0 0 1-.96 0l-4.25-3.5a.75.75 0 0 1 .02-1.06z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      {showPrivacyDropdown && (
                        <div className="absolute left-0 mt-1 w-36 bg-base-100 border border-base-300 rounded-lg shadow-lg z-20 animate-fadeIn">
                          {PRIVACY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              className={`flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-base-200 rounded-lg transition ${
                                (editMode ? editPrivacy : post.privacy) ===
                                opt.value
                                  ? "font-semibold text-primary"
                                  : ""
                              }`}
                              onClick={() => {
                                if (editMode) setEditPrivacy(opt.value);
                                else
                                  handlePrivacyChange({
                                    target: { value: opt.value },
                                  });
                                setShowPrivacyDropdown(false);
                              }}
                              disabled={privacyLoading || deleting}
                            >
                              {opt.icon}
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-zinc-400 ml-2">
                      {privacyOption?.icon}
                      {privacyOption?.label}
                    </span>
                  )}
                  {/* Nút Sửa/Xoá */}
                  {isOwner && !editMode && (
                    <>
                      <button
                        className="btn btn-xs btn-ghost ml-2"
                        onClick={() => setEditMode(true)}
                        title="Edit post"
                        disabled={deleting}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-xs btn-ghost ml-1"
                        onClick={() => setShowDeleteModal(true)}
                        disabled={deleting}
                        title="Delete post"
                      >
                        {deleting ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </>
                  )}
                  {/* Nút Huỷ edit */}
                  {editMode && (
                    <button
                      className="btn btn-xs btn-ghost ml-2"
                      onClick={() => setEditMode(false)}
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {/* Hiển thị cảm xúc nếu có */}
                {post.feeling && post.feeling.icon && post.feeling.label && (
                  <div className="flex items-center gap-1 text-xs text-primary mt-0.5">
                    <span className="text-lg">{post.feeling.icon}</span>
                    <span>{post.feeling.label}</span>
                  </div>
                )}
                <div className="text-xs text-zinc-400 truncate">
                  {new Date(post.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            {/* Media */}
            {post.media?.length > 0 && (
              <div className="w-full aspect-video bg-zinc-200 flex items-center justify-center overflow-hidden">
                {post.media[0].type === "image" ? (
                  <img
                    src={post.media[0].url}
                    alt="media"
                    className="object-contain w-full h-full"
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
            {editMode ? (
              editBg ? (
                <div
                  className={`rounded-2xl mx-auto w-3/4 max-w-md flex flex-col items-center justify-center min-h-[220px] py-12 px-4 ${editBg}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs flex items-center gap-1"
                      onClick={() => setShowEditFeelingModal(true)}
                    >
                      <Smile className="w-5 h-5 text-yellow-500" />
                      <span className="text-xs font-medium">
                        {editFeeling
                          ? `${editFeeling.icon} ${editFeeling.label}`
                          : "Add Feeling"}
                      </span>
                    </button>
                  </div>
                  <textarea
                    className="w-full min-h-[80px] max-h-60 text-center text-white font-bold text-2xl py-8 px-4 bg-transparent outline-none border-none shadow-none resize-none placeholder-white/80"
                    rows={4}
                    placeholder={
                      editFeeling
                        ? `I'm feeling ${editFeeling.label?.toLowerCase()}...`
                        : "Edit your post..."
                    }
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    maxLength={1000}
                    autoFocus
                  />
                  <div className="flex gap-4 mt-6 justify-center">
                    <button
                      className="flex items-center justify-center btn btn-md w-12 h-12 rounded-full shadow-lg transition-all duration-200 bg-white/80 text-pink-500 hover:bg-white hover:shadow-pink-200 hover:shadow-[0_0_0_8px_rgba(236,72,153,0.10)] focus:ring-2 focus:ring-pink-300 focus:outline-none active:scale-95"
                      onClick={handleSaveEdit}
                      disabled={privacyLoading || !editContent.trim()}
                      title="Save"
                    >
                      {privacyLoading ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <svg
                          className="w-7 h-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                    <button
                      className="flex items-center justify-center btn btn-md w-12 h-12 rounded-full shadow-lg transition-all duration-200 bg-white/80 text-zinc-500 hover:bg-white hover:shadow-zinc-300 hover:shadow-[0_0_0_8px_rgba(63,63,70,0.10)] focus:ring-2 focus:ring-zinc-300 focus:outline-none active:scale-95"
                      onClick={() => setEditMode(false)}
                      title="Cancel"
                    >
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs flex items-center gap-1"
                      onClick={() => setShowEditFeelingModal(true)}
                    >
                      <Smile className="w-5 h-5 text-yellow-500" />
                      <span className="text-xs font-medium">
                        {editFeeling
                          ? `${editFeeling.icon} ${editFeeling.label}`
                          : "Add Feeling"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs flex items-center gap-1"
                      onClick={() => setShowEditBgModal(true)}
                    >
                      <Palette className="w-5 h-5 text-pink-500" />
                      <span className="text-xs font-medium">Background</span>
                    </button>
                  </div>
                  <textarea
                    className="w-full text-lg min-h-[90px] resize-none focus:outline-none bg-white py-6 px-4 rounded-xl shadow-none border-none placeholder-zinc-400"
                    rows={4}
                    placeholder={
                      editFeeling
                        ? `I'm feeling ${editFeeling.label?.toLowerCase()}...`
                        : "Edit your post..."
                    }
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    maxLength={1000}
                    autoFocus
                  />
                  <div className="flex gap-4 mt-4 justify-center">
                    <button
                      className="flex items-center justify-center btn btn-md w-12 h-12 rounded-full shadow-lg transition-all duration-200 bg-white/80 text-pink-500 hover:bg-white hover:shadow-pink-200 hover:shadow-[0_0_0_8px_rgba(236,72,153,0.10)] focus:ring-2 focus:ring-pink-300 focus:outline-none active:scale-95"
                      onClick={handleSaveEdit}
                      disabled={privacyLoading || !editContent.trim()}
                      title="Save"
                    >
                      {privacyLoading ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <svg
                          className="w-7 h-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                    <button
                      className="flex items-center justify-center btn btn-md w-12 h-12 rounded-full shadow-lg transition-all duration-200 bg-white/80 text-zinc-500 hover:bg-white hover:shadow-zinc-300 hover:shadow-[0_0_0_8px_rgba(63,63,70,0.10)] focus:ring-2 focus:ring-zinc-300 focus:outline-none active:scale-95"
                      onClick={() => setEditMode(false)}
                      title="Cancel"
                    >
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            ) : post.background ? (
              <div
                className={`rounded-2xl mx-auto w-3/4 max-w-md flex items-center justify-center min-h-[220px] py-12 px-4 ${post.background}`}
              >
                <span className="text-white text-2xl font-bold text-center break-words w-full">
                  {post.content}
                </span>
              </div>
            ) : (
              <div className="px-6 py-4 whitespace-pre-line text-base border-b border-base-200">
                {post.content}
              </div>
            )}
            {/* Like/Comment count */}
            <div className="flex items-center gap-6 px-6 py-3 border-b border-base-200">
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-2 py-1"
                aria-label="Like"
                onClick={handleLike}
              >
                <Heart
                  size={22}
                  strokeWidth={2.2}
                  fill={likedByMe ? "#ec4899" : "none"}
                />
                <span className="ml-1 font-semibold text-base select-none">
                  {post.likeCount}
                </span>
              </button>
              <div className="flex items-center gap-1">
                <MessageCircle size={22} strokeWidth={2.2} />
                <span className="ml-1 font-semibold text-base select-none">
                  {post.commentCount}
                </span>
              </div>
            </div>
            {/* Form bình luận */}
            <form
              onSubmit={handleComment}
              className="flex gap-2 px-6 py-3 border-b border-base-200"
            >
              <input
                className="input input-bordered flex-1"
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={submitting}
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting || !comment.trim()}
              >
                Send
              </button>
            </form>
            {error && (
              <div className="text-red-500 text-sm mb-2 px-6">{error}</div>
            )}
            {/* Danh sách bình luận */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {renderComments()}
            </div>
          </>
        )}
      </div>
      {/* Modal xác nhận xoá */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-base-100 rounded-xl shadow-xl p-6 max-w-xs w-full flex flex-col items-center">
            <Trash2 size={36} className="text-red-500 mb-2" />
            <div className="font-bold text-lg mb-2 text-center">
              Delete this post?
            </div>
            <div className="text-sm text-zinc-500 mb-4 text-center">
              This post will be permanently deleted and cannot be recovered.
            </div>
            <div className="flex gap-3 w-full justify-center">
              <button
                className="btn btn-error flex-1"
                onClick={handleDelete}
                disabled={deleting}
              >
                Xoá
              </button>
              <button
                className="btn btn-ghost flex-1"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
      {showUserInfo && post.user && (
        <UserInfoModal
          user={post.user}
          onClose={() => setShowUserInfo(false)}
        />
      )}
      {/* Modal chọn cảm xúc khi sửa */}
      {showEditFeelingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-base-100 rounded-xl shadow-xl p-6 w-full max-w-xs mx-auto flex flex-col items-center">
            <button
              className="self-start mb-2 btn btn-ghost btn-xs"
              onClick={() => setShowEditFeelingModal(false)}
            >
              <X size={18} /> Back
            </button>
            <h3 className="font-semibold text-lg mb-4">How are you feeling?</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: "😊", label: "Happy" },
                { icon: "😢", label: "Sad" },
                { icon: "😡", label: "Angry" },
                { icon: "😍", label: "In love" },
                { icon: "😴", label: "Sleepy" },
                { icon: "🤔", label: "Thinking" },
                { icon: "😎", label: "Cool" },
                { icon: "🥳", label: "Celebrating" },
              ].map((f) => (
                <button
                  key={f.label}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-base-200 transition ${
                    editFeeling && editFeeling.label === f.label
                      ? "bg-primary/10"
                      : ""
                  }`}
                  onClick={() => {
                    setEditFeeling(f);
                    setShowEditFeelingModal(false);
                  }}
                >
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-xs font-medium">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Modal chọn background khi sửa */}
      {showEditBgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-base-100 rounded-xl shadow-xl p-6 w-full max-w-xs mx-auto flex flex-col items-center">
            <button
              className="self-start mb-2 btn btn-ghost btn-xs"
              onClick={() => setShowEditBgModal(false)}
            >
              <X size={18} /> Back
            </button>
            <h3 className="font-semibold text-lg mb-4">Choose a background</h3>
            <div className="grid grid-cols-2 gap-3 w-full">
              {[
                "bg-gradient-to-r from-pink-400 via-red-400 to-yellow-400",
                "bg-gradient-to-r from-blue-400 to-purple-400",
                "bg-gradient-to-r from-green-400 to-blue-400",
                "bg-gradient-to-r from-yellow-200 to-yellow-500",
                "bg-gradient-to-r from-gray-200 to-gray-400",
                "bg-gradient-to-r from-indigo-400 to-pink-400",
                "bg-gradient-to-r from-emerald-400 to-cyan-400",
                "bg-gradient-to-r from-orange-400 to-rose-400",
              ].map((b, i) => (
                <button
                  key={i}
                  className={`h-12 rounded-lg w-full border-2 transition-all duration-150 ${
                    editBg === b
                      ? "border-primary scale-105"
                      : "border-transparent"
                  } ${b}`}
                  onClick={() => {
                    setEditBg(b);
                    setShowEditBgModal(false);
                  }}
                />
              ))}
            </div>
            {editBg && (
              <button
                className="mt-4 btn btn-outline btn-sm"
                onClick={() => setEditBg("")}
              >
                Remove background
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default PostModal;

import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User } from "lucide-react";
import { updateAllowStrangerMessage } from "../lib/axios";
import PostGrid from "../components/PostGrid";
import PostCard from "../components/PostCard";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [allowStrangerMessage, setAllowStrangerMessage] = useState(
    authUser.allowStrangerMessage
  );
  const [updatingStranger, setUpdatingStranger] = useState(false);
  const [tab, setTab] = useState("info");
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (tab === "posts" && authUser && authUser._id) {
      setLoadingPosts(true);
      fetch(`/api/posts/user/${authUser._id}?page=1&limit=20`, {
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => setPosts(data.posts || []))
        .catch(() => setPosts([]))
        .finally(() => setLoadingPosts(false));
    }
  }, [tab, authUser]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleToggleStranger = async () => {
    setUpdatingStranger(true);
    try {
      await updateAllowStrangerMessage(!allowStrangerMessage);
      setAllowStrangerMessage((prev) => !prev);
    } finally {
      setUpdatingStranger(false);
    }
  };

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) =>
        p._id === updatedPost._id ? { ...p, ...updatedPost } : p
      )
    );
  };
  const handlePostDeleted = (deletedId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId));
  };

  // Thêm component PostCardProfile (bố cục 1 cột lớn, giữ nguyên chức năng)
  const PostCardProfile = ({ post, onPostUpdated, onPostDeleted }) => (
    <div className="mb-6 h-[330px]">
      <PostCard
        post={post}
        onPostUpdated={onPostUpdated}
        onPostDeleted={onPostDeleted}
        isProfile
      />
    </div>
  );

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold ">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>
          {/* Tab selector */}
          <div className="flex gap-4 justify-center mt-6 mb-2">
            <button
              className={`btn btn-sm ${
                tab === "info" ? "btn-primary" : "btn-ghost"
              }`}
              onClick={() => setTab("info")}
            >
              Info
            </button>
            <button
              className={`btn btn-sm ${
                tab === "posts" ? "btn-primary" : "btn-ghost"
              }`}
              onClick={() => setTab("posts")}
            >
              Posts
            </button>
          </div>
          {/* Tab content */}
          {tab === "info" && (
            <>
              {/* avatar upload section */}

              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <img
                    src={selectedImg || authUser.profilePic || "/avatar.png"}
                    alt="Profile"
                    className="size-32 rounded-full object-cover border-4 "
                  />
                  <label
                    htmlFor="avatar-upload"
                    className={`
                      absolute bottom-0 right-0
                      bg-base-content hover:scale-105
                      p-2 rounded-full cursor-pointer
                      transition-all duration-200
                      ${
                        isUpdatingProfile
                          ? "animate-pulse pointer-events-none"
                          : ""
                      }
                    `}
                  >
                    <Camera className="w-5 h-5 text-base-200" />
                    <input
                      type="file"
                      id="avatar-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUpdatingProfile}
                    />
                  </label>
                </div>
                <p className="text-sm text-zinc-400">
                  {isUpdatingProfile
                    ? "Uploading..."
                    : "Click the camera icon to update your photo"}
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-1.5">
                  <div className="text-sm text-zinc-400 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </div>
                  <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
                    {authUser?.fullName}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="text-sm text-zinc-400 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </div>
                  <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
                    {authUser?.email}
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-base-300 rounded-xl p-6">
                <h2 className="text-lg font-medium  mb-4">
                  Account Information
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                    <span>Member Since</span>
                    <span>{authUser.createdAt?.split("T")[0]}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span>Account Status</span>
                    <span className="text-green-500">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span>Allow messages from strangers</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={allowStrangerMessage}
                        onChange={handleToggleStranger}
                        disabled={updatingStranger}
                      />
                      <span className="switch-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
          {tab === "posts" && (
            <div className="mt-6">
              {loadingPosts ? (
                <div className="text-center py-10">Loading posts...</div>
              ) : posts.length === 0 ? (
                <div className="text-center text-zinc-400">No posts yet.</div>
              ) : (
                <div className="relative" style={{ minHeight: 680 }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[78vh] overflow-y-auto pr-2 absolute inset-0 scrollbar-hide">
                    {posts.map((post) => (
                      <PostCardProfile
                        key={post._id}
                        post={post}
                        onPostUpdated={handlePostUpdated}
                        onPostDeleted={handlePostDeleted}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;

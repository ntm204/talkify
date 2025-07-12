import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import SearchBar from "./SearchBar";
import { Users, UserPlus, UserCheck, UserX } from "lucide-react";
import UserInfoModal from "./UserInfoModal";

const getRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) return "now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} d`;
  return `${Math.floor(diffInSeconds / 604800)} wk`;
};

const UserCard = ({
  user,
  isFriend,
  status,
  onAddFriend,
  loading,
  onShowInfo,
  onSelect,
}) => (
  <div
    className={`user-card-clickable flex lg:flex-row flex-col items-center gap-2 lg:gap-3 p-2 lg:p-3 mx-1 lg:mx-2 rounded-xl hover:bg-base-200/60 transition-all duration-200 group ${
      isFriend ? "" : ""
    }`}
    style={{ minHeight: "56px", cursor: "pointer" }}
    onClick={() => onSelect && onSelect(user)}
  >
    <div
      className="avatar-clickable w-14 h-14 lg:w-12 lg:h-12 flex-shrink-0 group-hover:scale-105 transition-transform duration-200 relative bg-base-300 rounded-full flex items-center justify-center shadow"
      onClick={(e) => {
        e.stopPropagation();
        onShowInfo && onShowInfo(user);
      }}
      style={{ cursor: "pointer" }}
      tabIndex={0}
      title={user.fullName}
    >
      <img
        src={user.profilePic || "/avatar.png"}
        alt={user.fullName}
        className="w-12 h-12 lg:w-12 lg:h-12 rounded-full object-cover shadow-sm group-hover:shadow-md transition-shadow duration-200"
      />
      {user.isOnline && (
        <span
          className="absolute bottom-1 right-1 size-3 bg-success rounded-full ring-2 ring-base-100 animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
    {/* Mobile: tên dưới avatar, desktop: tên bên phải */}
    <div className="flex-1 min-w-0 flex flex-col items-center lg:items-start">
      <div
        className="font-medium truncate group-hover:font-semibold transition-all duration-200 text-xs lg:text-base text-center lg:text-left w-full"
        title={user.fullName}
      >
        {user.fullName}
      </div>
      {/* Desktop mới hiện last message */}
      {user.lastMessage && (
        <div className="hidden lg:block text-sm text-base-content/60 flex items-baseline group-hover:text-base-content/80 transition-colors duration-200">
          {(() => {
            const prefix = user.lastMessage.isSentByLoggedInUser ? "You: " : "";
            let content = "";
            if (user.lastMessage.text) content = user.lastMessage.text;
            else if (user.lastMessage.image) content = "📷 Image";
            else if (user.lastMessage.sticker) content = "😊 Sticker";
            const fullText = prefix + content;
            const isTooLong = fullText.length > 20;
            const displayText = isTooLong
              ? fullText.slice(0, 20).trim() + "..."
              : fullText;
            return (
              <div className="flex items-baseline text-sm">
                <span className="truncate flex-1 min-w-0">{displayText}</span>
                <span className="ml-1 whitespace-nowrap opacity-60">
                  • {getRelativeTime(user.lastMessage.createdAt)}
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
    {/* Action button chỉ hiện ở desktop */}
    {status === "add" && (
      <button
        className="hidden lg:flex px-3 py-1 bg-primary text-primary-content rounded-full text-xs hover:bg-primary/90 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          onAddFriend && onAddFriend(user._id);
        }}
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="loading loading-spinner loading-xs"></div>
            <span>Sending...</span>
          </>
        ) : (
          <>
            <UserPlus size={12} />
            <span>Add Friend</span>
          </>
        )}
      </button>
    )}
    {status === "sent" && (
      <span className="hidden lg:flex px-3 py-1 bg-warning/20 text-warning rounded-full text-xs items-center gap-1">
        <UserPlus size={12} />
        <span>Sent</span>
      </span>
    )}
  </div>
);

const Sidebar = () => {
  const {
    friends,
    isFriendsLoading,
    fetchFriends,
    selectedUser,
    setSelectedUser,
    globalSearchResults,
    isGlobalSearchLoading,
    searchUsersGlobal,
    sendFriendRequest,
    sentRequests,
    fetchSentRequests,
  } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [userInfoModalUser, setUserInfoModalUser] = useState(null);
  const [sendingRequests, setSendingRequests] = useState(new Set());

  // Đặt filteredFriends lên trên trước mọi useEffect
  const filteredFriends = friends
    .filter((user) => (showOnlineOnly ? onlineUsers.includes(user._id) : true))
    .filter((user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Đếm số bạn bè online
  const onlineFriendsCount = friends.filter((f) =>
    onlineUsers.includes(f._id)
  ).length;

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsersGlobal(searchQuery, true);
    }
  }, [searchQuery, friends, searchUsersGlobal]); // Thêm friends vào dependency để refresh khi friends thay đổi

  // Auto-refresh friends list periodically for real-time updates
  // Xóa interval auto-refresh friends list

  const handleSendFriendRequest = async (userId) => {
    setSendingRequests((prev) => new Set(prev).add(userId));
    try {
      await sendFriendRequest(userId);
      // Refresh sent requests to update UI
      await fetchSentRequests();
    } catch (error) {
      console.error("Error sending friend request:", error);
    } finally {
      setSendingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    // Clear search when selecting a user
    setSearchQuery("");
  };

  const handleAvatarClick = (e, user) => {
    e.stopPropagation();
    setUserInfoModalUser(user);
  };

  if (isFriendsLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200 font-sans bg-base-100 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-semibold text-lg hidden lg:block">
            Contacts
          </span>
        </div>
        <div className="hidden lg:block">
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
              aria-label="Show online users only"
            />
            <span className="text-sm font-medium">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            ({onlineFriendsCount} online)
          </span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {filteredFriends.map((user) => (
          <UserCard
            key={user._id}
            user={{ ...user, isOnline: onlineUsers.includes(user._id) }}
            isFriend={true}
            onShowInfo={setUserInfoModalUser}
            onSelect={handleUserClick}
          />
        ))}

        {searchQuery.trim() && (
          <div>
            {isGlobalSearchLoading ? (
              <div className="text-center text-base-content/60 py-4 text-sm">
                Searching...
              </div>
            ) : globalSearchResults.length === 0 ? (
              <div className="text-center text-base-content/60 py-4 text-sm">
                No users found
              </div>
            ) : (
              <ul className="space-y-2">
                {globalSearchResults
                  .filter((user) => !friends.some((f) => f._id === user._id)) // Loại bỏ friends khỏi search results
                  .map((user) => {
                    // Xác định trạng thái quan hệ
                    let status = "add";
                    if (
                      sentRequests.some((req) => req.recipient._id === user._id)
                    )
                      status = "sent";

                    return (
                      <UserCard
                        key={user._id}
                        user={{
                          ...user,
                          isOnline: onlineUsers.includes(user._id),
                        }}
                        isFriend={false}
                        status={status}
                        loading={sendingRequests.has(user._id)}
                        onAddFriend={handleSendFriendRequest}
                        onShowInfo={setUserInfoModalUser}
                        onSelect={setSelectedUser}
                      />
                    );
                  })}
              </ul>
            )}
          </div>
        )}
        {filteredFriends.length === 0 && !searchQuery.trim() && (
          <div className="text-center text-base-content/60 py-4 text-sm">
            No friends found
          </div>
        )}
      </div>

      {userInfoModalUser && (
        <UserInfoModal
          user={userInfoModalUser}
          onClose={() => setUserInfoModalUser(null)}
        />
      )}
    </aside>
  );
};

export default Sidebar;

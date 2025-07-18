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
  selected,
}) => (
  <div
    className={`user-card-clickable flex lg:flex-row flex-col items-center gap-2 lg:gap-3 p-2 lg:p-3 mx-1 lg:mx-2 rounded-xl transition-all duration-200 group
      ${selected ? "bg-base-300 shadow-md" : "hover:bg-base-200/60"}
    `}
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
        loading="lazy"
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
        <div className="hidden lg:block w-full">
          <div className="flex items-baseline text-sm text-base-content/60 group-hover:text-base-content/80 transition-colors duration-200">
            {(() => {
              const isYou = user.lastMessage.isSentByLoggedInUser;
              let content = "";

              // Xử lý tin nhắn bị thu hồi
              if (user.lastMessage.revoked) {
                content = user.lastMessage.text; // Đã được xử lý từ backend
              } else if (user.lastMessage.text) {
                content = user.lastMessage.text;
              } else if (user.lastMessage.image) {
                content = isYou
                  ? "You sent a photo"
                  : `${user.fullName} sent a photo`;
              } else if (user.lastMessage.sticker) {
                content = isYou
                  ? "You sent a sticker"
                  : `${user.fullName} sent a sticker`;
              } else {
                content = "";
              }

              const MAX_PREVIEW = 22;
              let displayText = "";

              if (isYou && user.lastMessage.text && !user.lastMessage.revoked) {
                const prefix = "You: ";
                const remain = MAX_PREVIEW - prefix.length;
                displayText =
                  prefix +
                  (content.length > remain
                    ? content.slice(0, remain).trim() + "..."
                    : content);
              } else {
                displayText =
                  content.length > MAX_PREVIEW
                    ? content.slice(0, MAX_PREVIEW).trim() + "..."
                    : content;
              }

              return (
                <>
                  {/* Nội dung tin nhắn cuối, rút gọn nếu dài */}
                  <span className="truncate max-w-[70%] overflow-hidden text-ellipsis pr-1 align-middle">
                    {displayText}
                  </span>
                  {/* Thời gian gửi tin nhắn cuối */}
                  <span className="ml-1 whitespace-nowrap opacity-60 align-middle">
                    • {getRelativeTime(user.lastMessage.createdAt)}
                    {user.lastMessage.edited && !user.lastMessage.revoked && (
                      <span className="ml-1">(Edited)</span>
                    )}
                  </span>
                </>
              );
            })()}
          </div>
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
    users,
    isUsersLoading,
    getUsers,
    selectedUser,
    setSelectedUser,
    friends,
    fetchFriends,
  } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [userInfoModalUser, setUserInfoModalUser] = useState(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
    // Nếu chưa có danh sách bạn bè thì fetch
    if (!friends || friends.length === 0) {
      fetchFriends();
    }
  }, [getUsers]);

  // Lấy danh sách ID bạn bè đang online
  const onlineFriendIds = friends
    .filter((f) => onlineUsers.includes(f._id))
    .map((f) => f._id);
  const onlineFriendsCount = onlineFriendIds.length;

  // Gắn lastMessage vào từng bạn bè nếu có
  const friendsWithLastMessage = friends.map((friend) => {
    const userWithLastMessage = users.find((u) => u._id === friend._id);
    return userWithLastMessage
      ? { ...friend, lastMessage: userWithLastMessage.lastMessage }
      : friend;
  });

  // Lọc users theo search và trạng thái online
  let filteredUsers = users.filter((user) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  if (showOnlineOnly) {
    filteredUsers = filteredUsers.filter((user) =>
      onlineUsers.includes(user._id)
    );
  }
  // Sắp xếp: user có lastMessage mới nhất lên đầu, nếu không có thì theo tên
  filteredUsers = filteredUsers.sort((a, b) => {
    const aTime = a.lastMessage
      ? new Date(a.lastMessage.createdAt).getTime()
      : 0;
    const bTime = b.lastMessage
      ? new Date(b.lastMessage.createdAt).getTime()
      : 0;
    if (aTime === 0 && bTime === 0) {
      return a.fullName.localeCompare(b.fullName);
    }
    return bTime - aTime;
  });

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200 font-sans bg-base-100 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-semibold text-lg hidden lg:block">Chats</span>
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
            ({filteredUsers.filter((u) => onlineUsers.includes(u._id)).length}{" "}
            online)
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {isUsersLoading ? (
          <SidebarSkeleton />
        ) : filteredUsers.length === 0 ? (
          <div className="text-center text-base-content/60 py-16">
            No chats found.
          </div>
        ) : (
          filteredUsers.map((user) => (
            <UserCard
              key={user._id}
              user={user}
              isFriend={user.isFriend}
              status={undefined}
              onAddFriend={undefined}
              loading={false}
              onShowInfo={setUserInfoModalUser}
              onSelect={setSelectedUser}
              selected={selectedUser && selectedUser._id === user._id}
            />
          ))
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

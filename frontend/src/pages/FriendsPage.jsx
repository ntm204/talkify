import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { searchUsers as searchUsersApi } from "../lib/axios";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  MessageCircle,
  Heart,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

const TABS = [
  { key: "friends", label: "Friends", icon: Users },
  { key: "received", label: "Received", icon: UserPlus },
  { key: "sent", label: "Sent", icon: UserCheck },
  { key: "search", label: "Search", icon: Search }, // Thêm tab Search
];

const FriendsPage = () => {
  const [tab, setTab] = useState("friends");
  const [searchFriendsQuery, setSearchFriendsQuery] = useState("");
  const [searchAllQuery, setSearchAllQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]); // Kết quả tìm kiếm user
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const {
    friends,
    sentRequests,
    receivedRequests,
    isFriendsLoading,
    isSentRequestsLoading,
    isReceivedRequestsLoading,
    fetchFriends,
    fetchSentRequests,
    fetchReceivedRequests,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    unfriend,
    setSelectedUser,
    sendFriendRequest, // Thêm hàm gửi lời mời
  } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [pendingActionIds, setPendingActionIds] = useState([]); // Lưu các userId đang xử lý

  // Filter friends based on searchFriendsQuery
  const filteredFriends = friends.filter((friend) =>
    friend.fullName.toLowerCase().includes(searchFriendsQuery.toLowerCase())
  );

  // Xử lý tìm kiếm user toàn hệ thống (trừ bản thân và bạn bè đã có)
  useEffect(() => {
    if (tab !== "search" || !searchAllQuery.trim()) {
      setSearchResults([]);
      return;
    }
    let ignore = false;
    setIsSearching(true);
    // Gọi API tìm kiếm user
    (async () => {
      try {
        const data = await searchUsersApi(searchAllQuery, true);
        if (!ignore) setSearchResults(data || []);
      } catch (e) {
        if (!ignore) setSearchResults([]);
      } finally {
        if (!ignore) setIsSearching(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [tab, searchAllQuery]);

  useEffect(() => {
    fetchFriends();
    fetchSentRequests();
    fetchReceivedRequests();
    // eslint-disable-next-line
  }, []);

  // Helper để kiểm tra trạng thái gửi/cancel/accept/decline
  const isPending = (userId) => pendingActionIds.includes(userId);

  const handleSendFriendRequest = async (userId) => {
    setPendingActionIds((ids) => [...ids, userId]);
    try {
      await sendFriendRequest(userId);
      // Cập nhật UI ngay: chuyển thẻ sang trạng thái "sent"
      setSearchResults((results) =>
        results.map((u) => (u._id === userId ? { ...u, _justSent: true } : u))
      );
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || "Error sending friend request";

      // Xử lý các trường hợp lỗi cụ thể
      if (errorMessage.includes("already friends")) {
        // Nếu đã là bạn bè, cập nhật UI để hiển thị trạng thái friend
        setSearchResults((results) =>
          results.map((u) => (u._id === userId ? { ...u, _isFriend: true } : u))
        );
      } else if (errorMessage.includes("already exists")) {
        // Nếu đã có lời mời pending, cập nhật UI để hiển thị trạng thái sent
        setSearchResults((results) =>
          results.map((u) => (u._id === userId ? { ...u, _justSent: true } : u))
        );
      }

      // Hiển thị thông báo lỗi ngắn gọn
      if (
        !errorMessage.includes("already friends") &&
        !errorMessage.includes("already exists")
      ) {
        toast.error(errorMessage);
      }
    } finally {
      setPendingActionIds((ids) => ids.filter((id) => id !== userId));
      fetchSentRequests(); // Đảm bảo đồng bộ với backend
    }
  };

  const handleCancelRequest = async (userId) => {
    setPendingActionIds((ids) => [...ids, userId]);
    try {
      await cancelFriendRequest(userId);
      // Cập nhật UI ngay: xóa khỏi sentRequests
      setSearchResults((results) =>
        results.map((u) => (u._id === userId ? { ...u, _justSent: false } : u))
      );
    } finally {
      setPendingActionIds((ids) => ids.filter((id) => id !== userId));
      fetchSentRequests();
    }
  };

  const handleAcceptRequest = async (userId) => {
    setPendingActionIds((ids) => [...ids, userId]);
    try {
      await acceptFriendRequest(userId);
      // Cập nhật UI ngay: xóa khỏi receivedRequests
    } finally {
      setPendingActionIds((ids) => ids.filter((id) => id !== userId));
      fetchReceivedRequests();
      fetchFriends();
    }
  };

  const handleDeclineRequest = async (userId) => {
    setPendingActionIds((ids) => [...ids, userId]);
    try {
      await declineFriendRequest(userId);
      // Cập nhật UI ngay: xóa khỏi receivedRequests
    } finally {
      setPendingActionIds((ids) => ids.filter((id) => id !== userId));
      fetchReceivedRequests();
    }
  };

  const handleUnfriend = async (friendId) => {
    try {
      await unfriend(friendId);
    } catch (error) {
      console.error("Error unfriending:", error);
    }
  };

  const handleMessageFriend = (friend) => {
    setSelectedUser(friend);
    navigate("/");
  };

  const handleFindFriends = () => {
    navigate("/");
  };

  const UserCard = ({ user, type = "friend", onAction }) => {
    const isOnline = onlineUsers.includes(user._id);
    // Nếu là search, xác định trạng thái dựa vào store (ưu tiên store hơn state tạm)
    let isSent = false;
    let isFriend = false;
    if (type === "search") {
      isSent =
        sentRequests.some((req) => req.recipient._id === user._id) ||
        user._justSent;
      isFriend = friends.some((f) => f._id === user._id) || user._isFriend;
    }

    return (
      <div className="bg-base-300 rounded-xl shadow-sm border border-base-200 hover:border-primary/30 transition-all duration-200 group flex items-center px-5 py-4 gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={user.profilePic || "/avatar.png"}
            alt={user.fullName}
            className="w-14 h-14 rounded-full object-cover shadow"
            loading="lazy"
          />
          {isOnline && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-base-300"></div>
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-lg text-base-content truncate">
            {user.fullName}
          </div>
          <div className="text-sm text-base-content/60">
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          {type === "friend" && (
            <>
              <button
                className="btn btn-circle btn-sm bg-transparent text-success hover:bg-success/10"
                title="Message"
                onClick={() => onAction(user, "message")}
                disabled={isPending(user._id)}
              >
                <MessageCircle size={18} />
              </button>
              <button
                onClick={() => onAction(user._id, "unfriend")}
                className="btn btn-circle btn-sm bg-transparent text-error hover:bg-error/10"
                title="Unfriend"
                disabled={isPending(user._id)}
              >
                <UserX size={18} />
              </button>
            </>
          )}
          {type === "sent" && (
            <button
              onClick={() => onAction(user._id)}
              className="btn btn-circle btn-sm bg-transparent text-warning hover:bg-warning/10"
              title="Cancel Request"
              disabled={isPending(user._id)}
            >
              <UserX size={18} />
            </button>
          )}
          {type === "received" && (
            <>
              <button
                onClick={() => onAction(user._id, "accept")}
                className="btn btn-circle btn-sm bg-primary hover:bg-primary/10 text-primary-content"
                title="Accept"
                disabled={isPending(user._id)}
              >
                <UserCheck size={18} />
              </button>
              <button
                onClick={() => onAction(user._id, "decline")}
                className="btn btn-circle btn-sm bg-transparent text-error hover:bg-error/10"
                title="Decline"
                disabled={isPending(user._id)}
              >
                <UserX size={18} />
              </button>
            </>
          )}
          {type === "search" && !isSent && !isFriend && (
            <button
              onClick={() => handleSendFriendRequest(user._id)}
              className="btn btn-circle btn-sm bg-primary hover:bg-primary/10 text-primary-content"
              title="Add Friend"
              disabled={isPending(user._id)}
            >
              <UserPlus size={18} />
            </button>
          )}
          {type === "search" && isSent && (
            <button
              className="btn btn-circle btn-sm bg-warning/10 text-warning cursor-default"
              title="Sent"
              disabled
            >
              <UserPlus size={18} />
            </button>
          )}
          {type === "search" && isFriend && (
            <button
              className="btn btn-circle btn-sm bg-success/10 text-success cursor-default"
              title="Friends"
              disabled
            >
              <UserCheck size={18} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-base-100 rounded-lg shadow-sm border border-base-300 p-4 animate-pulse"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 bg-base-300 rounded-full flex-shrink-0"></div>
              <div className="min-w-0 flex-1">
                <div className="h-4 bg-base-300 rounded w-3/4 mb-1.5"></div>
                <div className="h-3 bg-base-300 rounded w-1/2"></div>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <div className="w-6 h-6 bg-base-300 rounded-full"></div>
              <div className="w-6 h-6 bg-base-300 rounded-full"></div>
            </div>
          </div>
          <div className="h-6 bg-base-300 rounded"></div>
        </div>
      ))}
    </div>
  );

  // Khi chuyển tab, không giữ lại giá trị search của tab trước
  const handleTabChange = (tabKey) => {
    setTab(tabKey);
    // Nếu chuyển sang friends thì không reset searchFriendsQuery, chỉ reset searchAllQuery
    // Nếu chuyển sang search thì không reset searchAllQuery, chỉ reset searchFriendsQuery
    // Nếu muốn reset cả 2 khi chuyển tab, bỏ comment dưới:
    // setSearchFriendsQuery("");
    // setSearchAllQuery("");
  };

  return (
    <div className="min-h-screen bg-base-200 pt-16">
      <div className="max-w-7xl mx-auto py-8 px-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Tabs */}
          <aside className="lg:w-64 bg-base-100 rounded-xl shadow p-6 h-fit">
            <h2 className="text-2xl font-bold text-base-content mb-6">
              Friends
            </h2>
            <div className="flex flex-col gap-3">
              {TABS.map((tabItem) => (
                <button
                  key={tabItem.key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200
                    ${
                      tab === tabItem.key
                        ? "bg-primary text-primary-content shadow-md"
                        : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                    }
                  `}
                  onClick={() => handleTabChange(tabItem.key)}
                >
                  <tabItem.icon size={20} />
                  <span>{tabItem.label}</span>
                  {tabItem.key !== "search" && (
                    <span className="ml-auto bg-base-content/20 text-base-content px-2 py-0.5 rounded-full text-xs">
                      {tabItem.key === "friends"
                        ? friends.length
                        : tabItem.key === "received"
                        ? receivedRequests.length
                        : sentRequests.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-base-content">
                  My Connections
                </h1>
              </div>
              <p className="text-base-content/60 text-base">
                Manage your connections and friend requests
              </p>
            </div>

            {/* Search Bar - Only show for Friends tab or Search tab */}
            {tab === "friends" && (
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search friends..."
                    value={searchFriendsQuery}
                    onChange={(e) => setSearchFriendsQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  />
                </div>
              </div>
            )}
            {tab === "search" && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchAllQuery}
                  onChange={(e) => setSearchAllQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
              </div>
            )}

            <div className="space-y-8">
              {/* Tab Friends */}
              {tab === "friends" && (
                <div>
                  {isFriendsLoading ? (
                    <LoadingSkeleton />
                  ) : friends.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="bg-base-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <Users className="w-10 h-10 text-base-content/30" />
                      </div>
                      <h3 className="text-xl font-semibold text-base-content mb-2">
                        No friends yet
                      </h3>
                      <p className="text-base-content/60 mb-6 text-base">
                        Start connecting with people to see them here
                      </p>
                      <button
                        className="btn btn-primary gap-2"
                        onClick={handleFindFriends}
                      >
                        <Search size={18} />
                        Find Friends
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {friends.map((friend) => (
                        <UserCard
                          key={friend._id}
                          user={friend}
                          type="friend"
                          onAction={(userId, action) => {
                            if (action === "message") {
                              handleMessageFriend(friend);
                            } else {
                              handleUnfriend(userId);
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Tab Search - tìm user toàn hệ thống */}
              {tab === "search" && (
                <div>
                  {isSearching ? (
                    <LoadingSkeleton />
                  ) : searchAllQuery.trim() === "" ? (
                    <div className="text-center text-base-content/60 py-16">
                      Enter a name or email to search for users.
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center text-base-content/60 py-16">
                      No users found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults
                        .filter(
                          (u) =>
                            u._id !== authUser._id &&
                            !friends.some((f) => f._id === u._id)
                        )
                        .map((user) => (
                          <UserCard
                            key={user._id}
                            user={user}
                            type="search"
                            onAction={async (userId) => {
                              await handleSendFriendRequest(userId);
                              // Optionally: refresh search results or sentRequests
                            }}
                          />
                        ))}
                    </div>
                  )}
                </div>
              )}
              {/* Tab Received */}
              {tab === "received" && (
                <div>
                  {isReceivedRequestsLoading ? (
                    <LoadingSkeleton />
                  ) : receivedRequests.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="bg-base-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <UserPlus className="w-10 h-10 text-base-content/30" />
                      </div>
                      <h3 className="text-xl font-semibold text-base-content mb-2">
                        No pending requests
                      </h3>
                      <p className="text-base-content/60 text-base">
                        You don't have any friend requests waiting
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {receivedRequests.map((request) => (
                        <UserCard
                          key={request._id}
                          user={request.requester}
                          type="received"
                          onAction={(userId, action) => {
                            if (action === "accept")
                              handleAcceptRequest(userId);
                            else if (action === "decline")
                              handleDeclineRequest(userId);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "sent" && (
                <div>
                  {isSentRequestsLoading ? (
                    <LoadingSkeleton />
                  ) : sentRequests.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="bg-base-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <UserCheck className="w-10 h-10 text-base-content/30" />
                      </div>
                      <h3 className="text-xl font-semibold text-base-content mb-2">
                        No sent requests
                      </h3>
                      <p className="text-base-content/60 text-base">
                        You haven't sent any friend requests yet
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sentRequests.map((request) => (
                        <UserCard
                          key={request._id}
                          user={request.recipient}
                          type="sent"
                          onAction={handleCancelRequest}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;

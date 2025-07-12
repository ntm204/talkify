import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  MessageCircle,
  Heart,
  Search,
} from "lucide-react";

const TABS = [
  { key: "friends", label: "Friends", icon: Users },
  { key: "received", label: "Received", icon: UserPlus },
  { key: "sent", label: "Sent", icon: UserCheck },
];

const FriendsPage = () => {
  const [tab, setTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
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
  } = useChatStore();
  const { onlineUsers } = useAuthStore();

  // Filter friends based on search query
  const filteredFriends = friends.filter((friend) =>
    friend.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchFriends();
    fetchSentRequests();
    fetchReceivedRequests();
    // eslint-disable-next-line
  }, []);

  const handleAcceptRequest = async (requesterId) => {
    try {
      await acceptFriendRequest(requesterId);
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleDeclineRequest = async (requesterId) => {
    try {
      await declineFriendRequest(requesterId);
    } catch (error) {
      console.error("Error declining friend request:", error);
    }
  };

  const handleCancelRequest = async (recipientId) => {
    try {
      await cancelFriendRequest(recipientId);
    } catch (error) {
      console.error("Error canceling friend request:", error);
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
    return (
      <div className="bg-base-300 rounded-xl shadow-sm border border-base-200 hover:border-primary/30 transition-all duration-200 group flex items-center px-5 py-4 gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={user.profilePic || "/avatar.png"}
            alt={user.fullName}
            className="w-14 h-14 rounded-full object-cover shadow"
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
                title="Send message"
                onClick={() => onAction(user, "message")}
              >
                <MessageCircle size={18} />
              </button>
              <button
                onClick={() => onAction(user._id, "unfriend")}
                className="btn btn-circle btn-sm bg-transparent text-error hover:bg-error/10"
                title="Unfriend"
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
            >
              <UserX size={18} />
            </button>
          )}
          {type === "received" && (
            <>
              <button
                onClick={() => onAction(user._id, "accept")}
                className="btn btn-sm btn-primary flex-1 gap-2"
              >
                <UserCheck size={16} />
                Accept
              </button>
              <button
                onClick={() => onAction(user._id, "decline")}
                className="btn btn-sm btn-outline btn-error flex-1 gap-2"
              >
                <UserX size={16} />
                Decline
              </button>
            </>
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
                  onClick={() => setTab(tabItem.key)}
                >
                  <tabItem.icon size={20} />
                  <span>{tabItem.label}</span>
                  <span className="ml-auto bg-base-content/20 text-base-content px-2 py-0.5 rounded-full text-xs">
                    {tabItem.key === "friends"
                      ? friends.length
                      : tabItem.key === "received"
                      ? receivedRequests.length
                      : sentRequests.length}
                  </span>
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

            {/* Search Bar - Only show for Friends tab */}
            {tab === "friends" && (
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  />
                </div>
              </div>
            )}

            <div className="space-y-8">
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

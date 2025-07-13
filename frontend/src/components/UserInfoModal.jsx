import React, { useEffect, useState } from "react";
import { fetchFriendCount, updateAllowStrangerMessage } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import {
  X,
  Users,
  MessageCircle,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
} from "lucide-react";

const UserInfoModal = ({ user, onClose }) => {
  const [friendCount, setFriendCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allowStrangerMessage, setAllowStrangerMessage] = useState(
    user.allowStrangerMessage
  );
  const [updatingStranger, setUpdatingStranger] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const { authUser } = useAuthStore();
  const {
    friends,
    sentRequests,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    unfriend,
    setSelectedUser,
    fetchSentRequests,
  } = useChatStore();

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchFriendCount(user._id)
      .then((count) => {
        if (!ignore) setFriendCount(count);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [user._id]);

  // Update local state when user prop changes
  useEffect(() => {
    setAllowStrangerMessage(user.allowStrangerMessage);
  }, [user.allowStrangerMessage]);

  const handleToggleStranger = async () => {
    setUpdatingStranger(true);
    try {
      const updatedUser = await updateAllowStrangerMessage(
        !allowStrangerMessage
      );
      setAllowStrangerMessage(updatedUser.allowStrangerMessage);
      // Update auth store with new user data
      useAuthStore.setState({ authUser: updatedUser });
    } catch (error) {
      console.error("Error updating stranger message setting:", error);
      // Revert local state on error
      setAllowStrangerMessage(allowStrangerMessage);
    } finally {
      setUpdatingStranger(false);
    }
  };

  const handleMessageUser = () => {
    setSelectedUser(user);
    onClose();
  };

  const handleSendFriendRequest = async () => {
    setSendingRequest(true);
    try {
      await sendFriendRequest(user._id);
      await fetchSentRequests();
    } catch (error) {
      console.error("Error sending friend request:", error);
    } finally {
      setSendingRequest(false);
    }
  };

  // Xác định trạng thái quan hệ
  let status = "add";
  if (authUser._id === user._id) status = "me";
  else if (sentRequests.some((req) => req.recipient._id === user._id))
    status = "sent";
  else if (friends.some((f) => f._id === user._id)) status = "friend";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-4 relative transform transition-all duration-300 scale-100">
        <button
          className="absolute top-4 right-4 text-base-content/60 hover:text-base-content transition-colors duration-200 p-2 rounded-full hover:bg-base-200"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center gap-6">
          {/* Avatar Section */}
          <div className="relative">
            <img
              src={user.profilePic || "/avatar.png"}
              alt={user.fullName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-lg border-4 border-base-200"
              loading="lazy"
            />
            <div className="absolute -bottom-2 -right-2 bg-primary text-primary-content rounded-full p-1.5 sm:p-2 shadow-md">
              <Users size={14} className="sm:w-4 sm:h-4" />
            </div>
          </div>

          {/* User Info */}
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-base-content mb-2">
              {user.fullName}
            </h2>
            <div className="flex items-center justify-center gap-2 text-base-content/60">
              <Users size={14} className="sm:w-4 sm:h-4" />
              <span className="text-sm">
                {loading ? "Loading..." : `${friendCount} friends`}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-4">
            {status === "me" && (
              <div className="space-y-4">
                <div className="bg-base-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield
                        size={18}
                        className="sm:w-5 sm:h-5 text-primary"
                      />
                      <div>
                        <h3 className="font-medium text-base-content text-sm sm:text-base">
                          Message Privacy
                        </h3>
                        <p className="text-xs sm:text-sm text-base-content/60">
                          Allow messages from strangers
                        </p>
                      </div>
                    </div>
                    <label className="swap swap-flip">
                      <input
                        type="checkbox"
                        checked={allowStrangerMessage}
                        onChange={handleToggleStranger}
                        disabled={updatingStranger}
                        className="checkbox checkbox-primary checkbox-sm sm:checkbox-md"
                      />
                      <div className="swap-on text-xs">ON</div>
                      <div className="swap-off text-xs">OFF</div>
                    </label>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-base-content/40">
                    This is your profile
                  </span>
                </div>
              </div>
            )}

            {status === "add" && (
              <button
                className="btn btn-primary w-full gap-2 hover:scale-105 transition-transform duration-200 btn-sm sm:btn-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSendFriendRequest}
                disabled={sendingRequest}
              >
                {sendingRequest ? (
                  <>
                    <div className="loading loading-spinner loading-xs"></div>
                    <span>Sending Request...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} className="sm:w-5 sm:h-5" />
                    <span>Add Friend</span>
                  </>
                )}
              </button>
            )}

            {status === "sent" && (
              <div className="space-y-3">
                <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 text-center">
                  <UserPlus
                    size={18}
                    className="sm:w-5 sm:h-5 text-warning mx-auto mb-2"
                  />
                  <p className="text-sm text-warning">Friend request sent</p>
                </div>
                <button
                  className="btn btn-outline btn-warning w-full gap-2 hover:scale-105 transition-transform duration-200 btn-sm sm:btn-md"
                  onClick={() => cancelFriendRequest(user._id)}
                >
                  <UserX size={16} className="sm:w-5 sm:h-5" />
                  Cancel Request
                </button>
              </div>
            )}

            {status === "friend" && (
              <div className="space-y-3">
                <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
                  <UserCheck
                    size={18}
                    className="sm:w-5 sm:h-5 text-success mx-auto mb-2"
                  />
                  <p className="text-sm text-success">You are friends</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    className="btn btn-primary flex-1 gap-2 hover:scale-105 transition-transform duration-200 btn-sm sm:btn-md"
                    onClick={handleMessageUser}
                  >
                    <MessageCircle size={16} className="sm:w-5 sm:h-5" />
                    Message
                  </button>
                  <button
                    className="btn btn-outline btn-error flex-1 gap-2 hover:scale-105 transition-transform duration-200 btn-sm sm:btn-md"
                    onClick={() => unfriend(user._id)}
                  >
                    <UserX size={16} className="sm:w-5 sm:h-5" />
                    Unfriend
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfoModal;

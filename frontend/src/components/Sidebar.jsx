import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import SearchBar from "./SearchBar";
import { Users } from "lucide-react";

const getRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) return "now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} d`;
  return `${Math.floor(diffInSeconds / 604800)} wk`;
};

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } =
    useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const filteredUsers = users
    .filter((user) => (showOnlineOnly ? onlineUsers.includes(user._id) : true))
    .filter((user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200 font-sans">
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
            ({onlineUsers.length - 1} online)
          </span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors duration-200
              ${
                selectedUser?._id === user._id
                  ? "bg-base-300 ring-1 ring-base-300"
                  : ""
              }
            `}
            aria-label={`Select user ${user.fullName}`}
            type="button"
          >
            <div className="relative flex-shrink-0 w-12 h-12">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={`${user.fullName}'s profile picture`}
                className="w-12 h-12 object-cover rounded-full"
              />
              {onlineUsers.includes(user._id) && (
                <span
                  className="absolute bottom-0 right-0 size-3 bg-green-500
                  rounded-full ring-2 ring-zinc-900"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="hidden lg:block text-left min-w-0 flex-1">
              <div className="font-medium truncate">{user.fullName}</div>
              {user.lastMessage && (
                <div className="text-sm text-zinc-400 flex items-baseline">
                  {(() => {
                    const prefix = user.lastMessage.isSentByLoggedInUser
                      ? "You: "
                      : "";
                    const content =
                      user.lastMessage.text ||
                      (user.lastMessage.image && "Images") ||
                      "";
                    const fullText = prefix + content;
                    const isTooLong = fullText.length > 20;
                    const displayText = isTooLong
                      ? fullText.slice(0, 20).trim() + "..."
                      : fullText;

                    return (
                      <div className="flex items-baseline text-sm text-zinc-400">
                        <span className="truncate flex-1 min-w-0">
                          {displayText}
                        </span>
                        <span className="ml-1 whitespace-nowrap">
                          ・{getRelativeTime(user.lastMessage.createdAt)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4 text-sm">
            No users found
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

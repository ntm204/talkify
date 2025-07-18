import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const MessageOptions = ({ message, onEditStart }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef(null);
  const { revokeMessage } = useChatStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRevoke = async () => {
    setIsLoading(true);
    try {
      await revokeMessage(message._id);
      setIsOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to revoke message.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    onEditStart();
    setIsOpen(false);
  };

  if (!authUser || message.senderId !== authUser._id) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        disabled={isLoading}
        tabIndex={0}
      >
        <MoreHorizontal size={16} className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[120px]">
          <button
            onClick={handleEdit}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={isLoading}
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={handleRevoke}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            disabled={isLoading}
          >
            <Trash2 size={14} />
            {isLoading ? "Processing..." : "Revoke"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageOptions;

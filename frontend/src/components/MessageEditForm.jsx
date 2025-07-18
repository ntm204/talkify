import { useState, useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const MessageEditForm = ({ message, onCancel }) => {
  const [text, setText] = useState(message.text || "");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const { editMessage } = useChatStore();

  useEffect(() => {
    // Auto focus vào input khi component mount
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || text.trim() === message.text) {
      onCancel();
      return;
    }

    setIsLoading(true);
    try {
      await editMessage(message._id, text.trim());
      onCancel();
    } catch (error) {
      console.error("Error editing message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-sm"
          placeholder="Edit your message..."
          disabled={isLoading}
        />
        <div className="flex items-center gap-1">
          <button
            type="submit"
            disabled={isLoading || !text.trim() || text.trim() === message.text}
            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={16} className="text-green-600 dark:text-green-400" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={16} className="text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>
    </form>
  );
};

export default MessageEditForm;

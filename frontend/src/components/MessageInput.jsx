import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Sticker, Smile } from "lucide-react";
import toast from "react-hot-toast";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import stickers from "../constants/stickersData";

const MessageInput = ({ replyingMessage, setReplyingMessage }) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const stickerPickerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const { sendMessage, sendTypingStatus, selectedUser } = useChatStore();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        stickerPickerRef.current &&
        !stickerPickerRef.current.contains(event.target) &&
        !event.target.closest(
          ".btn-circle.btn-md.btn-ghost.text-zinc-400[aria-label='Toggle sticker picker']"
        )
      ) {
        setShowStickerPicker(false);
      }

      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        !event.target.closest(
          ".btn-circle.btn-md.btn-ghost.text-zinc-400[aria-label='Toggle emoji picker']"
        )
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showStickerPicker || showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStickerPicker, showEmojiPicker]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTyping && selectedUser) sendTypingStatus(false);
    };
  }, [selectedUser, sendTypingStatus, isTyping]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    try {
      if (isTyping) {
        sendTypingStatus(false);
        setIsTyping(false);
        clearTimeout(typingTimeoutRef.current);
      }
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        replyTo: replyingMessage ? replyingMessage._id : undefined,
      });
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (replyingMessage) setReplyingMessage(null);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleSendSticker = async (stickerPath) => {
    try {
      if (isTyping) {
        sendTypingStatus(false);
        setIsTyping(false);
        clearTimeout(typingTimeoutRef.current);
      }
      await sendMessage({ sticker: stickerPath });
      setShowStickerPicker(false);
    } catch (error) {
      console.error("Failed to send sticker:", error);
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (!selectedUser) return;
    if (!isTyping) {
      sendTypingStatus(true);
      setIsTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
      setIsTyping(false);
    }, 1000);
  };

  const handleEmojiSelect = (emoji) => {
    setText((prevText) => prevText + emoji.native);
    setShowEmojiPicker(false);
  };

  return (
    <div className="p-4 w-full relative">
      {/* Divider */}
      <div className="w-full h-px bg-base-300 dark:bg-base-300 mb-2" />
      {replyingMessage && (
        <div
          className="mb-2 flex items-center justify-between px-3 py-1 rounded-md"
          style={{ minHeight: 32 }}
        >
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-sm text-primary truncate">
              Replying to{" "}
              {replyingMessage.senderId === selectedUser._id
                ? selectedUser.fullName || selectedUser.username
                : "You"}
            </span>
            <span className="text-xs text-gray-500 italic truncate max-w-[220px]">
              {replyingMessage.text}
              {replyingMessage.image && (
                <img
                  src={replyingMessage.image}
                  alt="img"
                  className="w-5 h-5 rounded object-cover inline-block ml-1 align-text-bottom"
                />
              )}
              {replyingMessage.sticker && (
                <img
                  src={replyingMessage.sticker}
                  alt="sticker"
                  className="w-5 h-5 inline-block ml-1 align-text-bottom"
                />
              )}
            </span>
          </div>
          <button
            type="button"
            className="ml-2 text-gray-400 hover:text-red-500 p-1 rounded-full transition-colors"
            onClick={() => setReplyingMessage(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              loading="lazy"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {showStickerPicker && (
        <div
          className="absolute bottom-20 left-4 bg-base-200 p-3 rounded-lg shadow-lg grid grid-cols-4 gap-2 z-10 max-h-48 overflow-y-auto sticker-picker-container"
          ref={stickerPickerRef}
        >
          {stickers.map((stickerPath, index) => (
            <img
              key={index}
              src={stickerPath}
              alt={`Sticker ${index + 1}`}
              className="w-12 h-12 cursor-pointer"
              onClick={() => handleSendSticker(stickerPath)}
              loading="lazy"
            />
          ))}
        </div>
      )}

      {showEmojiPicker && (
        <div
          className="absolute bottom-20 right-4 bg-base-200 rounded-lg shadow-lg z-10"
          ref={emojiPickerRef}
        >
          <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="dark" />
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div
          className={`flex items-center gap-2 ${
            text ? "button-group collapsed" : "button-group expand"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <button
            type="button"
            className="btn btn-circle btn-md btn-ghost text-zinc-400"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
          <button
            type="button"
            className="btn btn-circle btn-md btn-ghost text-zinc-400"
            onClick={() => setShowStickerPicker(!showStickerPicker)}
            aria-label="Toggle sticker picker"
          >
            <Sticker size={20} />
          </button>
        </div>
        <input
          type="text"
          className={`flex-1 input input-bordered input-md ${
            text ? "expanded" : "shrink"
          }`}
          placeholder="Type a message..."
          value={text}
          onChange={handleTextChange}
        />
        <button
          type="button"
          className="btn btn-circle btn-md btn-ghost text-zinc-400"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          aria-label="Toggle emoji picker"
        >
          <Smile size={20} />
        </button>
        <button
          type="submit"
          className="btn btn-circle btn-md text-zinc-400"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;

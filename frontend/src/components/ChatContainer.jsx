import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import MessageOptions from "./MessageOptions";
import MessageEditForm from "./MessageEditForm";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { canMessage } from "../lib/axios";
import {
  AlertCircle,
  UserPlus,
  Shield,
  MessageCircle,
  Reply,
} from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUsers,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyingMessage, setReplyingMessage] = useState(null);

  const isSelectedUserTyping = typingUsers.includes(selectedUser?._id);

  useEffect(() => {
    getMessages(selectedUser._id);
  }, [selectedUser._id, getMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (messageEndRef.current && isSelectedUserTyping) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isSelectedUserTyping]);

  // Nếu replyingMessage bị revoke thì ẩn reply preview
  useEffect(() => {
    if (
      replyingMessage &&
      messages.some((msg) => msg._id === replyingMessage._id && msg.revoked)
    ) {
      setReplyingMessage(null);
    }
  }, [messages, replyingMessage]);

  const handleEditStart = (messageId) => {
    setEditingMessageId(messageId);
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
  };

  const handleReply = (message) => {
    setReplyingMessage(message);
  };

  if (isMessagesLoading)
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) =>
          message.system ? (
            <div key={message._id} className="w-full flex my-2 justify-center">
              <div
                className="flex items-center gap-2 bg-base-200 text-base-content/60 text-sm px-5 py-2 rounded-2xl max-w-md border border-base-300 mx-auto shadow-sm"
                style={{ opacity: 0.92, fontStyle: "italic" }}
              >
                <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                <span className="truncate">{message.text}</span>
              </div>
            </div>
          ) : (
            <div
              key={message._id}
              className={`chat ${
                message.senderId === authUser._id ? "chat-end" : "chat-start"
              }`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      message.senderId === authUser._id
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="chat-header mb-1 flex items-center gap-2">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                  {message.edited && !message.revoked && (
                    <span className="ml-1 text-xs opacity-60">(Edited)</span>
                  )}
                </time>
              </div>
              {/* Bọc dòng thông báo reply và bong bóng chat trong flex-col để đồng bộ căn lề */}
              <div
                className={`flex flex-col ${
                  message.senderId === authUser._id
                    ? "items-end"
                    : "items-start"
                }`}
              >
                {message.replyTo && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-300 mb-1">
                    <Reply size={16} className="inline-block text-primary" />
                    <span>
                      {message.senderId === message.replyTo.senderId
                        ? "You replied to yourself"
                        : `You replied to ${
                            message.replyTo.senderId === selectedUser._id
                              ? selectedUser.fullName || selectedUser.username
                              : "this user"
                          }`}
                    </span>
                  </div>
                )}
                {/* Hàng chứa icon và bong bóng chat */}
                <div
                  className={`flex items-center group relative w-fit ${
                    message.senderId === authUser._id ? "ml-auto" : ""
                  }`}
                >
                  {/* Kebab menu và reply icon cho tin nhắn của mình */}
                  {message.senderId === authUser._id ? (
                    <div className="flex items-center gap-x-2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>
                        <MessageOptions
                          message={message}
                          onEditStart={() => handleEditStart(message._id)}
                        />
                      </span>
                      {!message.revoked && (
                        <span
                          className="cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                          title="Reply"
                          onClick={() => handleReply(message)}
                        >
                          <Reply size={18} className="text-gray-500" />
                        </span>
                      )}
                    </div>
                  ) : (
                    // Tin nhắn của người nhận: icon reply ở bên phải bong bóng
                    !message.revoked && (
                      <span
                        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        title="Reply"
                        onClick={() => handleReply(message)}
                        style={{ order: 2 }}
                      >
                        <Reply size={18} className="text-gray-500" />
                      </span>
                    )
                  )}
                  {/* Bong bóng chat */}
                  <div
                    className={`chat-bubble flex flex-col relative ${
                      message.senderId === authUser._id
                        ? "bg-primary text-primary-content"
                        : "bg-base-200 text-base-content"
                    }`}
                  >
                    {/* Nếu là reply, hiển thị nội dung tin nhắn được reply (bọc rõ ràng) */}
                    {message.replyTo && (
                      <div className="mb-2 px-3 py-2 rounded-md bg-base-300/80 dark:bg-base-100/60 text-sm text-gray-700 dark:text-gray-200 font-medium w-fit max-w-xs">
                        {message.replyTo.text && (
                          <span>{message.replyTo.text}</span>
                        )}
                        {message.replyTo.image && (
                          <img
                            src={message.replyTo.image}
                            alt="img"
                            className="w-6 h-6 rounded object-cover ml-2 inline-block align-middle"
                          />
                        )}
                        {message.replyTo.sticker && (
                          <img
                            src={message.replyTo.sticker}
                            alt="sticker"
                            className="w-6 h-6 ml-2 inline-block align-middle"
                          />
                        )}
                      </div>
                    )}
                    {editingMessageId === message._id ? (
                      <MessageEditForm
                        message={message}
                        onCancel={handleEditCancel}
                      />
                    ) : message.revoked ? (
                      <p className="italic text-gray-500 dark:text-gray-400">
                        Message has been revoked
                      </p>
                    ) : (
                      <>
                        {message.image && (
                          <img
                            src={message.image}
                            alt="Attachment"
                            className="sm:max-w-[200px] rounded-md mb-2"
                            loading="lazy"
                          />
                        )}
                        {message.sticker && (
                          <img
                            src={message.sticker}
                            alt="Sticker"
                            className="sm:max-w-[100px] rounded-md mb-2"
                            loading="lazy"
                          />
                        )}
                        {message.text && (
                          <span style={{ whiteSpace: "pre-line" }}>
                            {message.text}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
        {isSelectedUserTyping && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt="profile pic"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="chat-bubble flex items-center">
              <span className="loading loading-dots loading-md"></span>
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>
      <MessageInput
        replyingMessage={replyingMessage}
        setReplyingMessage={setReplyingMessage}
      />
    </div>
  );
};
export default ChatContainer;

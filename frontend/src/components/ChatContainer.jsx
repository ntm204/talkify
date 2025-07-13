import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { canMessage } from "../lib/axios";
import { AlertCircle, UserPlus, Shield, MessageCircle } from "lucide-react";

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
            <div key={message._id} className="w-full flex justify-center my-4">
              <div className="bg-base-200/80 backdrop-blur-sm border border-base-300 rounded-2xl px-4 sm:px-6 py-4 max-w-sm sm:max-w-md mx-2 sm:mx-4 shadow-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-warning/20 p-2 rounded-full flex-shrink-0">
                    <AlertCircle size={16} className="text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base-content text-sm sm:text-base mb-1">
                      Message Blocked
                    </h4>
                    <p className="text-base-content/70 text-xs sm:text-sm leading-relaxed">
                      This user doesn't accept messages from strangers. Send a
                      friend request to start chatting.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <button className="btn btn-primary btn-sm gap-2 flex-1 hover:scale-105 transition-transform duration-200">
                    <UserPlus size={14} />
                    <span className="hidden sm:inline">
                      Send Friend Request
                    </span>
                    <span className="sm:hidden">Add Friend</span>
                  </button>
                  <button className="btn btn-outline btn-sm gap-2 flex-1 hover:scale-105 transition-transform duration-200">
                    <Shield size={14} />
                    <span className="hidden sm:inline">Learn More</span>
                    <span className="sm:hidden">Info</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              key={message._id}
              className={`chat ${
                message.senderId === authUser._id ? "chat-end" : "chat-start"
              }`}
            >
              <div className=" chat-image avatar">
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
              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              <div className="chat-bubble flex flex-col">
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
                {message.text && <p>{message.text}</p>}
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
      <MessageInput />
    </div>
  );
};
export default ChatContainer;

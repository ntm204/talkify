import { useState } from "react";
import {
  User,
  Image as ImageIcon,
  Globe,
  Users,
  Lock,
  X,
  Smile,
  Palette,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useDropzone } from "react-dropzone";

const CreatePostModal = ({ onClose, onPostCreated }) => {
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [feeling, setFeeling] = useState(null);
  const [showBgModal, setShowBgModal] = useState(false);
  const [bg, setBg] = useState("");

  const { authUser } = useAuthStore();

  // Drag & drop image
  const onDrop = (acceptedFiles) => {
    if (acceptedFiles && acceptedFiles[0]) {
      setImage(acceptedFiles[0]);
      setPreview(URL.createObjectURL(acceptedFiles[0]));
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset_demo"; // <-- Thay bằng upload_preset của bạn
  const CLOUDINARY_CLOUD_NAME = "dwcph1j6p"; // <-- Thay bằng cloud_name của bạn

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
    const data = await res.json();
    if (data.secure_url) return data.secure_url;
    throw new Error("Upload failed");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let media = [];
      if (image) {
        // Upload ảnh lên Cloudinary
        const url = await uploadToCloudinary(image);
        media = [{ url, type: "image" }];
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content,
          media,
          privacy,
          background: bg,
          feeling: feeling
            ? { icon: feeling.icon, label: feeling.label }
            : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onPostCreated(data.post);
        onClose();
      } else {
        setError(data.message || "Failed to create post");
      }
    } catch (err) {
      setError("Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  const FEELINGS = [
    { icon: "😊", label: "Happy" },
    { icon: "😢", label: "Sad" },
    { icon: "😡", label: "Angry" },
    { icon: "😍", label: "In love" },
    { icon: "😴", label: "Sleepy" },
    { icon: "🤔", label: "Thinking" },
    { icon: "😎", label: "Cool" },
    { icon: "🥳", label: "Celebrating" },
  ];
  const BACKGROUNDS = [
    "bg-gradient-to-r from-pink-400 via-red-400 to-yellow-400",
    "bg-gradient-to-r from-blue-400 to-purple-400",
    "bg-gradient-to-r from-green-400 to-blue-400",
    "bg-gradient-to-r from-yellow-200 to-yellow-500",
    "bg-gradient-to-r from-gray-200 to-gray-400",
    "bg-gradient-to-r from-indigo-400 to-pink-400",
    "bg-gradient-to-r from-emerald-400 to-cyan-400",
    "bg-gradient-to-r from-orange-400 to-rose-400",
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-2xl shadow-2xl p-0 w-full max-w-lg relative animate-fadeIn">
        <div className="flex items-center justify-between px-6 pt-5 pb-2 border-b border-base-200">
          <div className="flex items-center gap-3">
            <img
              src={authUser?.profilePic || "/avatar.png"}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="font-semibold text-base-content text-lg">
              {authUser?.fullName || "User"}
            </div>
          </div>
          <button
            className="btn btn-sm btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              className="btn btn-ghost btn-xs flex items-center gap-1"
              onClick={() => setShowFeelingModal(true)}
            >
              <Smile className="w-5 h-5 text-yellow-500" />
              <span className="text-xs font-medium">
                {feeling ? `${feeling.icon} ${feeling.label}` : "Add Feeling"}
              </span>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs flex items-center gap-1"
              onClick={() => setShowBgModal(true)}
            >
              <Palette className="w-5 h-5 text-pink-500" />
              <span className="text-xs font-medium">Background</span>
            </button>
          </div>
          <textarea
            className={`textarea textarea-bordered text-lg min-h-[90px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 ${
              bg ? "text-center text-white font-bold text-2xl py-10 " + bg : ""
            }`}
            rows={4}
            placeholder={
              feeling
                ? `I'm feeling ${feeling.label.toLowerCase()}...`
                : "Share something interesting..."
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required={!image}
            maxLength={1000}
            autoFocus
            style={bg ? { background: "none" } : {}}
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-base-200 hover:bg-base-300 transition border border-base-300">
              <ImageIcon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-base-content">
                Add Image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setImage(file);
                  setPreview(URL.createObjectURL(file));
                }}
                className="hidden"
              />
            </label>
            <div className="flex-1" />
            <select
              className="select select-bordered w-fit min-w-[120px]"
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
            >
              <option value="public">
                <Globe className="inline w-4 h-4 mr-1" /> Public
              </option>
              <option value="friends">
                <Users className="inline w-4 h-4 mr-1" /> Friends
              </option>
              <option value="private">
                <Lock className="inline w-4 h-4 mr-1" /> Only me
              </option>
            </select>
          </div>
          {preview && (
            <div className="relative w-full flex justify-center">
              <img
                src={preview}
                alt="preview"
                className="rounded-lg max-h-36 object-contain border border-base-300 shadow"
              />
              <button
                type="button"
                className="absolute top-2 right-2 bg-base-100/80 rounded-full p-1 shadow hover:bg-base-200"
                onClick={() => {
                  setImage(null);
                  setPreview(null);
                }}
                aria-label="Remove image"
              >
                <X size={18} />
              </button>
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <button
            className="btn btn-primary w-full text-lg font-semibold py-2 mt-2 shadow-md hover:scale-[1.03] transition-transform duration-150"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="loading loading-spinner loading-xs"></span>{" "}
                Posting...
              </span>
            ) : (
              "Post"
            )}
          </button>
        </form>
        {/* Modal chọn cảm xúc */}
        {showFeelingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-base-100 rounded-xl shadow-xl p-6 w-full max-w-xs mx-auto flex flex-col items-center">
              <button
                className="self-start mb-2 btn btn-ghost btn-xs"
                onClick={() => setShowFeelingModal(false)}
              >
                <X size={18} /> Back
              </button>
              <h3 className="font-semibold text-lg mb-4">
                How are you feeling?
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {FEELINGS.map((f) => (
                  <button
                    key={f.label}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-base-200 transition ${
                      feeling && feeling.label === f.label
                        ? "bg-primary/10"
                        : ""
                    }`}
                    onClick={() => {
                      setFeeling(f);
                      setShowFeelingModal(false);
                    }}
                  >
                    <span className="text-2xl">{f.icon}</span>
                    <span className="text-xs font-medium">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Modal chọn background */}
        {showBgModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-base-100 rounded-xl shadow-xl p-6 w-full max-w-xs mx-auto flex flex-col items-center">
              <button
                className="self-start mb-2 btn btn-ghost btn-xs"
                onClick={() => setShowBgModal(false)}
              >
                <X size={18} /> Back
              </button>
              <h3 className="font-semibold text-lg mb-4">
                Choose a background
              </h3>
              <div className="grid grid-cols-2 gap-3 w-full">
                {BACKGROUNDS.map((b, i) => (
                  <button
                    key={i}
                    className={`h-12 rounded-lg w-full border-2 transition-all duration-150 ${
                      bg === b
                        ? "border-primary scale-105"
                        : "border-transparent"
                    } ${b}`}
                    onClick={() => {
                      setBg(b);
                      setShowBgModal(false);
                    }}
                  />
                ))}
              </div>
              {bg && (
                <button
                  className="mt-4 btn btn-outline btn-sm"
                  onClick={() => setBg("")}
                >
                  Remove background
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CreatePostModal;

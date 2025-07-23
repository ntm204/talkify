import { useEffect, useState } from "react";
import PostGrid from "../components/PostGrid";
import CreatePostModal from "../components/CreatePostModal";
import { useRef } from "react";
import socket from "../lib/socket";
import { useLocation, useNavigate } from "react-router-dom";
import PostModal from "../components/PostModal";

const FeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loader = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [modalPostId, setModalPostId] = useState(null);

  // Lắng nghe socket event newPost
  useEffect(() => {
    socket.connect();
    const handleNewPost = (post) => {
      // Nếu post đã có trong feed thì bỏ qua
      setPosts((prev) =>
        prev.some((p) => p._id === post._id) ? prev : [post, ...prev]
      );
    };
    socket.on("newPost", handleNewPost);
    return () => {
      socket.off("newPost", handleNewPost);
      socket.disconnect();
    };
  }, []);

  // Hỗ trợ mở PostModal theo postId từ query param (dùng cho notification)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const postId = params.get("postId");
    if (postId) setModalPostId(postId);
  }, [location.search]);

  // Đóng modal thì xoá postId khỏi url
  const handleCloseModal = () => {
    setModalPostId(null);
    const params = new URLSearchParams(location.search);
    params.delete("postId");
    navigate({ search: params.toString() }, { replace: true });
  };

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/posts?page=${page}&limit=12`, {
          credentials: "include",
        });
        const data = await res.json();
        if (page === 1) {
          setPosts(data.posts || []);
        } else {
          setPosts((prev) => [...prev, ...(data.posts || [])]);
        }
        setHasMore(data.posts && data.posts.length === 12);
      } catch (err) {
        if (page === 1) setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
    // eslint-disable-next-line
  }, [page]);

  useEffect(() => {
    if (!hasMore || loading) return;
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 300 &&
        !loading &&
        hasMore
      ) {
        setPage((prev) => prev + 1);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading]);

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) =>
      updatedPost.privacy === "private"
        ? prev.filter((p) => p._id !== updatedPost._id)
        : prev.map((p) =>
            p._id === updatedPost._id ? { ...p, ...updatedPost } : p
          )
    );
  };
  const handlePostDeleted = (deletedId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedId));
  };

  return (
    <div className="h-screen pt-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Feed</h1>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            + Create post
          </button>
        </div>
        {loading && page === 1 ? (
          <div className="text-center py-10">Loading posts...</div>
        ) : (
          <PostGrid
            posts={posts}
            onPostUpdated={handlePostUpdated}
            onPostDeleted={handlePostDeleted}
          />
        )}
        {loading && page > 1 && (
          <div className="text-center py-6 text-zinc-400">Loading more...</div>
        )}
        {showCreate && (
          <CreatePostModal
            onClose={() => setShowCreate(false)}
            onPostCreated={(p) => {
              if (p.privacy === "public" || p.privacy === "friends") {
                setPosts([p, ...posts]);
              }
            }}
          />
        )}
        {modalPostId && (
          <PostModal postId={modalPostId} onClose={handleCloseModal} />
        )}
      </div>
    </div>
  );
};
export default FeedPage;

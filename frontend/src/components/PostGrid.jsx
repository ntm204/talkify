import PostCard from "./PostCard";

const PostGrid = ({ posts, onPostUpdated, onPostDeleted, renderModal }) => {
  if (!posts?.length)
    return (
      <div className="text-center text-zinc-400">Chưa có bài viết nào.</div>
    );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          onPostUpdated={onPostUpdated}
          onPostDeleted={onPostDeleted}
        />
      ))}
    </div>
  );
};
export default PostGrid;

import { useState } from 'react';
import PostDetailModal from './PostDetailModal';

export default function PostGrid({ posts }) {
  const [selected, setSelected] = useState(null);

  if (!posts?.length) {
    return (
      <div className="text-center py-10 text-gray-400">
        <div className="text-4xl mb-2">📸</div>
        <p className="text-sm">No posts yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post) => {
          const firstMedia = post.media?.[0];
          return (
            <button
              key={post.id}
              onClick={() => setSelected(post)}
              className="aspect-square bg-gray-100 relative overflow-hidden"
            >
              {firstMedia ? (
                firstMedia.type === 'VIDEO' ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <span className="text-white text-2xl">▶</span>
                  </div>
                ) : (
                  <img
                    src={firstMedia.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-faith-50 p-2">
                  <p className="text-xs text-faith-700 text-center line-clamp-4">{post.content}</p>
                </div>
              )}
              {post.media?.length > 1 && (
                <span className="absolute top-1 right-1 text-white text-xs bg-black/50 rounded px-1">
                  +{post.media.length - 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <PostDetailModal post={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

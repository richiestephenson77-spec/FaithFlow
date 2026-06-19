import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import PostDetailModal from './PostDetailModal';
import PostOptionsSheet from './PostOptionsSheet';

export default function PostGrid({ posts: initialPosts, currentUserId, onPostsChanged }) {
  const [posts, setPosts] = useState(initialPosts ?? []);
  const [selected, setSelected] = useState(null);
  const [optionsPost, setOptionsPost] = useState(null);

  // Keep in sync if parent re-fetches
  if (initialPosts !== undefined && initialPosts !== posts && !optionsPost && !selected) {
    setPosts(initialPosts);
  }

  function notifyChange(updated) {
    onPostsChanged?.(updated);
    setPosts(updated);
  }

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
          const isOwn = currentUserId && (post.userId === currentUserId || post.user?.id === currentUserId);
          return (
            <div key={post.id} className="aspect-square bg-gray-100 relative overflow-hidden">
              <button
                className="w-full h-full"
                onClick={() => setSelected(post)}
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
              </button>

              {post.media?.length > 1 && (
                <span className="absolute top-1 right-1 text-white text-xs bg-black/50 rounded px-1 pointer-events-none">
                  +{post.media.length - 1}
                </span>
              )}

              {isOwn && (
                <button
                  onClick={e => { e.stopPropagation(); setOptionsPost(post); }}
                  className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.45)' }}
                >
                  <MoreHorizontal size={14} color="white" strokeWidth={2} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <PostDetailModal post={selected} onClose={() => setSelected(null)} />
      )}

      {optionsPost && (
        <PostOptionsSheet
          post={optionsPost}
          onClose={() => setOptionsPost(null)}
          onUpdated={updated => {
            const next = posts.map(p => p.id === updated.id ? updated : p);
            notifyChange(next);
          }}
          onArchived={id => {
            const next = posts.filter(p => p.id !== id);
            notifyChange(next);
          }}
          onDeleted={id => {
            const next = posts.filter(p => p.id !== id);
            notifyChange(next);
          }}
        />
      )}
    </>
  );
}

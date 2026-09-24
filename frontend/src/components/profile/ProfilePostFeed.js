import { useState } from 'react';
import { MoreHorizontal, Heart, MessageCircle } from 'lucide-react';
import PostDetailModal from '../PostDetailModal';
import PostOptionsSheet from '../PostOptionsSheet';
import { INK, MUTED, HAIRLINE, ACCENT } from './ProfileHeader';

// A readable single-column feed, replacing the 3-up square grid.
//
// The grid forced every post into an aspect-square thumbnail, which crops
// photos and — worse — renders a text-only post as a tiny square of clipped
// words. Here text is body copy at a readable size, and media keeps a useful
// shape with a bounded height instead of being cut to a square.
//
// Identity is NOT repeated per post: every post on this page belongs to the
// person in the header above, so an avatar and name on each row would just be
// the same face over and over. Timestamps stay.
//
// Existing components are reused rather than reimplemented: PostDetailModal
// for full viewing and PostOptionsSheet for edit / archive / delete, so all
// the actions the app already supports keep working.

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function PostMedia({ media, onOpen }) {
  if (!media?.length) return null;
  const single = media.length === 1;

  return (
    <div
      className={single ? '' : 'grid grid-cols-2 gap-0.5'}
      style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: `1px solid ${HAIRLINE}` }}
    >
      {media.slice(0, 4).map((m, i) => (
        <button
          key={m.id || i}
          onClick={onOpen}
          className="block w-full"
          style={{ background: '#F5F5F5', border: 0, padding: 0, position: 'relative' }}
        >
          {m.type === 'VIDEO' ? (
            <video
              src={m.url}
              controls
              // Bounded, not cropped: tall images are capped in height and
              // letterboxed rather than squared off.
              style={{ width: '100%', maxHeight: single ? 420 : 180, objectFit: 'contain', display: 'block', background: '#000' }}
            />
          ) : (
            <img
              src={m.url}
              alt={m.altText || ''}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                maxHeight: single ? 420 : 180,
                objectFit: single ? 'contain' : 'cover',
                display: 'block',
              }}
            />
          )}
          {i === 3 && media.length > 4 && (
            <span
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 18, fontWeight: 600 }}
            >
              +{media.length - 4}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * @param {Array} posts
 * @param {boolean} isOwner
 * @param {(posts:Array)=>void} onPostsChanged
 * @param {()=>void} onCreate  own-profile empty-state action
 */
export default function ProfilePostFeed({ posts, isOwner, onPostsChanged, onCreate }) {
  const [selected, setSelected] = useState(null);
  const [optionsPost, setOptionsPost] = useState(null);

  if (!posts?.length) {
    return (
      <div className="text-center" style={{ padding: '48px 28px' }}>
        <p className="type-heading" style={{ fontSize: 17 }}>
          {isOwner ? 'Nothing shared yet' : 'No posts to show'}
        </p>
        <p className="type-subtitle" style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.5 }}>
          {isOwner
            ? 'Share an update, a testimony or a verse when you’re ready.'
            : 'This believer hasn’t shared anything publicly.'}
        </p>
        {isOwner && onCreate && (
          <button
            onClick={onCreate}
            style={{ marginTop: 20, minHeight: 44, padding: '11px 18px', borderRadius: 10, border: 0, background: ACCENT, color: '#fff', fontSize: 14, fontWeight: 500 }}
          >
            Share something
          </button>
        )}
      </div>
    );
  }

  const replace = (next) => onPostsChanged?.(next);

  return (
    <>
      <div>
        {posts.map(post => (
          <article
            key={post.id}
            style={{ padding: '16px 20px', borderBottom: `1px solid ${HAIRLINE}` }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {post.bibleVerse && (
                  <p style={{ fontSize: 12, fontWeight: 600, color: ACCENT, marginBottom: 4 }}>{post.bibleVerse}</p>
                )}
                {post.content && (
                  <p
                    style={{
                      fontSize: 15.5, lineHeight: 1.55, color: INK,
                      whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                    }}
                  >
                    {post.content}
                  </p>
                )}
              </div>
              {isOwner && (
                <button
                  onClick={() => setOptionsPost(post)}
                  aria-label="Post options"
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 36, height: 36, marginTop: -6, marginRight: -8, background: 'none', border: 0 }}
                >
                  <MoreHorizontal size={18} strokeWidth={1.8} color={MUTED} />
                </button>
              )}
            </div>

            <PostMedia media={post.media} onOpen={() => setSelected(post)} />

            <div className="flex items-center gap-4" style={{ marginTop: 10 }}>
              <span style={{ fontSize: 12, color: MUTED }}>{timeAgo(post.createdAt)}</span>
              {post.isArchived && (
                // Only the author ever sees an archived post here, so the
                // label tells them why it is visible to them and nobody else.
                <span style={{ fontSize: 11, color: MUTED, border: `1px solid ${HAIRLINE}`, borderRadius: 999, padding: '2px 8px' }}>
                  Archived · only you
                </span>
              )}
              <span className="flex items-center gap-1" style={{ fontSize: 12, color: MUTED }}>
                <Heart size={13} strokeWidth={1.8} /> {post._count?.likes ?? 0}
              </span>
              <span className="flex items-center gap-1" style={{ fontSize: 12, color: MUTED }}>
                <MessageCircle size={13} strokeWidth={1.8} /> {post._count?.comments ?? 0}
              </span>
            </div>
          </article>
        ))}
      </div>

      {selected && <PostDetailModal post={selected} onClose={() => setSelected(null)} />}

      {optionsPost && (
        <PostOptionsSheet
          post={optionsPost}
          onClose={() => setOptionsPost(null)}
          onUpdated={updated => replace(posts.map(p => (p.id === updated.id ? updated : p)))}
          onArchived={id => replace(posts.map(p => (p.id === id ? { ...p, isArchived: true } : p)))}
          onDeleted={id => replace(posts.filter(p => p.id !== id))}
        />
      )}
    </>
  );
}

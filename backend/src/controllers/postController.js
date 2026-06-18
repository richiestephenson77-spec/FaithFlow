const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const POST_INCLUDE = (userId) => ({
  user: { select: { id: true, name: true, profilePhoto: true } },
  media: { orderBy: { order: 'asc' } },
  _count: { select: { likes: true, comments: true } },
  likes: userId ? { where: { userId }, select: { id: true } } : false,
  comments: {
    orderBy: { createdAt: 'asc' },
    take: 3,
    include: { user: { select: { id: true, name: true, profilePhoto: true } } },
  },
});

function formatPost(post, userId) {
  return {
    ...post,
    likedByMe: userId ? post.likes?.length > 0 : false,
    likes: undefined,
  };
}

async function getFeed(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const userId = req.user?.id;

  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: POST_INCLUDE(userId),
    });
    res.json(posts.map((p) => formatPost(p, userId)));
  } catch {
    res.status(500).json({ error: 'Failed to get posts' });
  }
}

async function getUserPosts(req, res) {
  const { userId } = req.params;
  const me = req.user?.id;
  try {
    const posts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: POST_INCLUDE(me),
    });
    res.json(posts.map((p) => formatPost(p, me)));
  } catch {
    res.status(500).json({ error: 'Failed to get user posts' });
  }
}

async function createPost(req, res) {
  const { content, type, bibleVerse } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  const files = req.files || [];

  try {
    const post = await prisma.post.create({
      data: {
        userId: req.user.id,
        content,
        type: type || 'UPDATE',
        bibleVerse: bibleVerse || null,
        media: files.length
          ? {
              create: files.map((f, i) => ({
                url: `/uploads/${f.filename}`,
                type: f.mimetype.startsWith('video') ? 'VIDEO' : 'IMAGE',
                order: i,
              })),
            }
          : undefined,
      },
      include: POST_INCLUDE(req.user.id),
    });
    res.status(201).json(formatPost(post, req.user.id));
  } catch {
    res.status(500).json({ error: 'Failed to create post' });
  }
}

async function likePost(req, res) {
  const { id } = req.params;
  try {
    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId: req.user.id, postId: id } },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { userId_postId: { userId: req.user.id, postId: id } } });
      return res.json({ liked: false });
    }

    await prisma.postLike.create({ data: { userId: req.user.id, postId: id } });
    res.json({ liked: true });
  } catch {
    res.status(500).json({ error: 'Failed to like post' });
  }
}

async function addComment(req, res) {
  const { id } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content required' });

  try {
    const comment = await prisma.comment.create({
      data: { userId: req.user.id, postId: id, content },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });
    res.status(201).json(comment);
  } catch {
    res.status(500).json({ error: 'Failed to add comment' });
  }
}

async function getComments(req, res) {
  const { id } = req.params;
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });
    res.json(comments);
  } catch {
    res.status(500).json({ error: 'Failed to get comments' });
  }
}

async function deletePost(req, res) {
  const { id } = req.params;
  try {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.userId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    await prisma.post.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete post' });
  }
}

module.exports = { getFeed, getUserPosts, createPost, likePost, addComment, getComments, deletePost };

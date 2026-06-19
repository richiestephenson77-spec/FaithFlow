
const prisma = require('../db');

async function create(req, res) {
  const { name, description, location, website } = req.body;
  if (!name) return res.status(400).json({ error: 'Church name required' });

  const logo = req.files?.logo?.[0] ? `/uploads/${req.files.logo[0].filename}` : undefined;
  const coverPhoto = req.files?.coverPhoto?.[0] ? `/uploads/${req.files.coverPhoto[0].filename}` : undefined;

  try {
    const church = await prisma.church.create({
      data: { name, description, location, website, logo, coverPhoto, adminId: req.user.id },
    });
    res.status(201).json(church);
  } catch {
    res.status(500).json({ error: 'Failed to create church' });
  }
}

async function getById(req, res) {
  const { id } = req.params;
  try {
    const church = await prisma.church.findUnique({
      where: { id },
      include: {
        _count: { select: { followers: true, posts: true } },
        posts: { orderBy: { createdAt: 'desc' }, take: 20 },
        followers: req.user
          ? { where: { userId: req.user.id }, select: { id: true } }
          : false,
      },
    });
    if (!church) return res.status(404).json({ error: 'Church not found' });

    res.json({
      ...church,
      isFollowing: req.user ? church.followers.length > 0 : false,
      followers: undefined,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get church' });
  }
}

async function search(req, res) {
  const { q, location } = req.query;
  try {
    const churches = await prisma.church.findMany({
      where: {
        AND: [
          q ? { name: { contains: q, mode: 'insensitive' } } : {},
          location ? { location: { contains: location, mode: 'insensitive' } } : {},
        ],
      },
      include: { _count: { select: { followers: true } } },
      orderBy: { followers: { _count: 'desc' } },
      take: 30,
    });
    res.json(churches);
  } catch {
    res.status(500).json({ error: 'Failed to search churches' });
  }
}

async function follow(req, res) {
  const { id } = req.params;
  try {
    const existing = await prisma.churchFollow.findUnique({
      where: { userId_churchId: { userId: req.user.id, churchId: id } },
    });

    if (existing) {
      await prisma.churchFollow.delete({
        where: { userId_churchId: { userId: req.user.id, churchId: id } },
      });
      return res.json({ following: false });
    }

    await prisma.churchFollow.create({ data: { userId: req.user.id, churchId: id } });
    res.json({ following: true });
  } catch {
    res.status(500).json({ error: 'Failed to follow church' });
  }
}

async function createPost(req, res) {
  const { id } = req.params;
  const { title, content, type, eventDate } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const church = await prisma.church.findUnique({ where: { id } });
    if (!church || church.adminId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    const post = await prisma.churchPost.create({
      data: {
        churchId: id,
        title,
        content,
        type: type || 'UPDATE',
        imageUrl,
        eventDate: eventDate ? new Date(eventDate) : undefined,
      },
      include: { church: { select: { id: true, name: true, logo: true } } },
    });

    res.status(201).json(post);
  } catch {
    res.status(500).json({ error: 'Failed to create post' });
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { name, description, location, website } = req.body;

  try {
    const church = await prisma.church.findUnique({ where: { id } });
    if (!church || church.adminId !== req.user.id)
      return res.status(403).json({ error: 'Not authorized' });

    const logo = req.files?.logo?.[0] ? `/uploads/${req.files.logo[0].filename}` : undefined;
    const coverPhoto = req.files?.coverPhoto?.[0] ? `/uploads/${req.files.coverPhoto[0].filename}` : undefined;

    const data = { name, description, location, website };
    if (logo) data.logo = logo;
    if (coverPhoto) data.coverPhoto = coverPhoto;

    const updated = await prisma.church.update({ where: { id }, data });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update church' });
  }
}

async function getMyChurch(req, res) {
  try {
    const church = await prisma.church.findFirst({
      where: { adminId: req.user.id },
      include: { _count: { select: { followers: true, posts: true } } },
    });
    res.json(church);
  } catch {
    res.status(500).json({ error: 'Failed to get church' });
  }
}

module.exports = { create, getById, search, follow, createPost, update, getMyChurch };

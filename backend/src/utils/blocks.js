const prisma = require('../db');

// Returns the set of user ids that `userId` must not see or reach: everyone
// they've blocked PLUS everyone who has blocked them. Blocking is symmetric for
// visibility — neither side sees the other. Used across feeds, messages,
// profiles, search, comments, receipts and prayer cells so the rule lives in
// exactly one place.
async function getBlockedUserIds(userId) {
  if (!userId) return [];
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set();
  for (const r of rows) {
    ids.add(r.blockerId === userId ? r.blockedId : r.blockerId);
  }
  ids.delete(userId);
  return [...ids];
}

// True if there is a block in EITHER direction between two users.
async function isBlockedBetween(a, b) {
  if (!a || !b || a === b) return false;
  const row = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return !!row;
}

module.exports = { getBlockedUserIds, isBlockedBetween };

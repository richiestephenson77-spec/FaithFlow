// One-off: wipe ALL prayer cells and their related rows.
//
// Context: the Prayer Cells rework migrated in ~8 old test cells with no real
// name (default "Prayer Cell"). The user confirmed every current cell is
// disposable test data, so this starts the directory fresh.
//
// Deletes children before parents to respect foreign keys (the schema also
// cascades, but we delete explicitly so we can report per-table counts).
// Touches ONLY the five prayer-cell tables — nothing else.
//
// Run against the production DB with:  railway run node scripts/wipe-prayer-cells.js

const prisma = require('../src/db');

async function main() {
  const before = await prisma.prayerCell.count();
  console.log(`Prayer cells before wipe: ${before}`);
  if (before === 0) {
    console.log('Nothing to delete. Directory is already clean.');
    return;
  }

  // Peek at what we're removing (names help confirm these are the test cells).
  const sample = await prisma.prayerCell.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log('Cells to delete:');
  for (const c of sample) console.log(`  - "${c.name}"  (${c.id})`);

  // Children first, then parents. Empty filter = every row in each table; these
  // five tables hold ONLY prayer-cell data, so this is a clean, scoped wipe.
  const [participants, sessions, requests, members, cells] = await prisma.$transaction([
    prisma.prayerCellSessionParticipant.deleteMany({}),
    prisma.prayerCellSession.deleteMany({}),
    prisma.prayerCellJoinRequest.deleteMany({}),
    prisma.prayerCellMember.deleteMany({}),
    prisma.prayerCell.deleteMany({}),
  ]);

  console.log('\nDeleted:');
  console.log(`  session participants : ${participants.count}`);
  console.log(`  sessions             : ${sessions.count}`);
  console.log(`  join requests        : ${requests.count}`);
  console.log(`  members              : ${members.count}`);
  console.log(`  prayer cells         : ${cells.count}`);

  const after = await prisma.prayerCell.count();
  console.log(`\nPrayer cells remaining: ${after}`);
}

main()
  .catch((err) => { console.error('Wipe failed:', err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      name: 'Alice Thompson',
      email: 'alice@example.com',
      password,
      bio: 'Walking by faith, not by sight. 2 Cor 5:7',
      churchName: 'Grace Community Church',
      location: 'Nashville, TN',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      name: 'Bob Martinez',
      email: 'bob@example.com',
      password,
      bio: 'Servant of Christ. Husband. Father.',
      churchName: 'Redeemer Baptist',
      location: 'Austin, TX',
    },
  });

  await prisma.prayerRequest.createMany({
    skipDuplicates: true,
    data: [
      {
        userId: alice.id,
        title: 'Healing for my mother',
        body: 'My mother was recently diagnosed with cancer. Please pray for miraculous healing and peace for our family during this difficult time.',
      },
      {
        userId: bob.id,
        title: 'Job opportunity',
        body: 'I have been searching for work for 3 months. There is a promising interview next week — please pray for God\'s will to be done and that I represent Him well.',
      },
      {
        userId: alice.id,
        title: 'Marriage restoration',
        body: 'Please pray for my friends who are going through a rough patch in their marriage. Pray that God would heal and restore what the enemy has tried to destroy.',
      },
    ],
  });

  console.log('Seed complete! Demo users: alice@example.com / bob@example.com (password: password123)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

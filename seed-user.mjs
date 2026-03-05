import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: 'test@tradeos.in' },
  });

  if (existing) {
    console.log('User already exists:', existing.email);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: 'Test Trader',
      email: 'test@tradeos.in',
      hashedPassword: '$2a$10$/llPJJampGAI3ENl004l7eK3DpzyaVBprTUfxUhQ1mclsQoJW29w2',
      emailVerified: new Date(),
      tier: 'PRO',
      onboardingCompleted: true,
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      riskProfile: 'MODERATE',
      tradingPlatform: 'AMIBROKER',
      marketFocus: 'NSE_EQUITY',
    },
  });

  console.log('Test user created successfully!');
  console.log('Email   :', user.email);
  console.log('Password: Test@1234');
  console.log('Name    :', user.name);
  console.log('Tier    :', user.tier);
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({ where: { email: 'ahmad@tadween.com' } });
console.log(JSON.stringify(user, null, 2));
await prisma.$disconnect();

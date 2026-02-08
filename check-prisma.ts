
import { prisma } from './lib/db';

async function main() {
    console.log('Available models on prisma:');
    console.log(Object.keys(prisma).filter(key => !key.startsWith('_')));
}

main().catch(console.error);

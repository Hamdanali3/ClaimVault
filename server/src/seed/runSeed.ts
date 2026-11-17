import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { ensureDemoWorkspaceSeeded } from './demoSeeder.js';

async function main(): Promise<void> {
  await connectDatabase();
  const result = await ensureDemoWorkspaceSeeded(true);
  console.log('Seed completed:', result);
  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

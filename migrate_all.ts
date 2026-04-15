import { knex } from 'knex';
import type { Knex } from 'knex';

const commonConfig: Knex.Config = {
  client: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'antiverse',
    user: 'antiverse_user',
    password: 'password',
  },
};

async function run() {
  const services = ['auth-service', 'colony-service', 'log-service', 'media-service'];
  for (const s of services) {
    console.log(`Migrating ${s}...`);
    const db = knex({
      ...commonConfig,
      migrations: { 
          directory: `./services/${s}/migrations`, 
          extension: 'ts',
          tableName: `${s.replace('-', '_')}_migrations`
      },
    });
    
    await db.migrate.latest();
    console.log(`Migrated ${s}!`);
    
    const seedDir = `./services/${s}/seeds`;
    try {
      await db.seed.run({ directory: seedDir, extension: 'ts' });
      console.log(`Seeded ${s}!`);
    } catch (e: any) {
      if (!e.message.includes('ENOENT')) {
          console.log(`Seeded ${s}!`);
      }
    }
    await db.destroy();
  }
}

run().then(() => console.log('All done!')).catch(console.error);

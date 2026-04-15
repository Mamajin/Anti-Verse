import { Knex } from 'knex';
import bcrypt from 'bcrypt';
import { Tables, Constraints } from '@antiverse/database';

export async function seed(knex: Knex): Promise<void> {
  const hash = await bcrypt.hash('admin123456', Constraints.BCRYPT_SALT_ROUNDS);

  await knex(Tables.AUTH_USERS)
    .insert({
      email: 'admin@antiverse.local',
      password_hash: hash,
      display_name: 'System Admin',
      role: 'admin',
    })
    .onConflict('email')
    .ignore();

  console.log('✅ Auth seed complete: admin@antiverse.local / admin123456');
}

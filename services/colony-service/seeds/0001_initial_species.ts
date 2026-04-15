import { Knex } from 'knex';
import { Tables } from '@antiverse/database';

export async function seed(knex: Knex): Promise<void> {
  const species = [
    {
      scientific_name: 'Camponotus pennsylvanicus',
      common_name: 'Eastern Carpenter Ant',
      subfamily: 'Formicinae',
      description: 'A large, black carpenter ant commonly found in eastern North America.',
      native_region: 'North America',
    },
    {
      scientific_name: 'Lasius niger',
      common_name: 'Black Garden Ant',
      subfamily: 'Formicinae',
      description: 'A very common, adaptable ant species found across Europe and parts of North America.',
      native_region: 'Europe',
    },
    {
      scientific_name: 'Tetramorium immigrans',
      common_name: 'Pavement Ant',
      subfamily: 'Myrmicinae',
      description: 'Small brown ants known for fighting huge territorial battles on sidewalks.',
      native_region: 'Europe (Introduced globally)',
    }
  ];

  for (const s of species) {
    await knex(Tables.COLONY_SPECIES)
      .insert(s)
      .onConflict('scientific_name')
      .ignore();
  }

  console.log('✅ Colony seed complete: Initial species catalog added');
}

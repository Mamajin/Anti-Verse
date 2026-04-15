import pg from 'pg';

const URLS = {
  auth: 'http://localhost:3001',
  colony: 'http://localhost:3002',
  log: 'http://localhost:3003'
};

const USERS = [
  { email: 'main.researcher@antiverse.com', password: 'Password123!', displayName: 'Dr. Elena Vance', role: 'researcher' },
  { email: 'lab.assistant@antiverse.com', password: 'Password123!', displayName: 'Assistant Barney', role: 'keeper' },
  { email: 'guest.viewer@antiverse.com', password: 'Password123!', displayName: 'Observer G-Man', role: 'researcher' }
];

const SPECIES_SEED = [
  { id: '11111111-1111-1111-1111-111111111111', scientific_name: 'Camponotus pennsylvanicus', common_name: 'Eastern Carpenter Ant', subfamily: 'Formicinae' },
  { id: '22222222-2222-2222-2222-222222222222', scientific_name: 'Lasius niger', common_name: 'Black Garden Ant', subfamily: 'Formicinae' },
  { id: '33333333-3333-3333-3333-333333333333', scientific_name: 'Tetramorium immigrans', common_name: 'Pavement Ant', subfamily: 'Myrmicinae' },
  { id: '44444444-4444-4444-4444-444444444444', scientific_name: 'Pogonomyrmex barbatus', common_name: 'Red Harvester Ant', subfamily: 'Myrmicinae' },
  { id: '55555555-5555-5555-5555-555555555555', scientific_name: 'Atta cephalotes', common_name: 'Leafcutter Ant', subfamily: 'Myrmicinae' }
];

const OBSERVATIONS = [
  "Queen is active and tending to the new egg pile.",
  "Major workers observed clearing debris from the main entrance.",
  "New foraging trail established towards the sugar water source.",
  "Minor workers observed transporting pupae to the lower humidity chamber.",
  "Increased activity near the heat cable area.",
  "First generation of workers starting to eclose.",
  "Colony defensive posture noted during habitat vibration test.",
  "Workers observed cleaning the founding queen.",
  "Tunneling progress has reached the side wall of the formicarium.",
  "Foraging activity peak reached around 22:00 local time."
];

const FEEDING_NOTES = [
  "Supplied 0.5ml 20% sucrose solution. Accepted immediately.",
  "Introducted 3 fruit flies (D. melanogaster). Workers efficiently retrieved them.",
  "Supplied small piece of cooked chicken protein. High interest from majors.",
  "Refilled main water reservoir.",
  "Cleaned out old midden pile from the outworld."
];

const SAMPLE_MEDIA = [
  { filename: 'nest_overview.jpg', contentType: 'image/jpeg', caption: 'Overview of the primary brood chamber.' },
  { filename: 'queen_close_up.jpg', contentType: 'image/jpeg', caption: 'High magnification shot of the queen.' },
  { filename: 'foraging_trail.jpg', contentType: 'image/jpeg', caption: 'Active foraging trail near the sugar feeder.' },
  { filename: 'new_larvae.jpg', contentType: 'image/jpeg', caption: 'Close up of the newly hatched larvae.' }
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function seedSpecies() {
  const client = new pg.Client('postgresql://antiverse_user:password@localhost:5432/antiverse');
  await client.connect();
  console.log("-> Seeding species catalog...");
  for (const s of SPECIES_SEED) {
    await client.query(`
      INSERT INTO colony_species (id, scientific_name, common_name, subfamily)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (scientific_name) DO NOTHING
    `, [s.id, s.scientific_name, s.common_name, s.subfamily]);
  }
  await client.end();
}

async function registerAndLogin(user) {
  try {
    await fetch(`${URLS.auth}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
  } catch (e) {}

  const loginRes = await fetch(`${URLS.auth}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password })
  });
  
  const payload = await loginRes.json();
  if (!loginRes.ok) throw new Error(`Login failed for ${user.email}: ${JSON.stringify(payload)}`);
  return { token: payload.data.accessToken, id: payload.data.user.id };
}

async function start() {
  console.log("=> Initializing Deep Seeder Pipeline...");

  await seedSpecies();

  const userContexts = {};
  for (const u of USERS) {
    console.log(`-> Preparing user: ${u.email}`);
    userContexts[u.email] = await registerAndLogin(u);
    await sleep(200);
  }

  // Get ACTUAL species IDs from API
  console.log("-> Fetching actual species IDs...");
  const specRes = await fetch(`${URLS.colony}/api/colonies/species`, {
      headers: { 'Authorization': `Bearer ${userContexts[USERS[0].email].token}` }
  });
  const specPayload = await specRes.json();
  const speciesList = specPayload.data;
  const scientificToId = {};
  speciesList.forEach(s => scientificToId[s.scientificName] = s.id);

  // Define some colonies
  const COLONIES_DEF = [
    { owner: 'main.researcher@antiverse.com', name: 'Vance Lab: Alpha Nest', sn: 'Camponotus pennsylvanicus', queenCount: 1, estimatedWorkerCount: 45 },
    { owner: 'main.researcher@antiverse.com', name: 'Vance Lab: Experimental B', sn: 'Lasius niger', queenCount: 1, estimatedWorkerCount: 120 },
    { owner: 'lab.assistant@antiverse.com', name: 'Sector 7: Harvester Study', sn: 'Pogonomyrmex barbatus', queenCount: 1, estimatedWorkerCount: 15 },
    { owner: 'lab.assistant@antiverse.com', name: 'Sector 7: Pavement Colony', sn: 'Tetramorium immigrans', queenCount: 3, estimatedWorkerCount: 800 },
    { owner: 'main.researcher@antiverse.com', name: 'Vance Lab: Leafcutter Trial', sn: 'Atta cephalotes', queenCount: 1, estimatedWorkerCount: 2500 }
  ];

  const createdColonies = [];
  for (const c of COLONIES_DEF) {
    const context = userContexts[c.owner];
    const specId = scientificToId[c.sn];
    if (!specId) continue;

    console.log(`-> Creating colony: ${c.name} for ${c.owner}`);
    const res = await fetch(`${URLS.colony}/api/colonies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${context.token}` },
      body: JSON.stringify({
        name: c.name,
        speciesId: specId,
        queenCount: c.queenCount,
        estimatedWorkerCount: c.estimatedWorkerCount,
        description: `This is ${c.name}, part of the ongoing ant behavior research.`
      })
    });
    const payload = await res.json();
    if (res.ok) {
        createdColonies.push({ id: payload.data.id, owner: c.owner, name: c.name });
    }
  }

  // Cross-pollinate members
  if (createdColonies.length >= 2) {
    console.log("-> Adding collaborators...");
    const alphaCols = createdColonies.filter(c => c.name === 'Vance Lab: Alpha Nest');
    if (alphaCols.length > 0) {
      const alpha = alphaCols[0];
      const assistant = userContexts['lab.assistant@antiverse.com'];
      await fetch(`${URLS.colony}/api/colonies/${alpha.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userContexts[alpha.owner].token}` },
        body: JSON.stringify({ userId: assistant.id, accessRole: 'collaborator' })
      });
    }
  }

  // Populate logs over 60 days
  console.log("-> Generating logs...");
  const logIdsByColony = {};
  for (const c of createdColonies) {
    const context = userContexts[c.owner];
    logIdsByColony[c.id] = [];
    const logBatch = [];
    for (let i = 0; i < 30; i++) {
        const daysAgo = 60 - i * 2;
        const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const isFeeding = Math.random() > 0.7;
        
        const payload = {
            entryType: isFeeding ? 'feeding' : 'observation',
            title: isFeeding ? 'Maintenance Check' : 'Daily Observation',
            content: isFeeding ? FEEDING_NOTES[Math.floor(Math.random() * FEEDING_NOTES.length)] : OBSERVATIONS[Math.floor(Math.random() * OBSERVATIONS.length)],
            occurredAt: date.toISOString(),
            environmentalReading: {
                temperature: 20 + Math.random() * 8,
                humidity: 40 + Math.random() * 40
            }
        };

        logBatch.push(fetch(`${URLS.log}/api/logs/${c.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${context.token}` },
            body: JSON.stringify(payload)
        }).then(r => r.json()).then(p => { if (p.data) logIdsByColony[c.id].push(p.data.id); }));
    }
    await Promise.all(logBatch);
    console.log(`   + Logs for ${c.name} generated.`);
  }

  // Populate Media via Direct DB
  console.log("-> Seeding mock media gallery...");
  const dbClient = new pg.Client('postgresql://antiverse_user:password@localhost:5432/antiverse');
  await dbClient.connect();
  for (const c of createdColonies) {
     const ownerId = userContexts[c.owner].id;
     for (let i = 0; i < SAMPLE_MEDIA.length; i++) {
        const m = SAMPLE_MEDIA[i];
        const logId = logIdsByColony[c.id][i] || null;
        const fileKey = `${c.id}/${m.filename}`;
        await dbClient.query(`
          INSERT INTO media_files (id, colony_id, user_id, log_entry_id, file_key, filename, content_type, size_bytes, caption, status)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'ready')
          ON CONFLICT (file_key) DO NOTHING
        `, [c.id, ownerId, logId, fileKey, m.filename, m.contentType, 1024 * 500, m.caption]);
     }
  }
  await dbClient.end();

  console.log("\n=> SEEDING COMPLETE <=");
  console.log("User 1: main.researcher@antiverse.com / Password123!");
  console.log("User 2: lab.assistant@antiverse.com   / Password123!");
  console.log("Data seeded for 5 colonies, 150 logs, and 20 media records.");
}

start().catch(console.error);

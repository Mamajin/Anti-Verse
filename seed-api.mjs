import pg from 'pg';

const URLS = {
  auth: 'http://localhost:3001',
  colony: 'http://localhost:3002',
  log: 'http://localhost:3003'
};

// --- Realistic observation templates ---
const observationNotes = [
  'Queen observed laying a steady batch of eggs in the brood chamber. Workers actively tending larvae nearby.',
  'Major workers spotted clearing debris from the main tunnel entrance after overnight condensation.',
  'Foraging trail extending ~15cm towards the sugar water feeder. Recruitment pheromone trail is well-established.',
  'Minor workers observed transporting freshly eclosed pupae to the upper humidity chamber.',
  'Slight territorial skirmish between two minor workers near the food staging area. Resolved within seconds.',
  'Queen relocated herself from the primary nest chamber to the secondary tunnel. Workers followed within the hour.',
  'Brood pile reorganized by nurses — eggs separated from early-instar larvae. Classic sorting behavior.',
  'Dead worker removed from nest interior and deposited in the midden pile. Hygienic behavior confirmed.',
  'New lateral tunnel excavated overnight, approximately 2cm in length. Soil deposit visible at the surface.',
  'Workers observed engaging in trophallaxis near the colony entrance. Food sharing is active.',
  'Aerial alates spotted in the upper formicarium chamber — nuptial flight preparation may be imminent.',
  'Colony response to gentle vibration stimulus: moderate alarm pheromone release, defensive posturing from majors.',
  'Larvae have entered the pre-pupal spinning stage. Cocoon formation expected within 48 hours.',
  'Fungal growth detected in the southwest corner of the outworld. Workers actively avoiding the area.',
  'First generation of nanitic workers from the founding queen have begun foraging independently.',
];

const feedingNotes = [
  'Offered 0.5ml honey-water solution (1:3 ratio). Colony consumed within 2 hours.',
  'Protein feeding: two small crickets introduced. Major workers dismembered prey within 45 minutes.',
  'Sugar water refilled in feeder tube. Previous batch fully depleted over 18 hours.',
  'Offered fruit fly larvae as protein supplement. Workers showed immediate interest and began transporting to brood.',
  'Test feeding with diluted maple syrup — moderate acceptance. Will compare to standard honey-water next session.',
];

const maintenanceNotes = [
  'Replaced cotton water reservoir in test tube setup. Old cotton showed slight discoloration.',
  'Moisture gradient adjusted in the outworld — added 2ml distilled water to the substrate in Zone B.',
  'Cleaned the foraging area glass with distilled water to improve observation clarity.',
  'Replaced the red film on the nest chamber to reduce light stress during observations.',
  'Rebalanced humidity in the main nest by adjusting the water tower wick. Target: 60-70% RH.',
];

const environmentalNotes = [
  'Ambient room temperature fluctuated due to HVAC cycle. Nest interior remained buffered.',
  'Light cycle set to 14L:10D to simulate late spring photoperiod.',
  'Barometric pressure drop detected — colony activity noticeably decreased during the low front.',
  'Installed secondary hygrometer probe in nest chamber for cross-calibration verification.',
  'Night-time temperature dip recorded. Heating cable activated to maintain 24°C floor.',
];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function start() {
  console.log("=> Initializing realistic mock data pipeline...\n");

  // 1. Seed species directly via Postgres
  const client = new pg.Client('postgresql://antiverse_user:password@localhost:5432/antiverse');
  await client.connect();
  const species = [
    { id: '11111111-1111-1111-1111-111111111111', sn: 'Camponotus pennsylvanicus', cn: 'Eastern Carpenter Ant', sf: 'Formicinae', desc: 'Large polymorphic carpenter ant native to eastern North America.', reg: 'Eastern North America' },
    { id: '22222222-2222-2222-2222-222222222222', sn: 'Lasius niger', cn: 'Black Garden Ant', sf: 'Formicinae', desc: 'Extremely common monomorphic garden ant with excellent adaptability.', reg: 'Europe & Asia' },
    { id: '33333333-3333-3333-3333-333333333333', sn: 'Tetramorium immigrans', cn: 'Pavement Ant', sf: 'Myrmicinae', desc: 'Small brown ant known for massive territorial battles on pavement.', reg: 'Europe (Globally Introduced)' },
    { id: '44444444-4444-4444-4444-444444444444', sn: 'Pogonomyrmex barbatus', cn: 'Red Harvester Ant', sf: 'Myrmicinae', desc: 'Seed-collecting desert ant with a potent sting. Important ecological role.', reg: 'Southwestern United States' },
    { id: '55555555-5555-5555-5555-555555555555', sn: 'Atta cephalotes', cn: 'Leafcutter Ant', sf: 'Myrmicinae', desc: 'Fungus-farming ant with extreme caste polymorphism and complex societies.', reg: 'Central & South America' },
  ];
  for (const s of species) {
    await client.query(
      `INSERT INTO colony_species (id, scientific_name, common_name, subfamily, description, native_region) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (scientific_name) DO NOTHING`,
      [s.id, s.sn, s.cn, s.sf, s.desc, s.reg]
    );
  }
  console.log("   [DB] 5 species seeded into colony_species catalog.");
  await client.end();

  // 2. Register a dedicated seed operator + login
  const email = 'seed.operator@antiverse.com';
  const password = 'SeedPassword123!';
  
  // Try register (may fail if already exists, that's fine)
  let regRes = await fetch(`${URLS.auth}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName: 'Dr. Maria Santos' })
  });
  if (!regRes.ok) {
    console.log("   [AUTH] Registration skipped (user may already exist).");
  } else {
    console.log("   [AUTH] Registered operator: " + email);
  }

  // Login
  let loginRes = await fetch(`${URLS.auth}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!loginRes.ok) throw new Error("Login failed: " + await loginRes.text());
  const { data: loginData } = await loginRes.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${loginData.accessToken}` };
  console.log("   [AUTH] Logged in as: " + loginData.user.displayName + "\n");

  // 3. Fetch species from API
  const { data: speciesList } = await (await fetch(`${URLS.colony}/api/colonies/species`, { headers })).json();
  const speciesMap = {};
  speciesList.forEach(s => speciesMap[s.commonName] = s.id);

  // 4. Create 5 colonies with varied states
  console.log("-> Creating colony biomes...");
  const colonies = [
    { name: 'Alpha Nest — Carpenter Project',    speciesId: speciesMap['Eastern Carpenter Ant'], queenCount: 1, estimatedWorkerCount: 48,  description: 'Founding colony captured in May 2025. Primary research subject for tunneling behavior analysis.' },
    { name: 'Beta Sector — Garden Observation',   speciesId: speciesMap['Black Garden Ant'],      queenCount: 1, estimatedWorkerCount: 230, description: 'Mature colony transferred from outdoor habitat study. Monitoring foraging optimization strategies.' },
    { name: 'Gamma Swarm — Pavement Research',    speciesId: speciesMap['Pavement Ant'],          queenCount: 2, estimatedWorkerCount: 680, description: 'Polygynous colony exhibiting unusual cooperative brood-rearing between queens.' },
    { name: 'Delta Array — Harvester Seeds',      speciesId: speciesMap['Red Harvester Ant'],     queenCount: 1, estimatedWorkerCount: 125, description: 'Desert species adaptation study. Climate-controlled enclosure simulating arid conditions.' },
    { name: 'Epsilon Cluster — Leafcutter Trial', speciesId: speciesMap['Leafcutter Ant'],        queenCount: 1, estimatedWorkerCount: 1200, description: 'Long-term fungal symbiosis monitoring project. Custom substrate with live plant provisions.' },
  ];

  const colonyIds = [];
  for (const c of colonies) {
    const res = await fetch(`${URLS.colony}/api/colonies`, { method: 'POST', headers, body: JSON.stringify(c) });
    if (!res.ok) { console.error("   [COLONY] FAILED:", c.name, await res.text()); continue; }
    const { data } = await res.json();
    colonyIds.push(data.id);
    console.log(`   + ${c.name}  (${c.estimatedWorkerCount} workers)`);
  }

  // 5. Generate rich log entries per colony (varied types & realistic timestamps)
  console.log("\n-> Populating telemetry logs (varied types across 30-day window)...");
  
  const entryTypes = ['observation', 'feeding', 'maintenance', 'environmental'];
  const notesByType = {
    observation: observationNotes,
    feeding: feedingNotes,
    maintenance: maintenanceNotes,
    environmental: environmentalNotes,
  };
  const titlesByType = {
    observation: ['Behavioral Observation', 'Brood Development Check', 'Foraging Trail Survey', 'Population Census', 'Queen Status Report'],
    feeding: ['Scheduled Feeding', 'Protein Supplement', 'Sugar Water Refill', 'Test Diet Administration'],
    maintenance: ['Habitat Maintenance', 'Water Reservoir Service', 'Equipment Calibration', 'Substrate Adjustment'],
    environmental: ['Climate Monitoring', 'Photoperiod Adjustment', 'Humidity Calibration', 'Sensor Cross-Check'],
  };

  let totalLogs = 0;
  for (let ci = 0; ci < colonyIds.length; ci++) {
    const cid = colonyIds[ci];
    const numLogs = 12 + Math.floor(Math.random() * 8); // 12-20 logs per colony
    
    for (let i = 0; i < numLogs; i++) {
      const entryType = entryTypes[Math.floor(Math.random() * entryTypes.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const hoursOffset = Math.floor(Math.random() * 14) + 7; // 7am - 9pm
      const occurredAt = new Date(Date.now() - daysAgo * 86400000 + hoursOffset * 3600000).toISOString();

      // Temperature varies by colony (simulating different habitats)
      const baseTemp = [24, 22, 23, 30, 26][ci] || 24;
      const baseHum = [62, 70, 55, 35, 80][ci] || 60;
      const temp = (baseTemp + (Math.random() - 0.5) * 4).toFixed(1);
      const hum = (baseHum + (Math.random() - 0.5) * 10).toFixed(1);

      const body = {
        entryType,
        title: pickRandom(titlesByType[entryType]),
        content: pickRandom(notesByType[entryType]),
        occurredAt,
        environmentalReading: {
          temperature: parseFloat(temp),
          humidity: parseFloat(hum),
        }
      };

      const logRes = await fetch(`${URLS.log}/api/logs/${cid}`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!logRes.ok) { console.error("   Log error:", await logRes.text()); }
      totalLogs++;
    }
    console.log(`   [${colonies[ci].name.split('—')[0].trim()}] ${numLogs} entries logged`);
  }
  
  console.log(`\n=> Seed complete! ${colonyIds.length} colonies, ${totalLogs} log entries, 5 species.`);
  console.log("=> Login with: seed.operator@antiverse.com / SeedPassword123!");
}

start().catch(console.error);

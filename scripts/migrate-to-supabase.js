// CivicConnect - Supabase Data Migration & Seed Script
// Migrates existing local JSON databases (complaints, validations, audit logs) to Supabase Cloud

const path = require('path');
const fs = require('fs');
const config = require('../backend/config');
const supabaseClient = require('../backend/supabaseClient');

async function runMigration() {
  console.log('======================================================================');
  console.log(' CivicConnect -> Supabase Cloud Migration Tool');
  console.log('======================================================================\n');

  if (!config.isSupabaseConfigured) {
    console.error('❌ Supabase is not configured!');
    console.error('Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.\n');
    console.error('Example:');
    console.error('  SUPABASE_URL=https://your-project-id.supabase.co');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key\n');
    process.exit(1);
  }

  console.log(`📡 Connecting to Supabase: ${config.SUPABASE_URL}`);
  const conn = await supabaseClient.testConnection();

  if (!conn.connected) {
    console.error('❌ Could not connect to Supabase database.');
    console.error(`Error details: ${conn.error || 'Connection failed'}`);
    if (conn.hint) console.error(`Hint: ${conn.hint}`);
    console.error('\n⚠️  Make sure you have executed "supabase/schema.sql" in your Supabase SQL Editor first!');
    process.exit(1);
  }

  console.log(`✅ Connected successfully! (Latency: ${conn.latencyMs}ms)\n`);

  let totalComplaints = 0;
  let totalValidations = 0;
  let totalAudits = 0;
  let totalProfiles = 0;

  // 1. Seed Demo Profiles
  console.log('👤 Seeding user & official profiles...');
  const demoProfiles = [
    {
      id: 'CITIZEN-001',
      full_name: 'Aarav Sharma',
      email: 'aarav.citizen@kopargaon.gov.in',
      phone: '+91 98765 43210',
      role: 'citizen',
      city: 'Kopargaon',
      ward: 'Ward 1 - Shivaji Chowk',
      ward_name: 'Shivaji Chowk Municipal Ward',
      corporation: 'Kopargaon Municipal Council (KMC)',
      corporator: 'Ramesh Patil (Ward Corporator)',
      address: 'Near Shivaji Chowk, Kopargaon'
    },
    {
      id: 'USER-CORP-001',
      full_name: 'Ramesh Patil',
      email: 'ramesh.patil@kopargaon.gov.in',
      phone: '+91 98220 11223',
      role: 'nagarsevak',
      city: 'Kopargaon',
      ward: 'Ward 1 - Shivaji Chowk',
      ward_name: 'Shivaji Chowk Municipal Ward',
      corporation: 'Kopargaon Municipal Council (KMC)',
      corporator: 'Self (Corporator)',
      address: 'Ward Office, Station Road, Kopargaon'
    },
    {
      id: 'USER-ADMIN-001',
      full_name: 'Chief Municipal Officer (Admin)',
      email: 'admin@kopargaon.gov.in',
      phone: '+91 98220 99887',
      role: 'admin',
      city: 'Kopargaon',
      ward: 'All Wards',
      ward_name: 'Headquarters Jurisdiction',
      corporation: 'Kopargaon Municipal Council (KMC)',
      address: 'Municipal Council HQ, Kopargaon'
    },
    {
      id: 'USER-MLA-001',
      full_name: 'Ashok Rao (MLA / Aamdar)',
      email: 'mla.kopargaon@maharashtra.gov.in',
      phone: '+91 98220 55443',
      role: 'mla',
      city: 'Kopargaon',
      ward: 'Constituency Wide',
      ward_name: 'Kopargaon Assembly Constituency',
      corporation: 'Maharashtra Legislative Assembly',
      address: 'MLA Office, Shirdi Link Road, Kopargaon'
    }
  ];

  try {
    const { error: profileErr } = await supabaseClient.client
      .from('profiles')
      .upsert(demoProfiles, { onConflict: 'id' });

    if (profileErr) {
      console.warn(`  ⚠️ Profiles warning: ${profileErr.message}`);
    } else {
      totalProfiles = demoProfiles.length;
      console.log(`  ✓ Successfully upserted ${totalProfiles} role profiles.`);
    }
  } catch (e) {
    console.warn(`  ⚠️ Profile exception: ${e.message}`);
  }

  // 2. Migrate Complaints
  const complaintsPath = path.join(config.DATA_DIR, 'complaints.json');
  if (fs.existsSync(complaintsPath)) {
    console.log('\n📋 Migrating complaints from data/complaints.json...');
    const localComplaints = JSON.parse(fs.readFileSync(complaintsPath, 'utf8') || '[]');
    for (const c of localComplaints) {
      try {
        await supabaseClient.saveComplaint(c);
        totalComplaints++;
      } catch (err) {
        console.warn(`  ⚠️ Complaint ${c.id} error:`, err.message);
      }
    }
    console.log(`  ✓ Successfully migrated ${totalComplaints} / ${localComplaints.length} complaints.`);
  }

  // 3. Migrate Image Validations
  const validationsPath = path.join(config.DATA_DIR, 'imageValidations.json');
  if (fs.existsSync(validationsPath)) {
    console.log('\n🛡️ Migrating AI image validations from data/imageValidations.json...');
    const localValidations = JSON.parse(fs.readFileSync(validationsPath, 'utf8') || '[]');
    for (const v of localValidations) {
      try {
        await supabaseClient.saveValidation(v);
        totalValidations++;
      } catch (err) {
        console.warn(`  ⚠️ Validation ${v.validationId} error:`, err.message);
      }
    }
    console.log(`  ✓ Successfully migrated ${totalValidations} / ${localValidations.length} validation records.`);
  }

  // 4. Migrate Moderation Audits
  const auditPath = path.join(config.DATA_DIR, 'moderationAudit.json');
  if (fs.existsSync(auditPath)) {
    console.log('\n⚖️ Migrating moderation audits from data/moderationAudit.json...');
    const localAudits = JSON.parse(fs.readFileSync(auditPath, 'utf8') || '[]');
    for (const a of localAudits) {
      try {
        await supabaseClient.logModerationAction(a);
        totalAudits++;
      } catch (err) {
        console.warn(`  ⚠️ Audit log ${a.auditId} error:`, err.message);
      }
    }
    console.log(`  ✓ Successfully migrated ${totalAudits} / ${localAudits.length} moderation audit logs.`);
  }

  console.log('\n======================================================================');
  console.log(' Migration Summary');
  console.log('======================================================================');
  console.log(`  Profiles Created/Synced:   ${totalProfiles}`);
  console.log(`  Complaints Migrated:        ${totalComplaints}`);
  console.log(`  Validations Migrated:       ${totalValidations}`);
  console.log(`  Audit Logs Migrated:        ${totalAudits}`);
  console.log('======================================================================');
  console.log('✅ Supabase cloud migration complete! CivicConnect is live with Supabase.\n');
}

runMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});

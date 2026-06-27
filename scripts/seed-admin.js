// scripts/seed-admin.js
// Run ONCE to create your superadmin account in Firebase Auth + Firestore.
//
// Usage (from project root):
//   node scripts/seed-admin.js
//
// Add these to your .env.local before running:
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY
//   SEED_ADMIN_EMAIL        e.g. davidbibiresanmi@gmail.com
//   SEED_ADMIN_PASSWORD     choose a strong password

require('dotenv').config({ path: '.env.local' });

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth }      = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD,
} = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('❌  Missing Firebase Admin env vars. Check .env.local');
  process.exit(1);
}
if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
  console.error('❌  Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const adminAuth = getAuth();
const db        = getFirestore();

async function seed() {
  console.log(`\n🌱  Seeding superadmin: ${SEED_ADMIN_EMAIL}\n`);

  let uid;
  try {
    const user = await adminAuth.createUser({
      email:         SEED_ADMIN_EMAIL,
      password:      SEED_ADMIN_PASSWORD,
      emailVerified: true,
    });
    uid = user.uid;
    console.log(`✅  Firebase Auth user created — uid: ${uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      const user = await adminAuth.getUserByEmail(SEED_ADMIN_EMAIL);
      uid = user.uid;
      console.log(`ℹ️   Auth user already exists — uid: ${uid}`);
    } else {
      throw err;
    }
  }

  await db.collection('admins').doc(uid).set({
    email:     SEED_ADMIN_EMAIL,
    role:      'superadmin',
    createdAt: new Date().toISOString(),
    createdBy: 'seed-script',
    active:    true,
  });

  console.log(`✅  Firestore admins/${uid} → role: superadmin`);
  console.log('\n🎉  Done! Log in at /admin with these credentials.\n');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err.message || err);
  process.exit(1);
});
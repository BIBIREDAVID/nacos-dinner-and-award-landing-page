import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from '@/lib/firebase-admin';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(request: Request) {
  if (!INTERNAL_SECRET || request.headers.get('x-internal-key') !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, password, role, name } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['admin', 'usher'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const user = await getAuth().createUser({
      email,
      password,
      displayName:   name || undefined,
      emailVerified: true,
    });

    await getAdminDb().collection('admins').doc(user.uid).set({
      email,
      name:      name || '',
      role,
      active:    true,
      createdAt: new Date().toISOString(),
      createdBy: 'dashboard',
    });

    return NextResponse.json({ success: true, uid: user.uid });
  } catch (error: any) {
    console.error('Create staff error:', error);
    const msg =
      error.code === 'auth/email-already-exists'
        ? 'An account with this email already exists.'
        : error.message || 'Failed to create account';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
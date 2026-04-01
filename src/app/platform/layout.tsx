import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAuthToken } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get('sc-session')?.value;

    if (!token) {
        redirect('/platform-login?redirect=/platform/tenants');
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
        redirect('/platform-login?redirect=/platform/tenants');
    }

    const result = await query(
        'SELECT is_platform_admin FROM users WHERE id = $1',
        [payload.userId]
    );

    if (!result.rows[0]?.is_platform_admin) {
        redirect('/platform-login?redirect=/platform/tenants');
    }

    return <>{children}</>;
}

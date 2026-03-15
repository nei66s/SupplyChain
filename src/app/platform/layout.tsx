import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get('sc-session')?.value;

    if (!token) {
        redirect('/platform-login?redirect=/platform/tenants');
    }

    return <>{children}</>;
}

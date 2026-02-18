"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function SyncFab() {
  const [busy, setBusy] = useState(false);

  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 60 }}>
      <Button size="sm" onClick={async () => {
        try {
          setBusy(true);
          window.location.reload();
        } catch (e) {
          console.error(e);
        } finally {
          setBusy(false);
        }
      }}>
        {busy ? 'Sincronizando...' : 'Sincronizar'}
      </Button>
    </div>
  );
}

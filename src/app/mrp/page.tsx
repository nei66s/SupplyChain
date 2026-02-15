"use client";

import * as React from 'react';
import { AreaChart } from 'lucide-react';
import MrpPanel from '@/components/mrp-panel';

export default function MrpPage() {
  return (
    <div className="max-w-5xl">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
        <AreaChart className="h-6 w-6" /> MRP
      </h2>

      <MrpPanel />
    </div>
  );
}

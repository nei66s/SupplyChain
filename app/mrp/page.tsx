"use client";

import * as React from 'react';
import { AreaChart } from 'lucide-react';
import MrpPanel from '@/components/mrp-panel';

export default function MrpPage() {
  return (
    <div className="w-full max-w-full">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold sm:text-2xl">
        <AreaChart className="h-6 w-6" /> Planejamento de Materiais
      </h2>

      <MrpPanel />
    </div>
  );
}

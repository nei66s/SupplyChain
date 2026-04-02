'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { operationModeLabel } from './helpers';
import { TENANT_OPERATION_MODES, TenantOperationMode } from './types';

type OperationModeSelectorProps = {
  value: TenantOperationMode;
  onChange: (value: TenantOperationMode) => void;
  className?: string;
};

export function OperationModeSelector({
  value,
  onChange,
  className,
}: OperationModeSelectorProps) {
  return (
    <div className={cn(className)}>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as TenantOperationMode)}>
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="Selecione o modo" />
        </SelectTrigger>
        <SelectContent>
          {TENANT_OPERATION_MODES.map((mode) => (
            <SelectItem key={mode} value={mode}>
              {operationModeLabel(mode)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

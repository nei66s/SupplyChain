"use client";

import { useRealtime } from "@/hooks/useRealtime";

export function RealtimeListener() {
    useRealtime();
    return null;
}

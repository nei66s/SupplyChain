import { create } from 'zustand';

interface RealtimeState {
    isConnected: boolean;
    isConnecting: boolean;
    setIsConnected: (connected: boolean) => void;
    setIsConnecting: (connecting: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
    isConnected: false,
    isConnecting: false,
    setIsConnected: (connected) => set({ isConnected: connected, isConnecting: false }),
    setIsConnecting: (connecting) => set({ isConnecting: connecting }),
}));

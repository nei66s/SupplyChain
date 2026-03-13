import { create } from 'zustand';

interface RealtimeState {
    isConnected: boolean;
    isConnecting: boolean;
    lastNotificationAt: number;
    isMuted: boolean;
    setIsConnected: (connected: boolean) => void;
    setIsConnecting: (connecting: boolean) => void;
    notifyNotification: () => void;
    setIsMuted: (muted: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
    isConnected: false,
    isConnecting: false,
    lastNotificationAt: 0,
    isMuted: typeof window !== 'undefined' ? localStorage.getItem('notifications_muted') === 'true' : false,
    setIsConnected: (connected) => set({ isConnected: connected, isConnecting: false }),
    setIsConnecting: (connecting) => set({ isConnecting: connecting }),
    notifyNotification: () => set({ lastNotificationAt: Date.now() }),
    setIsMuted: (muted) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('notifications_muted', String(muted));
        }
        set({ isMuted: muted });
    },
}));

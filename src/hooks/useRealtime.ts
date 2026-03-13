import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeStore } from "@/store/use-realtime-store";

export function useRealtime() {
    const router = useRouter();
    const { setIsConnected, setIsConnecting, notifyNotification, isMuted } = useRealtimeStore();
    const isMutedRef = useRef(isMuted);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const needsRefreshRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        console.log("[realtime] Hook mounted, preparing connection...");

        const handleVisibilityChange = () => {
            if (
                document.visibilityState === "visible" &&
                needsRefreshRef.current
            ) {
                console.log("[realtime] Visibility changed to visible, performing pending refresh.");
                needsRefreshRef.current = false;
                router.refresh();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        function connect() {
            if (!isMounted) return;

            const wsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();

            console.log("[realtime] Attempting to connect to:", wsUrl);

            if (!wsUrl) {
                console.info("[realtime] WebSocket disabled: NEXT_PUBLIC_WS_URL is not configured.");
                setIsConnected(false);
                setIsConnecting(false);
                return;
            }

            if (
                wsRef.current?.readyState === WebSocket.OPEN ||
                wsRef.current?.readyState === WebSocket.CONNECTING
            ) {
                console.log("[realtime] Connection already open or connecting.");
                return;
            }

            setIsConnecting(true);
            try {
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    if (!isMounted) {
                        ws.close();
                        return;
                    }
                    console.log("[realtime] ✅ Connected successfully to", wsUrl);
                    setIsConnected(true);
                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                        reconnectTimeoutRef.current = null;
                    }
                };

                let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

                const playNotificationSound = () => {
                    try {
                        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const playTone = (freq: number, start: number, duration: number) => {
                            const osc = audioCtx.createOscillator();
                            const g = audioCtx.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(freq, start);
                            g.gain.setValueAtTime(0, start);
                            g.gain.linearRampToValueAtTime(0.1, start + 0.05);
                            g.gain.exponentialRampToValueAtTime(0.01, start + duration);
                            osc.connect(g);
                            g.connect(audioCtx.destination);
                            osc.start(start);
                            osc.stop(start + duration);
                        };
                        playTone(660, audioCtx.currentTime, 0.4);
                        playTone(880, audioCtx.currentTime + 0.1, 0.4);
                    } catch (e) {
                        console.warn("[realtime] Fail to play sound:", e);
                    }
                };

                ws.onmessage = (event) => {
                    console.log("[realtime] 📩 Message received:", event.data);

                    try {
                        const data = JSON.parse(event.data);
                        if (data.event === 'NOTIFICATION_CREATED') {
                            if (!isMutedRef.current) playNotificationSound();
                            notifyNotification();
                        }
                    } catch { /* ignore non-json or malformed */ }

                    if (document.visibilityState === "visible") {
                        if (refreshTimeout) clearTimeout(refreshTimeout);
                        refreshTimeout = setTimeout(() => {
                            console.log("[realtime] Performing debounced router.refresh()");
                            router.refresh();
                        }, 2000); // 2 seconds debounce
                    } else {
                        console.log("[realtime] App invisible, postponing refresh.");
                        needsRefreshRef.current = true;
                    }
                };

                ws.onclose = (event) => {
                    console.warn("[realtime] ❌ WebSocket closed", event.code, event.reason);
                    wsRef.current = null;
                    setIsConnected(false);
                    setIsConnecting(false);

                    if (isMounted) {
                        console.log("[realtime] Scheduled reconnection in 3s...");
                        reconnectTimeoutRef.current = setTimeout(connect, 3000);
                    }
                };

                ws.onerror = (err) => {
                    // Browser WebSocket error events are opaque and commonly occur during reconnect.
                    // Keep this as warning so local dev is not blocked by noisy console overlays.
                    console.warn("[realtime] WebSocket error:", err);
                    ws.close();
                };
            } catch (err) {
                console.error("[realtime] 🚨 Error creating WebSocket:", err);
                if (isMounted) {
                    reconnectTimeoutRef.current = setTimeout(connect, 3000);
                }
            }
        }

        connect();

        return () => {
            console.log("[realtime] Hook unmounting, closing connection.");
            isMounted = false;

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
                setIsConnected(false);
            }
        };
    }, [router, setIsConnected, setIsConnecting]);
}

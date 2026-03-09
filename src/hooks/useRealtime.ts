import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeStore } from "@/store/use-realtime-store";

export function useRealtime() {
    const router = useRouter();
    const { setIsConnected, setIsConnecting } = useRealtimeStore();
    const wsRef = useRef<WebSocket | null>(null);
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

            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://ws.blacktowerx.com.br/";

            console.log("[realtime] Attempting to connect to:", wsUrl);

            if (!wsUrl) {
                console.warn("[realtime] NEXT_PUBLIC_WS_URL is not set and no fallback.");
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

                ws.onmessage = (event) => {
                    console.log("[realtime] 📩 Message received:", event.data);
                    if (document.visibilityState === "visible") {
                        console.log("[realtime] Performing router.refresh()");
                        router.refresh();
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
                    console.error("[realtime] 🚨 WebSocket error:", err);
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
    }, [router, setIsConnected]);
}

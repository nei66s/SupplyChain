"use client";

import * as React from "react";
import { Bell, Info, AlertTriangle, CheckCircle, Inbox } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "../ui/dropdown-menu";
import { usePilotStore, usePilotDerived } from "@/lib/pilot/store";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

export function NotificationCenter() {
  const db = usePilotStore((s) => s.db);
  const markNotification = usePilotStore((s) => s.markNotification);
  const { unreadCount } = usePilotDerived();
  type UiNotification = (typeof db.notifications)[number] & { _removing?: boolean };

  const [items, setItems] = React.useState<UiNotification[]>(() =>
    db.notifications.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );

  React.useEffect(() => {
    setItems(db.notifications.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [db.notifications]);

  const handleMarkRead = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, _removing: true } : it)));
    setTimeout(() => {
      markNotification(id, true);
      setItems((prev) => prev.filter((it) => it.id !== id));
    }, 140);
  };

  const handleMarkAll = () => {
    const unread = items.filter((it) => !it.readAt).map((i) => i.id);
    setItems((prev) => prev.filter((it) => it.readAt));
    unread.forEach((id) => markNotification(id, true));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0" aria-label="Notificacoes">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span
              suppressHydrationWarning
              className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white"
            >
              {unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="max-h-[70vh] w-[390px] overflow-auto p-2" sideOffset={10}>
        <div className="flex items-center justify-between px-2 py-1">
          <div>
            <h3 className="text-sm font-semibold">Notificacoes</h3>
            <p className="text-xs text-muted-foreground">{unreadCount} nao lida(s)</p>
          </div>
          {unreadCount > 0 ? (
            <button className="text-xs font-medium text-primary hover:underline" onClick={handleMarkAll}>
              Marcar todas
            </button>
          ) : null}
        </div>

        <div className="mt-2 space-y-1">
          {items.length === 0 ? (
            <EmptyState icon={Inbox} title="Nenhuma notificacao" description="Novos eventos operacionais aparecerao aqui." className="min-h-[150px]" />
          ) : (
            items.map((item) => {
              const unread = !item.readAt;
              const Icon =
                item.type === 'RUPTURA' || item.type === 'ESTOQUE_MINIMO' || item.type === 'ESTOQUE_PONTO_PEDIDO'
                  ? AlertTriangle
                  : item.type === 'SISTEMA'
                    ? Info
                    : CheckCircle;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`group flex w-full items-start gap-3 rounded-lg border border-transparent p-3 text-left transition-all duration-150 ${
                    item._removing ? 'translate-x-2 opacity-0' : 'opacity-100'
                  } ${unread ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
                  onClick={() => handleMarkRead(item.id)}
                >
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</div>
                    </div>
                    {item.message ? <div className="mt-1 truncate text-xs text-muted-foreground">{item.message}</div> : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationCenter;

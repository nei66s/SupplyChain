'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  AreaChart,
  Bot,
  Factory,
  LogOut,
  Moon,
  PackageCheck,
  Search,
  Shield,
  ShoppingCart,
  Sun,
  Warehouse,
} from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import NotificationCenter from './notifications/notification-center';
import { usePilotDerived, usePilotStore } from '@/lib/pilot/store';
import { Role } from '@/lib/pilot/types';
import { Input } from './ui/input';
import { roleLabel } from '@/lib/pilot/i18n';

const navItems = [
  { href: '/dashboard', icon: AreaChart, label: 'Painel' },
  { href: '/orders', icon: ShoppingCart, label: 'Pedidos' },
  { href: '/materials', icon: Bot, label: 'Materiais' },
  { href: '/inventory', icon: Warehouse, label: 'Estoque' },
  { href: '/production', icon: Factory, label: 'Producao' },
  { href: '/picking', icon: PackageCheck, label: 'Separacao' },
  { href: '/admin', icon: Shield, label: 'Administracao' },
];

const roles: Role[] = ['Admin', 'Manager', 'Seller', 'Input Operator', 'Production Operator', 'Picker'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  const db = usePilotStore((state) => state.db);
  const currentUserId = usePilotStore((state) => state.currentUserId);
  const currentRole = usePilotStore((state) => state.currentRole);
  const setCurrentRole = usePilotStore((state) => state.setCurrentRole);
  const runMaintenance = usePilotStore((state) => state.runMaintenance);
  const { expiringSoon } = usePilotDerived();

  const user = db.users.find((item) => item.id === currentUserId) ?? db.users[0];

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      runMaintenance();
    }, 30000);

    setMounted(true);

    return () => {
      window.clearInterval(timer);
    };
  }, [runMaintenance]);

  React.useEffect(() => {
    const saved = window.localStorage.getItem('theme');
    const initialTheme =
      saved === 'dark' || saved === 'light'
        ? saved
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

    setTheme(initialTheme);
  }, []);

  React.useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar>
        <SidebarHeader>
          <Logo className="px-1 py-1" />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Operacoes</SidebarGroupLabel>
            <SidebarMenu>
              {navItems
                .filter((i) => i.href !== '/materials' && i.href !== '/admin')
                .map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Administracao</SidebarGroupLabel>
            <SidebarMenu>
              {navItems
                .filter((i) => i.href === '/materials' || i.href === '/admin')
                .map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatarUrl} alt={user?.name} />
              <AvatarFallback>{user?.name?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{roleLabel(currentRole)}</div>
            </div>
            <SidebarTrigger className="ml-auto hidden md:inline-flex" />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/80 bg-background/95 px-5 backdrop-blur">
          <SidebarTrigger className="md:hidden" />

          <h1 className="text-lg font-semibold font-headline">
            {navItems.find((item) => pathname.startsWith(item.href))?.label ?? 'São José Cordas'}
          </h1>

          <div className="hidden flex-1 md:flex md:justify-center">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar pedidos, materiais ou tarefas" className="h-10 pl-9" />
            </div>
          </div>

          <NotificationCenter />
          {mounted ? (
            <Button
              variant="ghost"
              className="h-10 w-10 rounded-full p-0"
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                  <AvatarFallback>{user?.name?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" side="bottom" align="end">
              <DropdownMenuLabel>Simulacao de Perfil</DropdownMenuLabel>
              {roles.map((role) => (
                <DropdownMenuItem key={role} onClick={() => setCurrentRole(role)}>
                  <span>{roleLabel(role)}</span>
                  {role === currentRole ? (
                    <Badge className="ml-auto" variant="secondary">
                      Ativo
                    </Badge>
                  ) : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {mounted && expiringSoon > 0 ? (
            <Badge variant="warning">{expiringSoon} reservas expiram em {'<1m'}</Badge>
          ) : null}
        </header>

        <main className="page-enter flex-1 p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

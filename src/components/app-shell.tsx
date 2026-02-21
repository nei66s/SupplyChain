'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  AreaChart,
  Bot,
  Factory,
  FileText,
  LogOut,
  Moon,
  PackageCheck,
  Search,
  Shield,
  ShoppingCart,
  UserCircle2,
  Sun,
  Warehouse,
  Trash2,
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
import NotificationCenter from './notifications/notification-center';
import DbHealth from './db-health';
import PingHealth from './ping-health';
import { Input } from './ui/input';
import { roleLabel } from '@/lib/domain/i18n';
import { useAuthUser } from '@/hooks/use-auth';
import { DataRefreshIndicator } from './data-refresh-indicator';

const navItems = [
  { href: '/dashboard', icon: AreaChart, label: 'Indicadores' },
  { href: '/orders', icon: ShoppingCart, label: 'Pedidos' },
  { href: '/orders/trash', icon: Trash2, label: 'Lixeira' },
  { href: '/materials', icon: Bot, label: 'Materiais' },
  { href: '/inventory', icon: Warehouse, label: 'Estoque' },
  { href: '/production', icon: Factory, label: 'Producao' },
  { href: '/report', icon: FileText, label: 'Relatório' },
  { href: '/picking', icon: PackageCheck, label: 'Separacao' },
  { href: '/admin', icon: Shield, label: 'Administracao' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  const { user: authUser } = useAuthUser();

  const displayUser = authUser ?? null;
  const displayRoleLabel = displayUser ? roleLabel(displayUser.role) : '---';
  const headerIsHydrated = mounted;
  const userName = headerIsHydrated ? displayUser?.name ?? 'Usuario' : 'Usuario';
  const roleLabelText = headerIsHydrated ? displayRoleLabel : 'Carregando...';
  const avatarSrc = headerIsHydrated ? displayUser?.avatarUrl ?? '/logo.png' : '/logo.png';
  const avatarAlt = headerIsHydrated ? displayUser?.name ?? 'Usuario' : 'Usuario';
  const avatarInitial = headerIsHydrated ? displayUser?.name?.charAt(0)?.toUpperCase() ?? 'U' : 'U';

  React.useEffect(() => {
    setMounted(true);
  }, []);

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
    try {
      // Also persist theme in a cookie so SSR or other contexts can read it
      // Max-Age ~ 1 year
      document.cookie = `theme=${theme};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    } catch {}
  }, [theme]);

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar className="w-72 text-sidebar-foreground shadow-sm">
        <SidebarHeader className="rounded-3xl border border-sidebar-border/70 bg-sidebar/95 p-4 text-sidebar-foreground">
          <Logo className="px-1 py-1" />
        </SidebarHeader>
        <SidebarContent className="flex flex-col gap-5 rounded-3xl border border-sidebar-border/80 bg-sidebar/90 px-3 py-6">
          <div className="relative flex flex-col gap-4">
            {/* Painel group with quick indicators */}
            <SidebarGroup>
              <SidebarGroupLabel>Indicadores</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem key="/dashboard">
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard')} tooltip="Indicadores">
                    <Link href="/dashboard">
                      <AreaChart />
                      <span>Indicadores</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Pedidos</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem key="/orders">
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/orders')} tooltip="Pedidos">
                    <Link href="/orders">
                      <ShoppingCart />
                      <span>Pedidos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem key="/orders/trash">
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/orders/trash')} tooltip="Lixeira">
                    <Link href="/orders/trash">
                      <Trash2 />
                      <span>Lixeira</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem key="/mrp">
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/mrp')} tooltip="Planejamento de Materiais">
                    <Link href="/mrp">
                      <AreaChart />
                      <span>Planejamento de Materiais</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Operacoes</SidebarGroupLabel>
              <SidebarMenu>
                {navItems
                  .filter(
                    (i) =>
                      i.href !== '/materials' &&
                      i.href !== '/admin' &&
                      i.href !== '/orders' &&
                      i.href !== '/orders/trash' &&
                      i.href !== '/dashboard'
                  )
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
          </div>
        </SidebarContent>

        {/* Profile moved to top bar; Sidebar footer removed to avoid duplication */}
      </Sidebar>

      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-5 shadow-sm">
          <SidebarTrigger className="md:hidden" />

          <h1 className="text-lg font-semibold font-headline">
            {navItems.find((item) => pathname.startsWith(item.href))?.label ?? 'Inventário Ágil'}
          </h1>

          <div className="hidden flex-1 md:flex md:justify-center">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar pedidos, materiais ou tarefas" className="h-10 pl-9" />
            </div>
          </div>

          <NotificationCenter />
          <div className="flex items-center gap-2">
            <PingHealth />
            <DbHealth />
            <DataRefreshIndicator />
          </div>
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
                  <AvatarImage src={avatarSrc} alt={avatarAlt} />
                  <AvatarFallback>{avatarInitial}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" side="bottom" align="end">
              <DropdownMenuLabel className="space-y-0.5">
                <div>{userName}</div>
                <div className="text-xs font-normal text-muted-foreground">{roleLabelText}</div>
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserCircle2 className="mr-2 h-4 w-4" />
                  Meu perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </header>

        <main className="page-enter flex-1 p-6 lg:p-10">
          <div className="mx-auto min-h-[65vh] w-full max-w-6xl">
            <div className="min-h-full rounded-[32px] border border-border bg-card p-6 shadow-xl text-card-foreground">
              {children}
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

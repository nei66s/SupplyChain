'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  ClipboardList,
  BookmarkCheck,
  Bell,
  Zap,
  Users,
  TrendingUp,
} from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
import { useRealtimeStore } from '@/store/use-realtime-store';

const navItems = [
  { href: '/dashboard', icon: AreaChart, label: 'Indicadores' },
  { href: '/orders', icon: ShoppingCart, label: 'Pedidos' },
  { href: '/orders/trash', icon: Trash2, label: 'Lixeira' },
  { href: '/materials', icon: Bot, label: 'Materiais' },
  { href: '/production', icon: Factory, label: 'Producao' },
  { href: '/report', icon: FileText, label: 'Relatório' },
  { href: '/picking', icon: PackageCheck, label: 'Separacao' },
  { href: '/admin', icon: Shield, label: 'Administracao' },
];

function AppShellContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'stock';
  const currentDashTab = searchParams.get('tab') || 'business';
  const [mounted, setMounted] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  const { user: authUser, loading: authLoading } = useAuthUser();
  const { isConnected } = useRealtimeStore();

  const displayUser = authUser ?? null;
  const displayRoleLabel = displayUser ? roleLabel(displayUser.role) : '---';
  const headerIsHydrated = mounted;
  const userName = headerIsHydrated ? displayUser?.name ?? 'Usuario' : 'Usuario';
  const roleLabelText = headerIsHydrated ? displayRoleLabel : 'Carregando...';
  const avatarSrc = headerIsHydrated ? displayUser?.avatarUrl ?? '/black-tower-x-transp.png' : '/black-tower-x-transp.png';
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
    } catch { }
  }, [theme]);

  React.useEffect(() => {
    if (!mounted || authLoading) return;
    if (!authUser) {
      router.replace('/login');
    }
  }, [authLoading, authUser, mounted, router]);

  // Use currentTab for active state in sidebar sub-links
  const isInventoryActive = pathname.startsWith('/inventory');
  const isDashboardActive = pathname.startsWith('/dashboard');

  const handleLogout = React.useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('logout failed', error);
    } finally {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="relative min-h-svh w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Global Abstract Backgrounds */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-10%] w-[50%] h-[40%] rounded-full bg-blue-500/10 dark:bg-blue-500/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-violet-500/10 dark:bg-violet-500/20 blur-[120px]" />
      </div>

      <SidebarProvider defaultOpen={false}>
        <Sidebar className="text-sidebar-foreground lg:w-72 border-0 shadow-none bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0">
          <SidebarHeader className="p-0 px-4 pt-4 pb-3 border-0 shadow-none text-sidebar-foreground">
            <Logo className="px-1 py-1" />
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-2 p-0 px-2 pb-4 pt-2">
            <div className="relative flex flex-col gap-2">
              {/* Painel group with quick indicators */}
              <SidebarGroup className="p-1">
                <SidebarGroupLabel>Indicadores</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <div className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm font-semibold text-sidebar-foreground/70 select-none">
                      <AreaChart className="h-4 w-4" />
                      <span>Indicadores</span>
                    </div>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isDashboardActive && currentDashTab === 'business'}>
                          <Link href="/dashboard?tab=business" className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>Negócio</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isDashboardActive && currentDashTab === 'people'}>
                          <Link href="/dashboard?tab=people" className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            <span>Pessoas</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
              <SidebarGroup className="p-1">
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
                </SidebarMenu>
              </SidebarGroup>

              <SidebarGroup className="p-1 pt-4">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <div className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm font-semibold text-sidebar-foreground/70 select-none">
                      <Warehouse className="h-4 w-4" />
                      <span>Gestão de estoque</span>
                    </div>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isInventoryActive && currentTab === 'stock'}>
                          <Link href="/inventory?tab=stock" className="flex items-center gap-2">
                            <Warehouse className="h-3.5 w-3.5" />
                            <span>Estoque</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isInventoryActive && currentTab === 'adjust'}>
                          <Link href="/inventory?tab=adjust" className="flex items-center gap-2">
                            <ClipboardList className="h-3.5 w-3.5" />
                            <span>Ajustes</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isInventoryActive && currentTab === 'reservations'}>
                          <Link href="/inventory?tab=reservations" className="flex items-center gap-2">
                            <BookmarkCheck className="h-3.5 w-3.5" />
                            <span>Reservas</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isInventoryActive && currentTab === 'inbox'}>
                          <Link href="/inventory?tab=inbox" className="flex items-center gap-2">
                            <Bell className="h-3.5 w-3.5" />
                            <span>Inbox</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isInventoryActive && currentTab === 'mrp'}>
                          <Link href="/inventory?tab=mrp" className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5" />
                            <span>Planejamento MRP</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>

              <SidebarGroup className="p-1">
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

              <SidebarGroup className="p-1">
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

        <SidebarInset className="bg-transparent relative overflow-x-hidden">

          <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 px-3 py-3 shadow-sm backdrop-blur-xl sm:gap-3 sm:px-6">
            <SidebarTrigger className="lg:hidden" />

            <h1 className="min-w-0 flex-1 truncate text-lg font-bold font-headline tracking-tight text-slate-800 dark:text-slate-200">
              {navItems.find((item) => pathname.startsWith(item.href))?.label ?? (isInventoryActive ? 'Estoque' : 'Inventário Ágil')}
            </h1>

            <div className="hidden flex-1 md:flex md:justify-center">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar pedidos, materiais ou tarefas" className="pl-9 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60" />
              </div>
            </div>

            <NotificationCenter />
            <div className="hidden items-center gap-2 sm:flex">
              <PingHealth />
              <DbHealth />
              {mounted && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase transition-all duration-500 ${isConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-500/10 border-slate-500/30 text-slate-500'
                  }`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {isConnected ? 'Real-time' : 'Real-time offline'}
                </div>
              )}
            </div>
            {mounted ? (
              <Button
                variant="ghost"
                className="h-11 w-11 rounded-full p-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm"
                aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-11 w-11 rounded-full p-0 shadow-sm transition-transform hover:scale-105">
                  <Avatar className="h-9 w-9 border-2 border-white/80 shadow-sm">
                    <AvatarImage src={avatarSrc} alt={avatarAlt} className="object-cover" />
                    <AvatarFallback className="bg-indigo-600 text-white font-bold">{avatarInitial}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-w-[calc(100vw-1rem)] rounded-2xl border-slate-200/60 shadow-xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 dark:border-slate-800/60" side="bottom" align="end">
                <DropdownMenuLabel className="space-y-0.5 px-3 py-2">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{userName}</div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{roleLabelText}</div>
                </DropdownMenuLabel>
                <DropdownMenuItem asChild className="rounded-xl mx-1 cursor-pointer">
                  <Link href="/profile">
                    <UserCircle2 className="mr-2 h-4 w-4" />
                    Meu perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200/60 dark:bg-slate-800/60" />
                <DropdownMenuItem className="rounded-xl mx-1 text-red-600 focus:text-red-600 cursor-pointer" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </header>

          <main className="page-enter flex-1 relative z-10 px-4 py-8 sm:px-8 sm:py-10">
            <div className="mx-auto w-full max-w-full lg:max-w-[1600px]">
              {authUser ? (
                children
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">Validando sessao...</div>
              )}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

export function AppShell(props: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center p-8 text-muted-foreground">Carregando interface...</div>}>
      <AppShellContent {...props} />
    </React.Suspense>
  );
}

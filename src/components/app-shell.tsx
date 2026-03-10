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
  LayoutDashboard,
  Menu,
  RefreshCcw,
  Clock,
  Inbox,
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { Button } from './ui/button';
import { WhatsAppButton } from './WhatsAppButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import NotificationCenter from './notifications/notification-center';
import DbHealth from './db-health';
import PingHealth from './ping-health';
import WsHealth from './ws-health';
import { Input } from './ui/input';
import { roleLabel } from '@/lib/domain/i18n';
import { useAuthUser } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import { useTheme } from '@/hooks/use-theme';


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

function MobileBottomNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const items = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
    { href: '/orders', icon: ShoppingCart, label: 'Pedidos' },
    { href: '/inventory', icon: Warehouse, label: 'Estoque' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60 px-4 pb-4 pt-2 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
        {items.map(item => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[64px] py-1 rounded-xl transition-all duration-200 active:scale-90",
                isActive ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-500 dark:text-slate-400"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                isActive && "bg-indigo-50 dark:bg-indigo-900/30"
              )}>
                <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center gap-1 min-w-[64px] py-1 rounded-xl text-slate-500 dark:text-slate-400 transition-all active:scale-90"
        >
          <div className="p-1.5 rounded-lg">
            <Menu className="h-5 w-5 stroke-[1.5px]" />
          </div>
          <span className="text-[10px] tracking-tight">Menu</span>
        </button>
      </div>
    </div>
  );
}

function AppSidebar() {
  const { setOpenMobile, openMobile } = useSidebar();
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'stock';
  const currentDashTab = searchParams.get('tab') || 'business';

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

  if (isMobile) {
    const mobileItems = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Painel', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      { href: '/orders', icon: ShoppingCart, label: 'Pedidos', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
      { href: '/inventory', icon: Warehouse, label: 'Estoque', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
      { href: '/inventory?tab=mrp', icon: AreaChart, label: 'MRP', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
      { href: '/report', icon: FileText, label: 'Relatórios', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
      { href: '/production', icon: Factory, label: 'Produção', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-900/20' },
      { href: '/picking', icon: PackageCheck, label: 'Separação', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
      { href: '/materials', icon: Bot, label: 'Materiais', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
      { href: '/orders/trash', icon: Trash2, label: 'Lixeira', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
      { href: '/profile', icon: UserCircle2, label: 'Perfil', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-200/50 dark:bg-slate-900/20' },
      { href: '/admin', icon: Shield, label: 'Ajustes', color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800' },
      { href: '/logout-trigger', icon: LogOut, label: 'Sair', color: 'text-red-700 dark:text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', isAction: true },
    ];

    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="bottom" className="h-auto max-h-[95svh] w-full p-0 border-0 rounded-t-[32px] bg-white dark:bg-slate-950 flex flex-col focus-visible:outline-none overflow-hidden">
          <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
          <SheetDescription className="sr-only">Acesse todos os módulos e configurações do sistema</SheetDescription>
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200/60 dark:bg-slate-800/60 flex-shrink-0" />

          <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
            <div className="grid grid-cols-3 gap-3">
              {mobileItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const isLogout = (item as any).isAction && item.href === '/logout-trigger';

                return (
                  <Link
                    key={item.href}
                    href={isLogout ? '#' : item.href}
                    onClick={(e) => {
                      if (isLogout) {
                        e.preventDefault();
                        handleLogout();
                      }
                      setOpenMobile(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95",
                      isActive ? "bg-indigo-50/50 dark:bg-indigo-900/20 ring-1 ring-indigo-200/50 dark:ring-indigo-800/50" : "bg-slate-50/50 dark:bg-slate-900/30"
                    )}
                  >
                    <div className={cn("p-3 rounded-xl shadow-sm transition-transform", item.bg, item.color, isActive && "scale-110")}>
                      <item.icon className="h-6 w-6 stroke-[2px]" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold text-center leading-tight uppercase tracking-tight",
                      isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Dynamic Sub-menu for active module on mobile */}
            {isInventoryActive && (
              <div className="mt-8 space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">Sub-módulos: Estoque</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'Saldo de Estoque', tab: 'stock', icon: Warehouse },
                    { label: 'Ajustes de Inventário', tab: 'adjustments', icon: RefreshCcw },
                    { label: 'Reservas e Validade', tab: 'reservations', icon: Clock },
                    { label: 'Inbox (Reservas Diretas)', tab: 'inbox', icon: Inbox },
                    { label: 'Planejamento MRP', tab: 'mrp', icon: AreaChart },
                  ].map((sub) => (
                    <Link
                      key={sub.tab}
                      href={`/inventory?tab=${sub.tab}`}
                      onClick={() => setOpenMobile(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-colors",
                        currentTab === sub.tab ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-900"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", currentTab === sub.tab ? "bg-white dark:bg-slate-900 shadow-sm" : "bg-slate-100 dark:bg-slate-800")}>
                        <sub.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold">{sub.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {isDashboardActive && (
              <div className="mt-8 space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">Sub-módulos: Dashboard</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'Indicadores de Negócio', tab: 'business', icon: TrendingUp },
                    { label: 'Indicadores de Pessoas', tab: 'people', icon: Users },
                  ].map((sub) => (
                    <Link
                      key={sub.tab}
                      href={`/dashboard?tab=${sub.tab}`}
                      onClick={() => setOpenMobile(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-colors",
                        currentDashTab === sub.tab ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-900"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", currentDashTab === sub.tab ? "bg-white dark:bg-slate-900 shadow-sm" : "bg-slate-100 dark:bg-slate-800")}>
                        <sub.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold">{sub.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sidebar className="text-sidebar-foreground border-0 shadow-none bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0">
      <SidebarHeader className="p-0 px-4 pt-5 pb-4 border-0 shadow-none text-sidebar-foreground">
        <div className="flex items-center justify-between gap-2">
          <Logo className="px-1 py-1" />
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col gap-4 p-0 px-3 pb-8 pt-4">
        <div className="relative flex flex-col gap-4">
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
    </Sidebar>
  );
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, mounted } = useTheme();
  const { user: authUser, loading: authLoading } = useAuthUser();

  const displayUser = authUser ?? null;
  const displayRoleLabel = displayUser ? roleLabel(displayUser.role) : '---';
  const headerIsHydrated = mounted;
  const userName = headerIsHydrated ? displayUser?.name ?? 'Usuario' : 'Usuario';
  const roleLabelText = headerIsHydrated ? displayRoleLabel : 'Carregando...';
  const avatarSrc = headerIsHydrated ? displayUser?.avatarUrl ?? '/black-tower-x-transp.png' : '/black-tower-x-transp.png';
  const avatarAlt = headerIsHydrated ? displayUser?.name ?? 'Usuario' : 'Usuario';
  const avatarInitial = headerIsHydrated ? displayUser?.name?.charAt(0)?.toUpperCase() ?? 'U' : 'U';

  React.useEffect(() => {
    if (!mounted || authLoading) return;
    if (!authUser) {
      router.replace('/login');
      return;
    }

    // Billing Enforcement: Redirect to billing if status is INCOMPLETE
    // Bypass for billing page itself, profile (user needs to logout/change password)
    // and platform management pages.
    const isBillingPage = pathname.startsWith('/dashboard/billing');
    const isExcluded = pathname.startsWith('/profile') || pathname.startsWith('/platform');

    if (authUser.subscriptionStatus === 'INCOMPLETE' && !isBillingPage && !isExcluded) {
      router.replace('/dashboard/billing');
    }
  }, [authLoading, authUser, mounted, router, pathname]);


  const isInventoryActive = pathname.startsWith('/inventory');

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

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return null;
  }

  return (
    <div className="relative min-h-svh w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Global Abstract Backgrounds */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-10%] w-[50%] h-[40%] rounded-full bg-blue-500/10 dark:bg-blue-500/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-violet-500/10 dark:bg-violet-500/20 blur-[120px]" />
      </div>

      <SidebarProvider defaultOpen={true}>
        <AppSidebar />

        <SidebarInset className="bg-transparent relative overflow-x-hidden">

          <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 px-3 py-3 shadow-sm backdrop-blur-xl sm:gap-3 sm:px-6">
            <SidebarTrigger className="hidden lg:inline-flex" />

            <h1 className="min-w-0 flex-1 truncate text-lg font-bold font-headline tracking-tight text-slate-800 dark:text-slate-200 ml-1">
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
              <WsHealth />
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

          <MobileBottomNav />

          <main className="page-enter flex-1 relative z-10 px-4 pt-4 pb-28 md:px-8 md:py-10">
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
      <WhatsAppButton />
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

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

  return (
    <div className="relative min-h-svh w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Global Abstract Backgrounds */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-10%] w-[50%] h-[40%] rounded-full bg-blue-500/10 dark:bg-blue-500/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-violet-500/10 dark:bg-violet-500/20 blur-[120px]" />
      </div>

      <SidebarProvider defaultOpen={false}>
        <Sidebar className="text-sidebar-foreground lg:w-72 border-r-0 bg-transparent">
          <SidebarHeader className="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl p-4 shadow-sm text-sidebar-foreground">
            <Logo className="px-1 py-1" />
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl px-3 py-6 shadow-sm">
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

        <SidebarInset className="bg-transparent relative overflow-x-hidden">

          <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 px-3 py-3 shadow-sm backdrop-blur-xl sm:gap-3 sm:px-6">
            <SidebarTrigger className="lg:hidden" />

            <h1 className="min-w-0 flex-1 truncate text-lg font-bold font-headline tracking-tight text-slate-800 dark:text-slate-200">
              {navItems.find((item) => pathname.startsWith(item.href))?.label ?? 'Inventário Ágil'}
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
                <DropdownMenuItem asChild className="rounded-xl mx-1 text-red-600 focus:text-red-600 cursor-pointer">
                  <Link href="/">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </header>

          <main className="page-enter flex-1 relative z-10 px-4 py-8 sm:px-8 sm:py-10">
            <div className="mx-auto w-full max-w-full lg:max-w-[1600px]">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

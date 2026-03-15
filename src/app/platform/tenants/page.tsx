'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2,
    Users,
    ShieldCheck,
    ShieldBan,
    Crown,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    ChevronDown,
    LayoutGrid,
    List,
    Activity,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';


type Tenant = {
    id: string;
    name: string;
    slug: string;
    status: 'ACTIVE' | 'BLOCKED' | 'PENDING';
    plan: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';
    is_platform_owner: boolean;
    blocked_reason: string | null;
    blocked_at: string | null;
    created_at: string;
    user_count: string;
    last_user_created_at: string | null;
    subscription_status?: string;
};

const STATUS_CONFIG = {
    ACTIVE: {
        label: 'Ativo',
        icon: CheckCircle2,
        classes: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
    },
    PENDING: {
        label: 'Pendente',
        icon: Clock,
        classes: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
    },
    BLOCKED: {
        label: 'Bloqueado',
        icon: XCircle,
        classes: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
        dot: 'bg-red-500',
    },
};

const PLAN_CONFIG = {
    TRIAL: { label: 'Trial', color: 'text-slate-500' },
    STARTER: { label: 'Starter', color: 'text-blue-600' },
    PRO: { label: 'Pro', color: 'text-indigo-600' },
    ENTERPRISE: { label: 'Enterprise', color: 'text-violet-600' },
};

function statusIcon(status: Tenant['status']) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ACTIVE;
    const Icon = cfg.icon;
    return <Icon className="w-3.5 h-3.5" />;
}

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatsChart({ data, title, color }: { data: any[], title: string, color: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4" /> {title}
            </h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`color-${color}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94A3B8' }}
                            minTickGap={30}
                            tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94A3B8' }}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '16px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                backgroundColor: '#1E293B',
                                color: '#fff'
                            }}
                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            labelStyle={{ color: '#94A3B8', fontSize: '10px', marginBottom: '4px' }}
                            labelFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke={color}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#color-${color})`}
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function TenantCard({
    tenant,
    onStatusChange,
    onPlanChange,
}: {
    tenant: Tenant;
    onStatusChange: (id: string, status: Tenant['status'], reason?: string) => void;
    onPlanChange: (id: string, plan: Tenant['plan']) => void;
}) {
    const [showBlockForm, setShowBlockForm] = useState(false);
    const [blockReason, setBlockReason] = useState('');
    const [showPlanMenu, setShowPlanMenu] = useState(false);
    const statusCfg = STATUS_CONFIG[tenant.status] ?? STATUS_CONFIG.ACTIVE;

    return (
        <div className={cn(
            'relative group rounded-3xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden',
            tenant.is_platform_owner
                ? 'border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-400/30'
                : 'border-slate-200 dark:border-slate-800'
        )}>
            {/* Top accent line */}
            <div className={cn(
                'h-1 w-full',
                tenant.is_platform_owner ? 'bg-gradient-to-r from-indigo-500 to-violet-500' :
                    tenant.status === 'ACTIVE' ? 'bg-emerald-400' :
                        tenant.status === 'BLOCKED' ? 'bg-red-400' : 'bg-amber-400'
            )} />

            <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                            'flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm',
                            tenant.is_platform_owner
                                ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                                : 'bg-gradient-to-br from-slate-500 to-slate-700'
                        )}>
                            {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{tenant.name}</h3>
                                {tenant.is_platform_owner && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                                        <Crown className="w-3 h-3" /> Plataforma
                                    </span>
                                )}
                                {tenant.subscription_status && !tenant.is_platform_owner && (
                                    <span className={cn(
                                        "flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border",
                                        tenant.subscription_status === 'ACTIVE'
                                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                            : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                                    )}>
                                        {tenant.subscription_status === 'ACTIVE' ? 'PAGO' : 'AGUARD. PAGTO'}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">/{tenant.slug}</p>
                        </div>
                    </div>

                    <span className={cn(
                        'flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border',
                        statusCfg.classes
                    )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', statusCfg.dot)} />
                        {statusCfg.label}
                    </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3">
                    <div className="text-center">
                        <p className="text-xs text-slate-400">Usuários</p>
                        <p className="font-black text-slate-900 dark:text-white text-lg">{tenant.user_count}</p>
                    </div>
                    <div className="text-center border-x border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-400">Plano</p>
                        <p className={cn('font-bold text-sm', PLAN_CONFIG[tenant.plan]?.color ?? 'text-slate-600')}>
                            {PLAN_CONFIG[tenant.plan]?.label ?? tenant.plan}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-slate-400">Desde</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{formatDate(tenant.created_at)}</p>
                    </div>
                </div>

                {/* Blocked reason */}
                {tenant.status === 'BLOCKED' && tenant.blocked_reason && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600 dark:text-red-400">{tenant.blocked_reason}</p>
                    </div>
                )}

                {/* Block form */}
                {showBlockForm && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <input
                            type="text"
                            placeholder="Motivo do bloqueio (opcional)"
                            value={blockReason}
                            onChange={e => setBlockReason(e.target.value)}
                            className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { onStatusChange(tenant.id, 'BLOCKED', blockReason); setShowBlockForm(false); }}
                                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors"
                            >
                                Confirmar Bloqueio
                            </button>
                            <button
                                onClick={() => setShowBlockForm(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Actions */}
                {!tenant.is_platform_owner && !showBlockForm && (
                    <div className="flex gap-2 pt-1">
                        {tenant.status !== 'ACTIVE' && (
                            <button
                                onClick={() => onStatusChange(tenant.id, 'ACTIVE')}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                            >
                                <ShieldCheck className="w-3.5 h-3.5" /> Ativar
                            </button>
                        )}
                        {tenant.status !== 'BLOCKED' && (
                            <button
                                onClick={() => setShowBlockForm(true)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                            >
                                <ShieldBan className="w-3.5 h-3.5" /> Bloquear
                            </button>
                        )}
                        {/* Plan changer */}
                        <div className="relative">
                            <button
                                onClick={() => setShowPlanMenu(p => !p)}
                                className="h-full px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                                Plano <ChevronDown className="w-3 h-3" />
                            </button>
                            {showPlanMenu && (
                                <div className="absolute bottom-full mb-1 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden min-w-[120px]">
                                    {(['TRIAL', 'STARTER', 'PRO', 'ENTERPRISE'] as Tenant['plan'][]).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => { onPlanChange(tenant.id, p); setShowPlanMenu(false); }}
                                            className={cn(
                                                'w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
                                                PLAN_CONFIG[p]?.color ?? 'text-slate-600',
                                                tenant.plan === p && 'bg-slate-50 dark:bg-slate-800'
                                            )}
                                        >
                                            {PLAN_CONFIG[p]?.label ?? p}
                                            {tenant.plan === p && ' ✓'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PlatformTenantsPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [refreshing, setRefreshing] = useState(false);
    const [showDashboard, setShowDashboard] = useState(true);
    const [statsData, setStatsData] = useState<{ tenantGrowth: any[], userGrowth: any[] } | null>(null);

    const [notLoggedIn, setNotLoggedIn] = useState(false);

    const fetchTenants = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/platform/tenants');
            if (res.status === 401) {
                // Not logged in — redirect to login
                setNotLoggedIn(true);
                return;
            }
            if (!res.ok) {
                const d = await res.json();
                setError(d.message ?? 'Erro ao carregar tenants');
                return;
            }
            const data = await res.json();
            setTenants(data.tenants);
            if (data.stats) {
                setStatsData(data.stats);
            }
            setError('');

        } catch {
            setError('Erro de conexão ao carregar tenants');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchTenants(); }, [fetchTenants]);

    // Redirect if not logged in
    useEffect(() => {
        if (notLoggedIn) {
            router.replace('/platform-login?redirect=/platform/tenants');
        }
    }, [notLoggedIn, router]);


    const handleStatusChange = async (tenantId: string, status: Tenant['status'], reason?: string) => {
        const res = await fetch('/api/platform/tenants', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId, status, blockedReason: reason }),
        });
        if (res.ok) {
            setTenants(prev => prev.map(t => t.id === tenantId
                ? { ...t, status, blocked_reason: reason ?? null, blocked_at: status === 'BLOCKED' ? new Date().toISOString() : null }
                : t
            ));
        }
    };

    const handlePlanChange = async (tenantId: string, plan: Tenant['plan']) => {
        const res = await fetch('/api/platform/tenants', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId, status: tenants.find(t => t.id === tenantId)?.status, plan }),
        });
        if (res.ok) {
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, plan } : t));
        }
    };

    const filtered = tenants.filter(t => {
        const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
        return matchSearch && matchStatus;
    });

    // Summary stats
    const stats = {
        total: tenants.length,
        active: tenants.filter(t => t.status === 'ACTIVE').length,
        pending: tenants.filter(t => t.status === 'PENDING').length,
        blocked: tenants.filter(t => t.status === 'BLOCKED').length,
    };

    if (loading || notLoggedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mx-auto" />
                    <p className="text-slate-500">Carregando painel...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen p-6">
                <div className="max-w-md w-full text-center space-y-4 p-8 rounded-3xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <ShieldBan className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Acesso Negado</h2>
                    <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
                    <p className="text-xs text-slate-500">Este painel é exclusivo para administradores da plataforma Black Tower X.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                            <Crown className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Super Admin</h1>
                            <p className="text-[11px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold">Black Tower X Platform</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowDashboard(!showDashboard)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all",
                                showDashboard
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300"
                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                        >
                            <Activity className="w-4 h-4" />
                            Dashboard
                        </button>
                        <button
                            onClick={fetchTenants}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                            Atualizar
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Dashboard Charts */}
                {showDashboard && statsData && (
                    <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <StatsChart
                            title="Novas Empresas (30 dias)"
                            data={statsData.tenantGrowth}
                            color="#6366f1"
                        />
                        <StatsChart
                            title="Novos Usuários (30 dias)"
                            data={statsData.userGrowth}
                            color="#10b981"
                        />
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total', value: stats.total, icon: Building2, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800' },
                        { label: 'Ativos', value: stats.active, icon: Activity, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                        { label: 'Pendentes', value: stats.pending, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                        { label: 'Bloqueados', value: stats.blocked, icon: ShieldBan, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                    ].map(s => (
                        <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                                <s.icon className={cn('w-5 h-5', s.color)} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
                                <p className="text-xs text-slate-400">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar empresa ou slug..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['ALL', 'ACTIVE', 'PENDING', 'BLOCKED'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={cn(
                                    'px-3 py-2 rounded-xl text-xs font-bold border transition-colors',
                                    filterStatus === s
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                )}
                            >
                                {s === 'ALL' ? 'Todos' : STATUS_CONFIG[s]?.label ?? s}
                            </button>
                        ))}
                        <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn('px-3 py-2 transition-colors', viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800')}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn('px-3 py-2 transition-colors', viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800')}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results count */}
                <p className="text-sm text-slate-500">
                    Mostrando <strong className="text-slate-700 dark:text-slate-300">{filtered.length}</strong> de <strong className="text-slate-700 dark:text-slate-300">{tenants.length}</strong> empresas
                </p>

                {/* Grid/List */}
                {viewMode === 'grid' ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map(tenant => (
                            <TenantCard
                                key={tenant.id}
                                tenant={tenant}
                                onStatusChange={handleStatusChange}
                                onPlanChange={handlePlanChange}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(tenant => {
                            const statusCfg = STATUS_CONFIG[tenant.status] ?? STATUS_CONFIG.ACTIVE;
                            return (
                                <div key={tenant.id} className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition-shadow">
                                    <div className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm flex-shrink-0',
                                        tenant.is_platform_owner ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-gradient-to-br from-slate-500 to-slate-700'
                                    )}>
                                        {tenant.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white truncate">{tenant.name}</span>
                                            {tenant.is_platform_owner && <Crown className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />}
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono">/{tenant.slug}</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="text-xs text-slate-400 hidden md:block"><Users className="w-3 h-3 inline mr-1" />{tenant.user_count}</span>
                                        <span className={cn('text-xs font-bold', PLAN_CONFIG[tenant.plan]?.color ?? 'text-slate-500')}>{PLAN_CONFIG[tenant.plan]?.label ?? tenant.plan}</span>
                                        <span className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border', statusCfg.classes)}>
                                            {statusIcon(tenant.status)} {statusCfg.label}
                                        </span>
                                        {!tenant.is_platform_owner && (
                                            <div className="flex gap-1">
                                                {tenant.status !== 'ACTIVE' && (
                                                    <button onClick={() => handleStatusChange(tenant.id, 'ACTIVE')}
                                                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 transition-colors">
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {tenant.status !== 'BLOCKED' && (
                                                    <button onClick={() => handleStatusChange(tenant.id, 'BLOCKED')}
                                                        className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors">
                                                        <ShieldBan className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {filtered.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="font-semibold">Nenhuma empresa encontrada</p>
                        <p className="text-sm">Tente ajustar os filtros de busca.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

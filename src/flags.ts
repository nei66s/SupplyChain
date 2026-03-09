import { flag } from '@vercel/flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

// Flag para habilitar recursos de IA (como análise de estoque inteligente)
export const aiInsightsFlag = flag({
    key: 'ai-insights',
    adapter: vercelAdapter(),
});

// Flag para o novo módulo preditivo (análise de demanda)
export const predictiveModuleFlag = flag({
    key: 'predictive-module',
    adapter: vercelAdapter(),
});

// Flag para testar uma nova versão do Dashboard (Glassmorphism)
export const dashboardV2Flag = flag({
    key: 'dashboard-v2',
    adapter: vercelAdapter(),
});

// Flag para manutenção ou "Modo Leitura" do sistema
export const maintenanceModeFlag = flag({
    key: 'maintenance-mode',
    adapter: vercelAdapter(),
});

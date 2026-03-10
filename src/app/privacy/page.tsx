import { LegalLayout } from '@/components/landing/LegalLayout';

export default function PrivacyPage() {
    return (
        <LegalLayout title="Política de Privacidade">
            <p className="text-sm text-slate-500 mb-8">Última atualização: 10 de Março de 2026</p>

            <section className="space-y-6">
                <p>
                    A <strong>Black Tower X</strong>, desenvolvedora do <strong>Inventário Ágil</strong>, assume o compromisso inabalável com a proteção dos dados e a privacidade dos seus usuários. Esta política detalha como tratamos suas informações conforme as diretrizes da <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.
                </p>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">1. Coleta de Informações</h2>
                <p>Coletamos dados necessários para a prestação do serviço logístico:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Dados de Conta:</strong> Nome, e-mail corporativo e cargo dos usuários.</li>
                    <li><strong>Dados da Empresa:</strong> CNPJ, razão social e endereço operacional.</li>
                    <li><strong>Dados Operacionais:</strong> Registros de inventário, pedidos e movimentações de estoque inseridos por você na plataforma.</li>
                </ul>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">2. Finalidade do Tratamento</h2>
                <p>Seus dados são utilizados exclusivamente para:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Garantir a operação segura e eficiente do seu armazém.</li>
                    <li>Gerar relatórios de inteligência operacional e auditoria.</li>
                    <li>Notificações críticas do sistema (ex: estoque baixo).</li>
                    <li>Melhoria contínua dos nossos algoritmos de IA (utilizando dados agregados e anonimizados, sem expor sua vantagem competitiva).</li>
                </ul>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">3. Isolamento e Compartilhamento</h2>
                <p>
                    <strong>Isolamento Total:</strong> No Inventário Ágil, os dados da sua empresa são mantidos em silos lógicos isolados por Row-Level Security (RLS). Nenhum outro cliente da plataforma tem acesso às suas informações.
                </p>
                <p>
                    Não comercializamos seus dados. O compartilhamento ocorre apenas com subprocessadores indispensáveis (ex: provedores de infraestrutura como Vercel/PostgreSQL) que cumprem rigorosos padrões de segurança.
                </p>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">4. Direitos do Titular (LGPD)</h2>
                <p>Você possui direitos garantidos por lei, incluindo:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Confirmação da existência de tratamento e acesso aos dados.</li>
                    <li>Correção de dados incompletos ou desatualizados.</li>
                    <li>Eliminação de dados pessoais desnecessários.</li>
                    <li>Portabilidade dos dados para outro fornecedor de serviço.</li>
                </ul>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">5. Retenção de Dados</h2>
                <p>
                    Mantemos seus dados pelo período em que sua conta estiver ativa ou conforme necessário para cumprir obrigações legais ou fiscais. Após o encerramento do contrato, os dados operacionais são excluídos de nossos servidores de produção em até 30 dias.
                </p>

                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mt-10 text-sm text-slate-600 dark:text-slate-400">
                    Questões sobre privacidade? Fale com nosso DPO (Data Protection Officer) em: <a href="mailto:privacy@blacktowerx.com.br" className="text-indigo-600 hover:underline">privacy@blacktowerx.com.br</a>.
                </div>
            </section>
        </LegalLayout>

    );
}

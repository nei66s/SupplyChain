import { LegalLayout } from '@/components/landing/LegalLayout';

export default function TermsPage() {
    return (
        <LegalLayout title="Termos de Uso">
            <p className="text-sm text-slate-500 mb-8">Última atualização: 10 de Março de 2026</p>

            <section className="space-y-6">
                <p>
                    Bem-vindo ao <strong>Inventário Ágil</strong>. Este documento estabelece os termos e condições que regem o uso da plataforma SaaS desenvolvida e operada pela <strong>Black Tower X</strong>.
                </p>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">1. Aceitação e Elegibilidade</h2>
                <p>
                    Ao realizar o cadastro e utilizar nossos serviços, você declara ter capacidade legal e autoridade para vincular a entidade (empresa) que representa a estes termos. O uso da plataforma implica na aceitação plena e sem reservas de todas as cláusulas aqui descritas.
                </p>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">2. Descrição do Modelo SaaS</h2>
                <p>
                    O Inventário Ágil é um software como serviço (SaaS) de gestão logística. A Black Tower X concede a você uma licença limitada, não exclusiva e revogável para acessar a plataforma via internet. Não há transferência de propriedade intelectual ou entrega de código-fonte.
                </p>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">3. Contas e Segurança</h2>
                <p>
                    O acesso é realizado através de subdomínios ou namespaces isolados (multi-tenancy). É sua responsabilidade:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Manter a confidencialidade das senhas de todos os usuários da sua organização.</li>
                    <li>Notificar imediatamente a Black Tower X sobre qualquer uso não autorizado ou quebra de segurança.</li>
                    <li>Garantir que os dados inseridos são verídicos e de sua propriedade ou devidamente licenciados.</li>
                </ul>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">4. Planos, Faturamento e Suspensão</h2>
                <p>
                    O uso de certas funcionalidades depende da assinatura de um plano pago.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Inadimplência:</strong> O atraso no pagamento superior a 7 dias poderá resultar na suspensão temporária do acesso.</li>
                    <li><strong>Cancelamento:</strong> Você pode cancelar sua assinatura a qualquer momento, mantendo o acesso até o fim do período já pago.</li>
                    <li><strong>Bloqueio Administrativo:</strong> A Black Tower X reserva-se o direito de bloquear contas que violem regras de uso ou apresentem comportamento suspeito.</li>
                </ul>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">5. Nível de Serviço (SLA)</h2>
                <p>
                    Esforçamo-nos para manter uma disponibilidade de 99,9%. No entanto, paradas para manutenção programada ou falhas em provedores de infraestrutura terceirizados (como nuvem pública) não são contabilizadas como indisponibilidade.
                </p>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">6. Limitação de Responsabilidade</h2>
                <p>
                    A Black Tower X não será responsável por perdas de lucro, interrupção de negócios ou perda de dados decorrentes de mau uso da plataforma ou decisões gerenciais baseadas nos indicadores fornecidos pelo sistema. O software é uma ferramenta de auxílio, e a decisão final operacional é sempre do usuário humano.
                </p>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-8">7. Modificações</h2>
                <p>
                    Estes termos podem ser atualizados periodicamente. Alterações significativas serão comunicadas através do painel de controle ou e-mail cadastrado. O uso continuado após a alteração constitui aceitação dos novos termos.
                </p>

                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mt-10 text-sm text-slate-600 dark:text-slate-400">
                    Dúvidas sobre estes termos? Entre em contato com <a href="mailto:legal@blacktowerx.com.br" className="text-indigo-600 hover:underline">legal@blacktowerx.com.br</a>.
                </div>
            </section>
        </LegalLayout>

    );
}

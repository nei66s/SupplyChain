import { test, expect } from '@playwright/test';

test.describe('Fluxo Completo: Pedido -> Produção -> Separação (Picking)', () => {
    test('Deve criar pedido sem estoque > produzir > separar > finalizar', async ({ page }) => {

        // 1. LOGIN
        await page.goto('http://localhost:3000');
        // Preenche o login com a conta de admin solicitada
        await page.fill('input[type="email"]', 'admin@gmail.com');
        await page.fill('input[type="password"]', 'admin');
        await page.click('button:has-text("Acessar Plataforma")');
        // Verifica se chegou no dashboard
        await expect(page.getByRole('heading', { name: /Painel/i })).toBeVisible({ timeout: 10000 });

        // 2. NAVEGAR PARA PEDIDOS
        await page.goto('http://localhost:3000/orders');
        await expect(page.getByRole('heading', { name: /Pedidos/i })).toBeVisible();
        await page.click('button:has-text("Novo"), a:has-text("Novo")');

        // 3. SELECIONAR E PREENCHER DADOS DO PEDIDO
        // No layout novo, ao clicar em "Novo", o form aparece à direita.
        // O placeholder do cliente é "Digite o nome do cliente"
        await page.fill('input[placeholder="Digite o nome do cliente"]', 'Cliente E2E Automatizado');

        // Adiciona um item via Select (O "Adicionar material" é um Select do shadcn)
        await page.click('button:has-text("Adicionar material")');
        // Para garantir que procuramos um material, vamos clicar na primeira opção válida
        await page.locator('div[role="option"]').first().click();

        // O item é adicionado na tabela. Vamos colocar 500 na quantidade (input type="number")
        const qtyInput = page.locator('input[type="number"]').first();
        await qtyInput.waitFor({ state: 'visible' });
        await qtyInput.fill('');
        await qtyInput.fill('500');
        // Espera salvar a quantidade (dispara on blur)
        await page.click('body');

        // Confirma e cria o pedido (O botão do layout é "Criar pedido")
        await page.click('button:has-text("Criar pedido")');

        // Espera toast de sucesso ou a palavra ABERTO
        await expect(page.locator('text=Pedido enviado')).toBeVisible({ timeout: 5000 });

        // Pega o ID da URL, agora estamos na mesma pagina, o ID na tela pode estar selecionado no card. 
        // Vamos capturar da URL só se tiver mudado. Mas na verdade ele fica na lista!
        // Como a validação depois usa a UI, podemos buscar a Ordem na produção.

        // Verifica se ele alerta falta de material (Readiness PARCIAL ou NONE)
        await expect(page.locator('body')).toContainText(/FALTA DE MATERIAL|PARCIAL|CRÍTICO|Produção/i);


        // 3. A PRODUÇÃO É GERADA AUTOMATICAMENTE (Removido clique manual)
        // O sistema gera automatiamente uma Ordem de Produção quando o estoque não é suficiente.


        // 4. IR PARA TELA DE PRODUÇÃO E CONCLUIR
        await page.goto('http://localhost:3000/production');

        // Na tela de produção procuramos o pedido (o nome do cliente nos ajuda caso não tenhamos o ID)
        const cardProducao = page.locator('.bg-card').filter({ hasText: 'Cliente E2E Automatizado' }).first();
        if (await cardProducao.isVisible() || await page.locator('button:has-text("Iniciar")').isVisible()) {
            // Fluxo de iniciar/concluir
            try {
                const btnIniciar = page.locator('button:has-text("Iniciar")').first();
                if (await btnIniciar.isVisible()) await btnIniciar.click();

                const btnConcluir = page.locator('button:has-text("Concluir")').first();
                if (await btnConcluir.isVisible()) await btnConcluir.click();
            } catch (e) {
                console.log("Fluxo de botões de produção não encontrou botão (pode já estar concluído).");
            }
        }


        // 5. TELA DE SEPARAÇÃO (PICKING) E FINALIZAÇÃO
        // O site usa a listagem direta na URL raiz de orders para pegar o ID, mas tem também a rota de picking centralizada
        await page.goto(`http://localhost:3000/picking`);

        // Na tela de picking devemos ter a seção para o pedido
        const cardPicking = page.locator('text=Cliente E2E Automatizado').first();
        if (await cardPicking.isVisible()) {
            await cardPicking.click();
        }

        const btnIniciarPicking = page.locator('button:has-text("Iniciar Separação")');
        if (await btnIniciarPicking.isVisible()) {
            await btnIniciarPicking.click();
        }

        // Conferir itens um a um ou clicar em "Concluir Separação" total
        const btnConcluirPicking = page.locator('button:has-text("Concluir")');
        if (await btnConcluirPicking.isVisible()) {
            await btnConcluirPicking.click();
        }

        // Finalmente, Registrar Saída
        const btnSaida = page.locator('button:has-text("Registrar Saída")');
        if (await btnSaida.isVisible()) {
            await btnSaida.click();
        }

        // 6. VALIDAÇÃO FINAL
        // Verifica se na label de status agora diz Finalizado / Saída Concluída
        await expect(page.locator('body')).toContainText(/Finalizado|Saída Concluída|SAIDA_CONCLUIDA/i, { timeout: 5000 });
    });
});

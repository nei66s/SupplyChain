# 🚀 SaaS Handbook: Black Tower X - Inventário Ágil

Este manual documenta as implementações de infraestrutura SaaS e marketing realizadas para o lançamento da plataforma corporativa.

---

## 🏗️ 1. Arquitetura da Landing Page
A landing page foi desenvolvida com foco em conversão e estética premium, utilizando **Next.js**, **Tailwind CSS** e **Lucide React**.

### Principais Componentes:
- `LandingHeader`: Navegação fixa com efeito de Glassmorphism ao rolar.
- `LandingHero`: Proposta de valor central com preview visual do dashboard.
- `LandingFeatures`: Destaques tecnológicos (Real-time, IA, QR Code).
- `LandingPricing`: Card de preço fixo (R$ 300/mês) com comparativo de valor.
- `LandingFooter`: Links institucionais, redes sociais e branding oficial.

---

## 🎨 2. Sistema de Branding & Identidade
A identidade visual é dinâmica e gerenciada tanto por código quanto por banco de dados.

### Como atualizar a marca:
1.  **Banco de Dados:** A tabela `site_settings` armazena o `company_name`, `platform_label` e `logo_url`.
2.  **Hooks React:** O hook `useSiteBranding()` centraliza o acesso a essas informações em toda a aplicação.
3.  **Fallback:** Definido em `src/hooks/use-site-branding.ts` como "Black Tower X" e "Inventário Ágil".

---

## 🛡️ 3. Páginas Institucionais & Legais
Para conformidade e autoridade, as seguintes rotas foram implementadas:
- `/roadmap`: Visão pública da evolução do produto.
- `/security`: Documentação das medidas de proteção de dados e LGPD.
- `/terms`: Termos de uso (Placeholder para revisão jurídica).
- `/privacy`: Política de privacidade (Conforme LGPD).

---

## ⚙️ 4. SEO & Metadados
Configurados no `src/app/layout.tsx` para garantir visibilidade em buscadores e redes sociais:
- Títulos e descrições otimizados.
- OpenGraph e Twitter Cards configurados com imagens de preview.
- Favicon e manifestos de app instalável (PWA).

---

## 🛠️ 5. Scripts de Manutenção
Localizados em `./scripts/`:
- `fix-branding-db.js`: Corrige o nome da empresa no banco.
- `fix-logo-db.js`: Atualiza a URL do logo no banco.
- `fix-label-db.js`: Padroniza o rótulo da plataforma.

---

## 📈 6. Próximos Passos Técnicos
Consulte o arquivo `docs/ROADMAP_TASKS.md` para a lista detalhada de tarefas de desenvolvimento pendentes.

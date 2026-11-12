# Meus Gastos

Painel pessoal de gastos que lê o Itaú pelo Open Finance (Meu Pluggy). **Somente leitura**: o app não consegue mexer no seu dinheiro.

## Como funciona
- `public/` é o site (HTML, CSS e JS, sem bibliotecas externas).
- `api/` são as funções do servidor. Só elas falam com a Pluggy e com o seu login.
- As chaves da Pluggy ficam **apenas** nas variáveis de ambiente da Vercel. Nunca no código.

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Nome | O que é |
|---|---|
| `APP_PASSWORD` | A senha que você digita para entrar (mínimo 8 caracteres) |
| `SESSION_SECRET` | Texto aleatório longo (mínimo 32 caracteres), usado para assinar o login |
| `PLUGGY_CLIENT_ID` | Client ID da sua aplicação no dashboard da Pluggy |
| `PLUGGY_CLIENT_SECRET` | Client Secret da sua aplicação (guarde só aqui) |
| `PLUGGY_ITEM_IDS` | itemId do Itaú no Meu Pluggy (vários, separados por vírgula) |
| `DEMO` | Opcional. `1` mostra dados fictícios, sem ler o banco |

Para gerar o `SESSION_SECRET` no Mac, abra o Terminal e rode: `openssl rand -hex 32`

## Sincronizar entre celular e Mac (opcional)
Lançamentos em dinheiro, categorias que você corrigiu e metas ficam, por padrão, só no aparelho onde você os criou.
Para sincronizar, na Vercel vá em **Storage** e adicione o **Upstash Redis** (plano gratuito). Ele cria sozinho as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN`. Depois, faça um novo deploy.

## Testar no seu computador
`node scripts/dev-server.js` abre em http://localhost:3000 em modo demonstração (senha: `demo-1234`).

## Renovar a autorização
O Open Finance expira em 12 meses. O app avisa 30 dias antes. Para renovar, entre no Meu Pluggy e autorize o Itaú de novo.

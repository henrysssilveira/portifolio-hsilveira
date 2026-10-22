# Cloudflare Worker — Formulário de Contato do Portfólio

Worker responsável por receber `POST /contact` do portfólio de **Henrique Silveira**, validar e sanitizar os dados, aplicar *rate limiting* por IP via Cloudflare KV e disparar o e-mail via **Resend API**.

---

## Passo a passo de configuração e deploy

### 1. Instalar dependências e autenticar no Cloudflare

```bash
cd worker
npm install
npx wrangler login
```

### 2. Criar o namespace KV para Rate Limiting

```bash
npx wrangler kv namespace create RATE_LIMIT
npx wrangler kv namespace create RATE_LIMIT --preview
```

Copie os valores de `id` e `preview_id` retornados no terminal e atualize o bloco `[[kv_namespaces]]` em `worker/wrangler.toml`.

### 3. Configurar variáveis e segredos (Secrets)

Edite a seção `[vars]` em `worker/wrangler.toml` com seu domínio e e-mails reais:

- `ALLOWED_ORIGIN`: domínio do portfólio (ex.: `https://hsilveira.com.br`). Requisições `http://localhost:*` já são aceitas automaticamente em desenvolvimento.
- `TO_EMAIL`: seu e-mail que receberá as mensagens.
- `FROM_EMAIL`: remetente verificado no Resend (ex.: `Contato <contato@seudominio.com.br>`).

Cadastre sua chave da API do Resend como secret (nunca no código):

```bash
npx wrangler secret put RESEND_API_KEY
```

*(Opcional)* Caso deseje ativar verificação de Cloudflare Turnstile no servidor:

```bash
npx wrangler secret put TURNSTILE_SECRET
```

### 4. Rodar localmente (`wrangler dev`)

Para testar localmente na porta `8787`:

```bash
npx wrangler dev
```

Para desenvolvimento local, crie um arquivo `worker/.dev.vars` (não versionado) com:

```env
RESEND_API_KEY=re_sua_chave_aqui
```

### 5. Fazer deploy para produção

```bash
npx wrangler deploy
```

Após o deploy, defina a URL gerada na variável `VITE_CONTACT_ENDPOINT` do arquivo `.env` na raiz do frontend.

---

## Exemplo de teste com `curl`

```bash
curl -i -X POST http://localhost:8787/contact \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "name": "Henrique Silveira",
    "email": "henrique@exemplo.com",
    "subject": "Novo projeto web e automação",
    "message": "Olá! Gostaria de conversar sobre o desenvolvimento de um novo sistema integrado.",
    "honeypot": ""
  }'
```

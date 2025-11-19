# 🤖 Configuração do Agente n8n

## 📋 Resumo das Correções

### ✅ Problema Resolvido: Mensagens não enviavam

**Causa:** As funções `ensureChatExists` e `persistMessage` estavam propagando erros com `throw`, bloqueando o fluxo antes de chegar no n8n.

**Solução:** Removido `throw error` dessas funções. Agora os erros são apenas logados, permitindo que o fluxo continue.

---

## 🔧 Configuração Atual

### 1. Webhook Principal (Respostas do Chat)

```env
NUXT_PUBLIC_N8N_WEBHOOK_URL=https://skoobiedigital.app.n8n.cloud/webhook/bubble-streaming
```

**O que faz:**

- Recebe mensagens do usuário
- Processa com IA/lógica do n8n
- Retorna resposta em streaming (JSON lines)
- Formato esperado: `{"type":"item","content":"texto..."}`

### 2. Webhook de Título (Opcional)

```env
NUXT_PUBLIC_N8N_TITLE_WEBHOOK_URL=https://skoobiedigital.app.n8n.cloud/webhook/generate-title
```

**O que faz:**

- Recebe primeira mensagem do usuário
- Gera título inteligente (máx 50 caracteres)
- Retorna JSON com título

---

## 📡 Configuração do Webhook de Título no n8n

### Workflow Sugerido:

```
┌──────────────┐
│   Webhook    │ ← POST /webhook/generate-title
│   (Trigger)  │   Body: { "chatId": "...", "message": "..." }
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  OpenAI/LLM  │ ← Prompt: "Gere um título curto (max 50 chars)
│    Node      │           para esta mensagem: {message}"
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Function   │ ← Limita texto a 50 caracteres
│     Node     │   Código: return items[0].json.title.substring(0, 50)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Respond    │ → Retorna: { "title": "..." }
│  Webhook     │
└──────────────┘
```

### Exemplo de Configuração:

#### 1. Webhook Trigger

```json
{
  "httpMethod": "POST",
  "path": "/generate-title",
  "responseMode": "responseNode"
}
```

#### 2. OpenAI Node (ou qualquer LLM)

```json
{
  "operation": "text",
  "model": "gpt-4o-mini",
  "messages": {
    "values": [
      {
        "role": "system",
        "content": "Você é um especialista em criar títulos curtos e descritivos. Gere um título de NO MÁXIMO 50 caracteres que resuma a mensagem do usuário. Não use pontuação no final. Seja direto e conciso."
      },
      {
        "role": "user",
        "content": "={{ $json.message }}"
      }
    ]
  }
}
```

#### 3. Function Node (Limitar caracteres)

```javascript
const title = items[0].json.choices[0].message.content.trim();
const limitedTitle = title.length > 50 ? title.substring(0, 47) + "..." : title;

return [
  {
    json: {
      title: limitedTitle,
    },
  },
];
```

#### 4. Respond to Webhook

```json
{
  "respondWith": "json",
  "responseBody": "={{ $json }}"
}
```

---

## 🔄 Fluxo Completo

### Quando usuário envia primeira mensagem:

```
1. Frontend (useN8nChat.ts)
   │
   ├─► ensureChatExists(chatId)
   │   └─► POST /api/chats { id: chatId }
   │       └─► Cria chat no Supabase ✅
   │
   ├─► persistMessage(chatId, 'user', parts)
   │   └─► POST /api/chats/{chatId}/messages
   │       └─► Salva mensagem user no Supabase ✅
   │
   ├─► fetch(n8nWebhookUrl, { chatId, message })
   │   └─► n8n processa e retorna streaming ✅
   │
   ├─► persistMessage(chatId, 'assistant', parts)
   │   └─► POST /api/chats/{chatId}/messages
   │       └─► Salva resposta no Supabase ✅
   │
   └─► generateChatTitle(chatId, firstMessage)
       │
       ├─► (Se NUXT_PUBLIC_N8N_TITLE_WEBHOOK_URL configurado)
       │   └─► fetch(n8nTitleUrl, { chatId, message })
       │       └─► n8n gera título inteligente ✅
       │
       └─► POST /api/chats/{chatId}/title { title }
           └─► Salva título no Supabase ✅
```

---

## 🧪 Teste

### 1. Testar sem webhook de título (título simples):

```bash
# Não configure NUXT_PUBLIC_N8N_TITLE_WEBHOOK_URL
npm run dev
```

**Resultado:** Usará primeiros 50 caracteres da mensagem como título

### 2. Testar com webhook de título (título inteligente):

```bash
# Configure no .env
NUXT_PUBLIC_N8N_TITLE_WEBHOOK_URL=https://skoobiedigital.app.n8n.cloud/webhook/generate-title

npm run dev
```

**Resultado:** n8n gerará título inteligente

### 3. Verificar logs no console do navegador:

```
[ensureChatExists] Verificando/criando chat chat_123...
[ensureChatExists] Chat chat_123 OK
[persistMessage] Salvando mensagem user para chat chat_123
[persistMessage] Mensagem user salva com sucesso
[persistMessage] Salvando mensagem assistant para chat chat_123
[persistMessage] Mensagem assistant salva com sucesso
[generateChatTitle] Gerando título para chat chat_123
[generateChatTitle] Chamando n8n para gerar título inteligente
[generateChatTitle] Título gerado pelo n8n: "Como configurar n8n"
[generateChatTitle] Título salvo com sucesso
```

---

## ⚠️ Troubleshooting

### Mensagens não aparecem no banco

- ✅ Verifique logs: `[persistMessage] ERRO ao salvar mensagem`
- ✅ Confirme que chat foi criado: `[ensureChatExists] Chat OK`
- ✅ Verifique `DATABASE_URL` no `.env`

### Título não é gerado

- ✅ Verifique se é a primeira mensagem (contador = 3: welcome + user + assistant)
- ✅ Verifique logs: `[generateChatTitle]`
- ✅ Se usar n8n: teste webhook manualmente com curl

### n8n não responde

- ✅ Verifique `NUXT_PUBLIC_N8N_WEBHOOK_URL`
- ✅ Teste webhook: `curl -X POST url -H "Content-Type: application/json" -d '{"chatId":"test","message":"oi"}'`
- ✅ Confirme que n8n retorna JSON lines: `{"type":"item","content":"..."}`

---

## 📝 Exemplo de .env

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# n8n Webhooks
NUXT_PUBLIC_N8N_WEBHOOK_URL=https://skoobiedigital.app.n8n.cloud/webhook/bubble-streaming
NUXT_PUBLIC_N8N_TITLE_WEBHOOK_URL=https://skoobiedigital.app.n8n.cloud/webhook/generate-title

# Opcional: Token para autenticação
N8N_WEBHOOK_TOKEN=seu_token_secreto
```

---

## ✅ Checklist de Configuração

- [ ] `DATABASE_URL` configurado e testado
- [ ] `NUXT_PUBLIC_N8N_WEBHOOK_URL` apontando para webhook principal
- [ ] Webhook n8n retornando formato correto (JSON lines)
- [ ] (Opcional) `NUXT_PUBLIC_N8N_TITLE_WEBHOOK_URL` configurado
- [ ] (Opcional) Workflow de título criado no n8n
- [ ] Migrations do banco aplicadas: `npm run db:migrate`
- [ ] Console do navegador mostrando logs corretos

---

## 🎯 Resultado Final

✅ Mensagens enviadas são salvas no Supabase  
✅ n8n processa e retorna respostas  
✅ Respostas são salvas no Supabase  
✅ Título é gerado (simples ou via n8n)  
✅ Título é salvo no Supabase  
✅ Interface atualiza em tempo real

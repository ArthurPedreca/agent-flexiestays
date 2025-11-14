# Flexiestays AI Agent Integration

Sistema de agente de IA para reservas de hospedagem integrado com n8n e Nuxt.

## 🚀 Quick Start

### 1. Configurar Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione:

```env
# n8n Integration
NUXT_PUBLIC_N8N_WEBHOOK_URL=https://seu-n8n-instance.com/webhook/flexiestays-agent
N8N_WEBHOOK_TOKEN=seu_token_secreto_aqui
```

### 2. Configurar o Fluxo n8n

Siga o guia completo em [`N8N_INTEGRATION_GUIDE.md`](./N8N_INTEGRATION_GUIDE.md)

**Ajustes CRÍTICOS:**
- ❌ Remover o nó "Respond to Webhook"
- ✅ Conectar o Booking Agent ao switch
- ✅ Garantir que a resposta seja JSON válido

### 3. Instalar Dependências

```bash
pnpm install
```

### 4. Executar o Projeto

```bash
pnpm dev
```

Acesse: http://localhost:3000

---

## 🏗️ Arquitetura

### Frontend (Nuxt + Vue)
```
app/
├── pages/
│   └── chat/[id].vue          # Interface de chat principal
├── components/
│   └── tool/
│       ├── Carousel.vue        # Carrossel de propriedades
│       ├── ClickableProperties.vue  # Propriedades clicáveis
│       ├── Weather.vue         # Exemplo: Weather tool
│       └── Chart.vue           # Exemplo: Chart tool
```

### Backend (Nuxt Server API)
```
server/
└── api/
    └── chats/
        ├── [id].post.ts        # Endpoint OpenAI (padrão)
        └── [id].n8n.post.ts    # Endpoint n8n (agente Flexiestays)
```

### Fluxo de Dados

```
Usuário digita mensagem
    ↓
Frontend (chat/[id].vue)
    ↓
Backend (chats/[id].n8n.post.ts)
    ↓
Webhook n8n (Supervisor Agent)
    ├─→ Booking Agent (reservas)
    ├─→ Info Agent (informações)
    ├─→ Direct Response (saudações)
    └─→ Escalation (suporte humano)
    ↓
Humanizer Agent (torna natural)
    ↓
Parse Response Chunks (JSON estruturado)
    ↓
Backend recebe chunks
    ↓
Streaming para frontend
    ↓
Renderiza componentes (carousel, clickable, etc.)
```

---

## 🎨 Componentes de UI

### 1. **Carousel de Propriedades**
Exibe propriedades em um carrossel horizontal scrollável.

**Uso:**
```json
{
  "type": "carousel",
  "properties": [
    {
      "id": "prop-1",
      "name": "Beautiful Apt",
      "nickname": "Tower 8",
      "price": 175,
      "image": "https://..."
    }
  ]
}
```

**Features:**
- ✅ Scroll horizontal suave
- ✅ Botões de navegação
- ✅ Hover effects
- ✅ Responsive design
- ✅ Preço destacado

### 2. **Propriedades Clicáveis**
Transforma nomes de propriedades em elementos clicáveis.

**Uso:**
```json
{
  "type": "text",
  "text": "Temos [[Property 1]] e [[Property 2]] disponíveis.",
  "clickable_properties": ["Property 1", "Property 2"]
}
```

**Features:**
- ✅ Parsing automático de [[Nome]]
- ✅ Estilo destacado
- ✅ Ícone de propriedade
- ✅ Evento de clique

---

## 🔌 Integração n8n

### Estrutura do Webhook

**Endpoint:** `/webhook/flexiestays-agent`

**Método:** POST

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN (opcional)
```

**Body:**
```json
{
  "query": {
    "message": "mensagem do usuário",
    "sessionId": "unique-session-id",
    "chatId": "unique-chat-id"
  },
  "userId": "user-id",
  "username": "Nome do Usuário"
}
```

**Resposta Esperada:**
```json
[
  {
    "sequence": 1,
    "total_chunks": 2,
    "is_last": false,
    "delay": 0,
    "type": "text",
    "text": "Aqui estão algumas opções:"
  },
  {
    "sequence": 2,
    "total_chunks": 2,
    "is_last": true,
    "delay": 2,
    "type": "carousel",
    "properties": [...]
  }
]
```

---

## 🧪 Testando

### Teste Local

1. Configure o `.env` com URL do webhook
2. Execute `pnpm dev`
3. Crie um novo chat
4. Ative o toggle "n8n" na interface
5. Envie uma mensagem

### Teste do Webhook Diretamente

```bash
curl -X POST https://seu-n8n.com/webhook/flexiestays-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "query": {
      "message": "Quero reservar um quarto",
      "sessionId": "test-123",
      "chatId": "chat-123"
    },
    "userId": "user-1",
    "username": "Test User"
  }'
```

---

## 🎯 Features Implementadas

### ✅ Backend
- [x] Endpoint n8n com streaming
- [x] Processamento de chunks estruturados
- [x] Suporte a delays entre chunks
- [x] Autenticação com token (opcional)
- [x] Salvamento de mensagens no banco
- [x] Geração automática de título do chat

### ✅ Frontend
- [x] Toggle OpenAI / n8n
- [x] Streaming de mensagens
- [x] Componente Carousel
- [x] Componente Clickable Properties
- [x] Detecção de configuração do n8n
- [x] Notificações de troca de agente

### ✅ n8n
- [x] Supervisor Agent (roteador)
- [x] Info Agent (RAG com Supabase)
- [x] Direct Response Agent
- [x] Escalation handling
- [x] Humanizer Agent
- [x] Memória do usuário (Airtable)

---

## 📚 Documentação Adicional

- **[N8N_INTEGRATION_GUIDE.md](./N8N_INTEGRATION_GUIDE.md)** - Guia completo de configuração do n8n
- **[.env.example](./.env.example)** - Exemplo de variáveis de ambiente

---

## 🔧 Configurações Avançadas

### Personalizar Delay entre Palavras

Em `server/api/chats/[id].n8n.post.ts`:

```typescript
// Linha 159 - Ajuste o delay (em ms)
await new Promise(resolve => setTimeout(resolve, 30)) // 30ms por padrão
```

### Adicionar Novos Tipos de Componentes

1. Crie o componente em `app/components/tool/`
2. Adicione a renderização em `app/pages/chat/[id].vue`
3. Processe o tipo no backend `server/api/chats/[id].n8n.post.ts`

Exemplo:
```typescript
// Backend
if (chunk.type === 'meu-novo-tipo') {
  writer.write({
    type: 'tool-meu-novo-tipo',
    state: 'result',
    ...chunk
  })
}
```

```vue
<!-- Frontend -->
<ToolMeuNovoTipo
  v-else-if="part.type === 'tool-meu-novo-tipo'"
  :invocation="part"
/>
```

---

## 🐛 Troubleshooting

### Erro: "n8n webhook URL not configured"
**Solução:** Configure `NUXT_PUBLIC_N8N_WEBHOOK_URL` no `.env`

### Toggle n8n não aparece
**Solução:** A URL do webhook precisa estar configurada nas variáveis de ambiente

### Carousel não renderiza
**Solução:** Verifique se o tipo está como `"carousel"` e se há propriedades válidas

### Propriedades clicáveis não funcionam
**Solução:** Use `[[Nome da Propriedade]]` no texto e inclua `clickable_properties`

### Streaming não funciona
**Solução:** Verifique se o n8n está retornando um array JSON válido

---

## 📊 Métricas e Monitoramento

### Logs do Backend
```bash
# Servidor de desenvolvimento
pnpm dev

# Verificar logs de requisições n8n
# Os erros aparecem no console com 'n8n webhook error:'
```

### Logs do n8n
1. Acesse o n8n
2. Vá para "Executions"
3. Veja os detalhes de cada execução
4. Verifique erros em cada nó

---

## 🚀 Deploy

### Variáveis de Ambiente (Produção)

```env
# Obrigatórias
NUXT_SESSION_PASSWORD=min-32-chars-random-string
DATABASE_URL=postgresql://...
NUXT_PUBLIC_N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/flexiestays-agent

# Opcionais
N8N_WEBHOOK_TOKEN=seu-token-producao
NUXT_OAUTH_GITHUB_CLIENT_ID=...
NUXT_OAUTH_GITHUB_CLIENT_SECRET=...
AI_GATEWAY_API_KEY=...
```

### Build

```bash
pnpm build
```

### Preview

```bash
pnpm preview
```

---

## 📝 Próximos Passos

### Melhorias Sugeridas

- [ ] Adicionar cache de respostas
- [ ] Implementar rate limiting
- [ ] Adicionar analytics de uso
- [ ] Criar dashboard de administração
- [ ] Adicionar testes automatizados
- [ ] Implementar feedback do usuário
- [ ] Adicionar mais tipos de componentes visuais

### Integrações Futuras

- [ ] WhatsApp Business API
- [ ] Telegram Bot
- [ ] Sistema de pagamento
- [ ] Calendário de disponibilidade
- [ ] Notificações por email

---

## 👥 Suporte

Para dúvidas ou problemas:
1. Consulte [`N8N_INTEGRATION_GUIDE.md`](./N8N_INTEGRATION_GUIDE.md)
2. Verifique os logs do backend e n8n
3. Teste o webhook manualmente com curl
4. Valide o JSON de resposta

---

## 📄 Licença

Este projeto é privado e proprietário da Flexiestays.

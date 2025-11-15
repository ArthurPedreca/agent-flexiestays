# Migration History

## Latest Update: Restored Database & Features

**Data:** 2025-11-15

As seguintes funcionalidades foram **restauradas** mantendo a estrutura de requisição que estava funcionando:

### ✅ Funcionalidades Restauradas

1. **Database Persistence (Drizzle ORM)**

   - Mensagens agora são salvas automaticamente no banco de dados
   - Endpoint criado: `/api/chats/[id]/messages.post.ts`
   - `useN8nChat` agora persiste mensagens de usuário e assistente

2. **Server-side Message Storage**

   - Todas as mensagens são armazenadas no PostgreSQL
   - Chat history persiste entre sessões
   - Suporte a múltiplos chats por usuário

3. **Chat Title Generation**

   - Endpoint criado: `/api/chats/[id]/title.post.ts`
   - Título é gerado automaticamente após a primeira mensagem
   - Usa os primeiros 50 caracteres da mensagem do usuário

4. **Artifact Rendering**

   - `extractArtifacts` e `bbcodeToMarkdown` reintegrados
   - Tags `[artifact]` são parseadas e renderizadas
   - `ArtifactRenderer` component ativo no template

5. **Chat History Sidebar**
   - Layout restaurado com lista de chats
   - Agrupamento por data (Today, Yesterday, Last 7 days, etc.)
   - Botão de delete por chat
   - Search integrado

### 🔧 Correções Implementadas

1. **Streaming em Tempo Real**

   - **ANTES**: Mensagem só aparecia quando requisição terminava
   - **AGORA**: Mensagem aparece progressivamente durante o streaming
   - Solução: Atualizações reativas dentro do loop `while(true)`

2. **Filtro de BBCode Tags**
   - **Problema**: Primeiros items vinham como `[`, `bbcode`, `]`, `\n`
   - **Solução**: Flag `isFirstContent` que ignora esses tokens iniciais
   - Streaming começa limpo, sem artefatos

### 📁 Arquivos Modificados

- `app/composables/useN8nChat.ts`

  - Adicionado suporte a `chatId` e `initialMessages`
  - Integrado `persistMessage()` para salvar no banco
  - Integrado `generateChatTitle()` automático
  - Adicionado `updateAssistantContent()` com artifacts
  - Filtro de BBCode tags iniciais

- `app/pages/index.vue`

  - Adicionado suporte a `ArtifactRenderer`
  - Aceita `chatId` via query params

- `app/layouts/default.vue`

  - Restaurado sidebar com histórico de chats
  - Restaurado delete functionality
  - Restaurado search com grupos

- `server/api/chats/[id]/messages.post.ts` (novo)

  - POST endpoint para salvar mensagens

- `server/api/chats/[id]/title.post.ts` (novo)
  - POST endpoint para atualizar título do chat

### 🎯 Como Funciona Agora

```typescript
// 1. Usuário envia mensagem
sendMessage("Hello");

// 2. Salva mensagem do usuário no banco
await persistMessage(chatId, "user", parts);

// 3. Faz requisição ao webhook n8n
fetch(webhookUrl, { body: { chatId, message } });

// 4. Processa streaming em tempo real
while (true) {
  const { done, value } = await reader.read();
  // Filtra tokens iniciais [bbcode]
  if (isFirstContent && content in ["[", "bbcode", "]"]) continue;

  // Atualiza UI progressivamente
  rawBuffer += parsed.content;
  updateAssistantContent(rawBuffer, textPart, message, artifacts);
}

// 5. Salva resposta do assistente no banco
await persistMessage(chatId, "assistant", parts);

// 6. Gera título se for primeira mensagem
if (messages.length === 3) {
  await generateChatTitle(chatId, firstMessage);
}
```

### 🔄 Estado Anterior (Simplificado)

Para referência, veja abaixo o estado anterior da aplicação antes desta atualização:

## Changes Made

### 1. Simplified `useN8nChat` Composable

**File**: `app/composables/useN8nChat.ts`

The composable was completely rewritten to:

- **Remove database persistence** - All messages stay in memory only
- **Remove chat registry integration** - No longer tracks chat states across multiple sessions
- **Simplify streaming logic** - Parse JSON lines directly from n8n webhook
- **Generate session ID** - Each page load creates a unique chat session ID
- **Welcome message** - Initializes with "Olá! Como posso ajudar você hoje?"
- **Direct webhook calls** - Calls the webhook URL directly (no server proxy needed)

The new interface is much simpler:

```typescript
const { messages, status, error, sendMessage, stop } = useN8nChat({
  webhookUrl: "https://your-n8n-webhook-url",
});
```

### 2. Unified Chat Interface

**File**: `app/pages/index.vue`

The home page now **is** the chat interface. Changes:

- Integrated the full chat UI directly into the index page
- Removed navigation to separate chat routes
- Uses the new simplified `useN8nChat` composable
- Gets webhook URL from runtime config (`runtimeConfig.public.n8nWebhookUrl`)
- Removed artifact rendering and tool components (can be added back if needed)

### 3. Simplified Layout

**File**: `app/layouts/default.vue`

Removed all chat history features:

- No more chat list sidebar
- No more delete chat functionality
- No more chat state indicators
- No more connection badges
- Kept only: Logo, search button, sidebar collapse, and user menu

### 4. Removed Files

- **`app/pages/chat/[id].vue`** - Dynamic chat routes no longer needed
- The entire `app/pages/chat/` folder was removed

### 5. Configuration

**File**: `nuxt.config.ts`

The runtime config already includes:

```typescript
const defaultN8nWebhook =
  "https://skoobiedigital.app.n8n.cloud/webhook/bubble-streaming";

runtimeConfig: {
  public: {
    n8nWebhookUrl: process.env.NUXT_PUBLIC_N8N_WEBHOOK_URL ||
      process.env.N8N_WEBHOOK_URL ||
      defaultN8nWebhook;
  }
}
```

You can override the webhook URL by setting the `NUXT_PUBLIC_N8N_WEBHOOK_URL` environment variable in your `.env` file:

```env
NUXT_PUBLIC_N8N_WEBHOOK_URL=https://your-webhook-url
```

## How It Works

1. User opens the application
2. A unique chat session ID is generated: `chat_${Date.now()}_${randomString}`
3. A welcome message is displayed
4. User types a message and hits enter
5. The message is sent directly to the n8n webhook with:
   ```json
   {
     "chatId": "chat_123_abc",
     "message": "user's message"
   }
   ```
6. The response streams back as newline-delimited JSON:
   ```json
   {"type":"item","content":"Hello"}
   {"type":"item","content":" there"}
   ```
7. Each chunk is parsed and appended to the assistant's message
8. When the stream ends, the message is marked as "done"

## What Was Removed

- ❌ Database persistence (Drizzle ORM integration)
- ❌ Chat history across sessions
- ❌ Multiple chat threads
- ❌ Chat CRUD operations (create, read, update, delete)
- ❌ Server-side message storage
- ❌ Chat title generation
- ❌ Agent configuration UI
- ❌ Chat state registry
- ❌ Regenerate functionality
- ❌ Artifact rendering (can be added back if needed)
- ❌ Tool invocations display (weather, charts, etc.)

## What Was Kept

- ✅ Streaming responses from n8n webhook
- ✅ Message history within the current session
- ✅ Stop streaming functionality
- ✅ Error handling and display
- ✅ Copy message functionality
- ✅ Markdown rendering with syntax highlighting
- ✅ Responsive UI with Nuxt UI components
- ✅ User authentication (GitHub login)

## Testing

To test the application:

1. Make sure your n8n webhook is running
2. Start the development server: `npm run dev`
3. Open http://localhost:3000
4. You should see a welcome message
5. Type a message and send it
6. The response should stream back from your n8n agent

## Future Enhancements (Optional)

If you want to restore some features:

- **Artifact Support**: Uncomment the artifact rendering in `index.vue`
- **Chat Persistence**: Re-add database calls to `useN8nChat`
- **Multiple Chats**: Add back the chat list and routing
- **BBCode Parsing**: Import and use `bbcodeToMarkdown` from `shared/utils/rich-text.ts`

## Comparison with Reference HTML

The Nuxt implementation now mirrors the reference `index.html` file:

| Feature               | Reference HTML | Nuxt Implementation |
| --------------------- | -------------- | ------------------- |
| Single session        | ✅             | ✅                  |
| Welcome message       | ✅             | ✅                  |
| Session ID generation | ✅             | ✅                  |
| Direct webhook call   | ✅             | ✅                  |
| JSON stream parsing   | ✅             | ✅                  |
| In-memory messages    | ✅             | ✅                  |
| No persistence        | ✅             | ✅                  |

The main differences are:

- Nuxt uses Vue components and Nuxt UI instead of plain HTML/CSS
- Nuxt has proper TypeScript types
- Nuxt supports markdown rendering and code highlighting
- Nuxt integrates with the existing authentication system

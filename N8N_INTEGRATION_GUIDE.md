# Guia de Integração n8n - Flexiestays Agent

Este documento descreve como configurar e ajustar o fluxo n8n para funcionar perfeitamente com o site Flexiestays.

## ⚠️ Ajustes CRÍTICOS Necessários no Fluxo n8n

### 1. **Remover o nó "Respond to Webhook"**

**Problema:** O nó `Respond to Webhook` (ID: `de42dbb6-f6da-4f94-bc13-ed0428ea306e`) está respondendo ANTES do processamento completo, causando resposta vazia.

**Solução:**
1. Abra seu fluxo no n8n
2. Localize o nó "Respond to Webhook" após "Parse Routing Decision"
3. **DELETE** este nó completamente
4. Conecte "Parse Routing Decision" diretamente ao "Execute Workflow"

**Antes:**
```
Parse Routing Decision → Respond to Webhook → Execute Workflow → Route to Specialist
```

**Depois:**
```
Parse Routing Decision → Execute Workflow → Route to Specialist
```

---

### 2. **Conectar o Booking Agent**

**Problema:** O Booking Agent não está conectado ao switch "Route to Specialist". Quando o supervisor roteia para `booking_agent`, nada acontece.

**Solução:**
1. Localize o nó "Route to Specialist" (Switch node)
2. Crie uma nova saída chamada `booking_agent` (se não existir)
3. Conecte esta saída ao nó "Booking Agent"
4. Crie um nó "Normalize Booking Response" após o Booking Agent (se não existir)
5. Conecte ao "Aggregate1"

**Estrutura esperada:**
```
Route to Specialist (booking_agent) → Booking Agent → Normalize Booking Response → Aggregate1
```

---

### 3. **Adicionar LLM e Ferramentas ao Booking Agent**

O Booking Agent precisa ter:
- **LLM conectado** (Booking LLM já existe mas não está conectado)
- **Memory conectado** (Simple Memory3 já existe)
- **Tools para fazer reservas**

**Passos:**
1. Conecte "Booking LLM" ao "Booking Agent" (entrada `ai_languageModel`)
2. Conecte "Simple Memory3" ao "Booking Agent" (entrada `ai_memory`)
3. Se tiver ferramentas de reserva, conecte-as também

---

## 📋 Formato de Resposta Esperado

O endpoint Nuxt espera que o webhook n8n retorne um **array JSON** com a seguinte estrutura:

### Exemplo de Resposta com Texto Simples:
```json
[
  {
    "sequence": 1,
    "total_chunks": 1,
    "is_last": true,
    "delay": 0,
    "type": "text",
    "text": "Olá! Como posso ajudá-lo hoje?"
  }
]
```

### Exemplo de Resposta com Múltiplos Chunks:
```json
[
  {
    "sequence": 1,
    "total_chunks": 2,
    "is_last": false,
    "delay": 0,
    "type": "text",
    "text": "Aqui estão algumas propriedades disponíveis:"
  },
  {
    "sequence": 2,
    "total_chunks": 2,
    "is_last": true,
    "delay": 2,
    "type": "carousel",
    "properties": [
      {
        "id": "prop-123",
        "name": "Beautiful Family Apt w/ Free Gym & Parking",
        "nickname": "Tower 8",
        "price": 175,
        "image": "https://example.com/image.jpg"
      }
    ]
  }
]
```

### Exemplo com Propriedades Clicáveis:
```json
[
  {
    "sequence": 1,
    "total_chunks": 1,
    "is_last": true,
    "delay": 0,
    "type": "text",
    "text": "Você pode gostar de [[Seaside Bliss]], [[Ocean Pearl]], ou [[Skyline Loft]].",
    "clickable_properties": ["Seaside Bliss", "Ocean Pearl", "Skyline Loft"]
  }
]
```

---

## 🔧 Configuração do Webhook

### URL do Webhook
O webhook deve estar acessível publicamente. Exemplo:
```
https://seu-n8n.com/webhook/flexiestays-agent
```

### Formato de Requisição (do Nuxt para n8n)
O Nuxt envia a seguinte estrutura:
```json
{
  "query": {
    "message": "Quero reservar um quarto para 2 pessoas",
    "sessionId": "user-123",
    "chatId": "chat-456"
  },
  "userId": "user-123",
  "username": "João Silva"
}
```

---

## 🎨 Tipos de Componentes Suportados

### 1. **Texto Simples**
```json
{
  "type": "text",
  "text": "Sua mensagem aqui",
  "delay": 0
}
```

### 2. **Carousel de Propriedades**
Exibe um carrossel horizontal de propriedades.

```json
{
  "type": "carousel",
  "delay": 2,
  "properties": [
    {
      "id": "unique-property-id",
      "name": "Nome Completo da Propriedade",
      "nickname": "Apelido/Código (opcional)",
      "price": 150,
      "image": "https://url-da-imagem.jpg"
    }
  ]
}
```

**Campos obrigatórios:**
- `id`: Identificador único
- `name`: Nome da propriedade
- `price`: Preço por noite (número)
- `image`: URL da imagem

**Campos opcionais:**
- `nickname`: Apelido curto (ex: "Tower 8", "Sea Breeze 4")

### 3. **Propriedades Clicáveis no Texto**
Permite que nomes de propriedades sejam clicáveis.

```json
{
  "type": "text",
  "text": "Temos [[Property Name 1]] e [[Property Name 2]] disponíveis.",
  "clickable_properties": ["Property Name 1", "Property Name 2"]
}
```

**Importante:**
- Use `[[Nome da Propriedade]]` para marcar propriedades clicáveis no texto
- Liste todos os nomes em `clickable_properties`

---

## 🔐 Configuração de Segurança (Opcional)

Se quiser adicionar autenticação ao webhook:

1. No n8n, adicione um nó **HTTP Request Header Auth** antes do processamento
2. Verifique o header `Authorization: Bearer SEU_TOKEN`
3. Configure as variáveis de ambiente no Nuxt:

```env
N8N_WEBHOOK_TOKEN=seu_token_secreto_aqui
```

O Nuxt enviará automaticamente este token nas requisições.

---

## 📊 Fluxo Recomendado

```
1. Webhook Trigger (recebe mensagem)
   ↓
2. Get User Memories (busca contexto do Airtable)
   ↓
3. Aggregate Memories
   ↓
4. Merge Message & Memories
   ↓
5. Supervisor Agent (decide qual especialista usar)
   ↓
6. Parse Routing Decision
   ↓
7. Execute Workflow (processo assíncrono)
   ↓
8. Route to Specialist (switch)
   ├─→ Booking Agent → Normalize Booking Response
   ├─→ Info Agent → Normalize Info Response
   ├─→ Direct Response Agent → Normalize Direct Response
   └─→ Escalation → Normalize Escalation
   ↓
9. Aggregate1 (combina todas as respostas)
   ↓
10. Humanizer Agent (torna resposta mais natural)
   ↓
11. Parse Response Chunks (formata JSON)
   ↓
12. Send Final Response (retorna para o Nuxt)
```

---

## ✅ Checklist de Validação

Antes de ativar o webhook, verifique:

- [ ] Nó "Respond to Webhook" foi REMOVIDO
- [ ] "Parse Routing Decision" conecta diretamente ao "Execute Workflow"
- [ ] Booking Agent está conectado ao switch "Route to Specialist"
- [ ] Booking LLM e Memory estão conectados ao Booking Agent
- [ ] Todas as saídas do switch vão para "Aggregate1"
- [ ] "Send Final Response" retorna JSON válido (não texto simples)
- [ ] Testado com uma mensagem de exemplo
- [ ] Formato de resposta segue a estrutura de chunks
- [ ] Imagens das propriedades estão acessíveis publicamente

---

## 🧪 Testando a Integração

### Teste Manual no n8n:

1. Clique em "Execute Workflow" no n8n
2. No nó "Webhook Trigger", clique em "Listen for Test Event"
3. Envie um POST request:

```bash
curl -X POST https://seu-n8n.com/webhook/flexiestays-agent \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "message": "Quero ver propriedades disponíveis",
      "sessionId": "test-session-123",
      "chatId": "test-chat-456"
    },
    "userId": "test-user",
    "username": "Test User"
  }'
```

4. Verifique se a resposta é um array JSON válido
5. Confirme que os delays estão funcionando
6. Valide que os chunks estão na ordem correta

---

## 🐛 Troubleshooting

### Problema: Resposta vazia do n8n
**Solução:** Certifique-se de que removeu o "Respond to Webhook" e que "Send Final Response" está retornando dados.

### Problema: Booking Agent não responde
**Solução:** Verifique se está conectado ao switch e se o LLM/Memory estão ativos.

### Problema: Imagens não aparecem no carousel
**Solução:** Verifique se as URLs das imagens são acessíveis publicamente e se estão no formato correto.

### Problema: Propriedades clicáveis não funcionam
**Solução:** Certifique-se de usar `[[Nome]]` no texto e incluir o array `clickable_properties`.

### Problema: Delay não funciona
**Solução:** Certifique-se de que o campo `delay` está em segundos (não milissegundos).

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do n8n
2. Teste o webhook manualmente com curl
3. Valide o JSON de resposta em https://jsonlint.com
4. Confirme que todas as conexões do fluxo estão corretas

---

## 📝 Notas Adicionais

- O sistema usa **memória compartilhada** entre agentes via Airtable
- Cada agente tem seu próprio LLM e temperatura configurada
- O Humanizer Agent adiciona delays naturais entre chunks
- Propriedades devem ter IDs únicos para rastreamento
- O sistema suporta múltiplos chunks para respostas longas

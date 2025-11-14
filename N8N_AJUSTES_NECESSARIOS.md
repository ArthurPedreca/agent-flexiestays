# 🔧 Ajustes Necessários no Workflow n8n

**Data:** 11 de Novembro de 2025  
**URL do Webhook:** https://skoobiedigital.app.n8n.cloud/webhook-test/agent

---

## ✅ Status da Integração

### O que já está funcionando:

- ✅ Workflow n8n criado com todos os nós
- ✅ Código Nuxt configurado e pronto
- ✅ Variáveis de ambiente configuradas
- ✅ Toggle UI implementado

### O que precisa de ajuste:

- ⚠️ Configuração de streaming no webhook
- ⚠️ Autenticação (opcional mas recomendado)

---

## 🔧 Ajustes Necessários no n8n

### 1. Ajustar o Nó Webhook

Atualmente o webhook está configurado com `responseMode: "responseNode"`, mas para streaming correto precisamos ajustar:

#### Passo a Passo:

1. **Abra o workflow no n8n**
2. **Clique no nó "Webhook"**
3. **Em "Respond":**
   - ⚠️ **Atualmente está:** `Using 'Respond to Webhook' Node`
   - ✅ **Deve ser:** `Streaming response`
4. **Configurar Opções do Webhook:**
   - ✅ **Raw Body:** Já está habilitado ✓
   - ✅ **Response Headers:** Já estão configurados ✓

#### Screenshot de como deve ficar:

```
Webhook Node
├── HTTP Method: POST
├── Path: agent
├── Authentication: None (ou Header Auth se quiser segurança)
├── Respond: ⚠️ STREAMING RESPONSE ⚠️  <-- IMPORTANTE!
└── Options:
    ├── Raw Body: ✓
    └── Response Headers: ✓
```

### Por que isso é importante?

O `responseMode: "responseNode"` significa que o webhook espera o nó "Respond to Webhook" processar tudo primeiro. Mas para streaming real, precisamos que o webhook envie dados conforme eles chegam.

---

## 🔐 2. Adicionar Autenticação (Recomendado)

### Por que adicionar autenticação?

Sem autenticação, qualquer pessoa com a URL do webhook pode enviar requisições e consumir seus créditos da OpenAI!

### Como configurar:

#### No n8n:

1. **Clique no nó Webhook**
2. **Em "Authentication":** Selecione `Header Auth`
3. **Clique em "Create New Credential"**
4. **Configure:**

   ```
   Name: Authorization
   Value: Bearer SEU_TOKEN_SECRETO_AQUI
   ```

   **Gerar um token seguro:**

   ```bash
   # No terminal (PowerShell):
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
   ```

5. **Copie o token gerado**
6. **Salve a credencial**

#### No seu .env (Nuxt):

Adicione a linha:

```env
N8N_WEBHOOK_TOKEN=SEU_TOKEN_AQUI
```

**Exemplo:**

```env
N8N_WEBHOOK_TOKEN=aB3xK9mP2vL8qR5wT7nY4jF6hG1dS0eZ
```

---

## 🚀 3. Ativar o Workflow

### ⚠️ IMPORTANTE: Mudar de Test para Production

Atualmente você está usando: `webhook-test/agent`

**Para produção:**

1. **No n8n, clique no toggle "Inactive" → "Active"**
2. **A URL mudará de:**

   ```
   https://skoobiedigital.app.n8n.cloud/webhook-test/agent
   ```

   **Para:**

   ```
   https://skoobiedigital.app.n8n.cloud/webhook/agent
   ```

3. **Atualize o .env:**

   ```env
   # Para testes:
   NUXT_PUBLIC_N8N_WEBHOOK_URL=https://skoobiedigital.app.n8n.cloud/webhook-test/agent

   # Para produção:
   NUXT_PUBLIC_N8N_WEBHOOK_URL=https://skoobiedigital.app.n8n.cloud/webhook/agent
   ```

---

## 🧪 Como Testar

### Teste 1: Verificar se o webhook responde

```bash
curl -X POST https://skoobiedigital.app.n8n.cloud/webhook-test/agent \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "test-123",
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Olá, você pode me ajudar?"
      }
    ],
    "userId": "test-user",
    "username": "Teste"
  }'
```

**Resposta esperada:**
Você deve ver o texto da resposta da IA sendo exibido progressivamente.

### Teste 2: Com autenticação (se configurou)

```bash
curl -X POST https://skoobiedigital.app.n8n.cloud/webhook-test/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "chatId": "test-123",
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Teste com autenticação"
      }
    ]
  }'
```

### Teste 3: No Nuxt

1. Inicie o servidor Nuxt: `npm run dev`
2. Faça login no app
3. Crie um novo chat
4. **Clique no toggle** para mudar para "n8n"
5. Envie uma mensagem
6. Você deve ver a resposta streamando!

---

## 📋 Checklist Final

Antes de considerar completo:

- [ ] Webhook configurado com **"Streaming response"**
- [ ] Autenticação configurada (recomendado)
- [ ] Token adicionado no `.env` (se configurou auth)
- [ ] Workflow ativado (toggle "Active")
- [ ] URL de produção atualizada no `.env`
- [ ] Testado com curl
- [ ] Testado no Nuxt app
- [ ] Toggle funcionando no UI
- [ ] Mensagens sendo salvas no banco de dados
- [ ] Streaming visível no chat

---

## 🐛 Troubleshooting

### Problema: "Failed to connect to n8n"

**Soluções:**

- Verifique se o workflow está **Active**
- Confirme que a URL está correta no `.env`
- Teste com curl primeiro

### Problema: "401 Unauthorized"

**Soluções:**

- Se configurou autenticação, verifique se o token no `.env` está correto
- Verifique se o token começa com `Bearer ` no n8n
- Tente sem autenticação primeiro para debug

### Problema: Resposta não aparece streamando

**Soluções:**

- ⚠️ **Verifique se o webhook está em "Streaming response"** (não "responseNode")
- Verifique os headers no nó Webhook
- Olhe os logs de execução no n8n

### Problema: "No input received from webhook"

**Soluções:**

- Verifique se o **Raw Body** está habilitado no webhook
- Confirme que está enviando JSON válido
- Verifique o Content-Type header

### Problema: Credencial OpenAI inválida no n8n

**Soluções:**

- Vá em **Credentials** no n8n
- Edite a credencial "OpenAi account"
- Cole sua chave OpenAI válida
- Salve e teste novamente

---

## 📊 Arquitetura do Fluxo

```
Nuxt App (Frontend)
    ↓
    │ POST /api/chats/[id]/n8n
    ↓
Nuxt API Route (server/api/chats/[id].n8n.post.ts)
    ↓
    │ POST https://skoobiedigital.app.n8n.cloud/webhook/agent
    │ Headers: Content-Type, Authorization
    │ Body: { chatId, model, messages, userId, username }
    ↓
n8n Webhook Node
    ↓
Extract Input (Code Node)
    │ - Valida campos obrigatórios
    │ - Extrai chatId, model, messages
    ↓
Format for AI Agent (Code Node)
    │ - Converte para formato LangChain
    │ - Cria system prompt
    ↓
AI Agent Node
    │ - Processa com OpenAI
    │ - Usa Window Buffer Memory (histórico)
    │ - Max 5 iterações
    ↓
Format Streaming Response (Code Node)
    │ - Extrai texto da resposta
    │ - Formata para streaming
    ↓
Respond to Webhook Node
    │ - Envia resposta de volta
    ↓
    │ STREAMING ⚡
    ↓
Nuxt API Route
    │ - Recebe stream
    │ - Salva no banco de dados
    │ - Encaminha para frontend
    ↓
Frontend (Vue Chat Component)
    │ - Exibe resposta em tempo real
    │ - Renderiza markdown
    └──── ✓ Concluído
```

---

## 💡 Dicas de Otimização

### 1. Ajustar o Modelo

No nó **"OpenAI Chat Model"**, você pode:

- Usar modelos mais baratos para testes: `gpt-4o-mini`
- Usar modelos mais potentes para produção: `gpt-4o`
- O modelo é dinâmico: `={{ $json.model }}`

### 2. Ajustar a Memória

No nó **"Window Buffer Memory"**:

- **Context Window Length: 10** (mantém últimas 10 mensagens)
- Aumentar para mais contexto (mais caro)
- Diminuir para economizar tokens

### 3. Adicionar Ferramentas (Tools)

Você pode adicionar ao AI Agent:

- **HTTP Request Tool** - Para chamar APIs externas
- **Calculator Tool** - Para cálculos matemáticos
- **Code Tool** - Para executar código
- **Custom Tools** - Workflows personalizados

### 4. Monitoramento

- **Veja execuções:** n8n → Executions
- **Logs de erro:** Cada nó mostra erros detalhados
- **Performance:** Verifique tempo de resposta

---

## 📝 Próximos Passos

Depois que tudo estiver funcionando:

1. **Adicionar mais ferramentas** ao AI Agent
2. **Customizar o system prompt** para seu caso de uso
3. **Implementar rate limiting** (se necessário)
4. **Adicionar logs** para monitoramento
5. **Configurar alertas** em caso de falhas
6. **Otimizar custos** da OpenAI

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs** no n8n (Executions)
2. **Teste com curl** primeiro
3. **Verifique o console** do Nuxt (terminal)
4. **Olhe o Network tab** no navegador (DevTools)

**Erros comuns já estão documentados** na seção Troubleshooting acima.

---

**Última Atualização:** 11 de Novembro de 2025  
**Versão:** 1.0.0  
**Status:** ✅ Pronto para uso após ajustes

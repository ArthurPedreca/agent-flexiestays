# n8n AI Agent Workflow - Complete Building Guide

**Date:** November 11, 2025  
**Purpose:** Create an n8n workflow that integrates with the Nuxt AI Chat application as a streaming AI agent

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Workflow Architecture](#workflow-architecture)
4. [Step-by-Step Workflow Build](#step-by-step-workflow-build)
5. [Node Configurations](#node-configurations)
6. [Testing & Validation](#testing--validation)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Features](#advanced-features)

---

## 🎯 Overview

This workflow enables n8n to act as an AI agent that can be used in place of OpenAI in your Nuxt chat application. It receives chat messages via webhook, processes them through an AI agent with tools, and streams the response back to the Nuxt application.

### Key Features

- ✅ **Streaming responses** for real-time chat experience
- ✅ **AI Agent capabilities** with custom tools
- ✅ **Authentication** via Bearer token
- ✅ **Error handling** and logging
- ✅ **Compatible with AI SDK format**

---

## ✅ Prerequisites

### Required n8n Version

- n8n version **1.103.0 or higher** (for streaming response support)
- Self-hosted n8n instance or n8n Cloud

### Required n8n Nodes

- Webhook (Core node)
- Code (Core node)
- AI Agent (LangChain node)
- Respond to Webhook (Core node)
- HTTP Request (optional, for external tools)

### Required Credentials

- OpenAI API key (or other LLM provider)
- (Optional) Authentication token for webhook security

---

## 🏗️ Workflow Architecture

```
┌─────────────────────────────────────┐
│  1. Webhook Trigger                 │
│  - Receives POST from Nuxt          │
│  - Validates authentication         │
│  - Enables streaming response       │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│  2. Extract & Validate Input        │
│  - Parse request body               │
│  - Extract chatId, messages, model  │
│  - Validate required fields         │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│  3. Format Messages for AI          │
│  - Convert to LangChain format      │
│  - Build conversation history       │
│  - Prepare system prompt            │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│  4. AI Agent Node                   │
│  - Process with LLM (OpenAI/etc)    │
│  - Execute tools if needed          │
│  - Generate response                │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│  5. Stream Response                 │
│  - Convert to streaming format      │
│  - Send chunks progressively        │
│  - Handle completion                │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│  6. Respond to Webhook              │
│  - Send streaming response          │
│  - Set proper headers               │
│  - Close connection                 │
└─────────────────────────────────────┘
```

---

## 🔧 Step-by-Step Workflow Build

### Step 1: Create New Workflow

1. Open n8n and click **"Create new workflow"**
2. Name it: `Nuxt AI Chat Agent`
3. Save the workflow

---

### Step 2: Add Webhook Trigger Node

#### Configuration:

1. **Add Node** → Core Nodes → **Webhook**
2. **Node Parameters:**

   - **HTTP Method:** `POST`
   - **Path:** `agent` (or your custom path)
   - **Authentication:** `Header Auth` _(recommended)_
   - **Respond:** `Streaming response` ⚠️ **CRITICAL**
   - **Response Code:** `200`

3. **Node Options** (click "Add Option"):
   - ✅ **Raw Body:** Enable this
   - ✅ **Response Headers:**
     ```json
     {
       "Content-Type": "text/plain; charset=utf-8",
       "Cache-Control": "no-cache, no-transform",
       "Connection": "keep-alive",
       "X-Content-Type-Options": "nosniff"
     }
     ```

#### Authentication Setup (Header Auth):

1. Click **Credential for Header Auth** → **Create New**
2. **Name:** `n8n-nuxt-webhook-auth`
3. **Credentials Data:**

   - **Name:** `Authorization`
   - **Value:** `Bearer YOUR_SECRET_TOKEN_HERE`

   ⚠️ **Important:** Use a strong, random token (32+ characters)

   Example token generation:

   ```bash
   openssl rand -hex 32
   ```

4. Save the credential

#### Get Your Webhook URLs:

After configuring, n8n will show:

- **Test URL:** For development (e.g., `https://your-n8n.com/webhook-test/agent`)
- **Production URL:** For live use (e.g., `https://your-n8n.com/webhook/agent`)

**Copy the Production URL** - you'll need this for your Nuxt `.env` file.

---

### Step 3: Add Input Extraction Node

#### Configuration:

1. **Add Node** → Core Nodes → **Code**
2. **Name it:** `Extract Input`
3. **Mode:** `Run Once for All Items`
4. **Language:** `JavaScript`

#### Code:

```javascript
// Extract and validate input from webhook
const items = $input.all();

if (!items.length) {
  throw new Error("No input received from webhook");
}

const webhookData = items[0].json;

// Extract body from webhook
const body = webhookData.body;

if (!body) {
  throw new Error("Request body is missing");
}

// Validate required fields
if (!body.messages || !Array.isArray(body.messages)) {
  throw new Error("Messages array is required");
}

if (body.messages.length === 0) {
  throw new Error("Messages array cannot be empty");
}

// Extract data
const chatId = body.chatId || "unknown";
const model = body.model || "gpt-4o-mini";
const messages = body.messages;
const userId = body.userId || "anonymous";
const username = body.username || "User";

// Return formatted data
return [
  {
    json: {
      chatId,
      model,
      messages,
      userId,
      username,
      timestamp: new Date().toISOString(),
    },
  },
];
```

---

### Step 4: Format Messages for AI Agent

#### Configuration:

1. **Add Node** → Core Nodes → **Code**
2. **Name it:** `Format for AI Agent`
3. **Mode:** `Run Once for All Items`
4. **Language:** `JavaScript`

#### Code:

```javascript
// Format messages for LangChain AI Agent
const items = $input.all();
const data = items[0].json;

// Convert messages to LangChain format
const formattedMessages = data.messages.map((msg) => {
  return {
    type: msg.role === "user" ? "human" : "ai",
    content: msg.content,
  };
});

// Build system prompt
const systemPrompt = `You are a knowledgeable and helpful AI assistant. ${
  data.username ? `The user's name is ${data.username}.` : ""
} Your goal is to provide clear, accurate, and well-structured responses.

**FORMATTING RULES (CRITICAL):**
- ABSOLUTELY NO MARKDOWN HEADINGS: Never use #, ##, ###, ####, #####, or ######
- NO underline-style headings with === or ---
- Use **bold text** for emphasis and section labels instead
- Examples:
  * Instead of "## Usage", write "**Usage:**" or just "Here's how to use it:"
  * Instead of "# Complete Guide", write "**Complete Guide**" or start directly with content
- Start all responses with content, never with a heading

**RESPONSE QUALITY:**
- Be concise yet comprehensive
- Use examples when helpful
- Break down complex topics into digestible parts
- Maintain a friendly, professional tone`;

return [
  {
    json: {
      ...data,
      formattedMessages,
      systemPrompt,
      // Get the last user message for context
      lastMessage: data.messages[data.messages.length - 1].content,
    },
  },
];
```

---

### Step 5: Add AI Agent Node

#### Configuration:

1. **Add Node** → AI → **AI Agent**
2. **Select Agent Type:** `Tools Agent` or `Conversational Agent`
3. **Prompt:**
   ```
   {{ $json.systemPrompt }}
   ```

#### Connect Chat Model:

1. Click **+ Add Sub-Node** → **Chat Model**
2. Select **OpenAI Chat Model** (or your preferred provider)
3. **Credentials:** Select or create OpenAI API credentials
4. **Model:**
   ```
   {{ $json.model }}
   ```
   (This allows dynamic model selection from the Nuxt app)

#### Add Memory (Optional but Recommended):

1. Click **+ Add Sub-Node** → **Memory**
2. Select **Window Buffer Memory**
3. **Session Key:**
   ```
   {{ $json.chatId }}
   ```
4. **Context Window Size:** `10` (keeps last 10 messages)

#### Add Tools (Optional):

You can add any n8n tools here. Common examples:

**Example Tool 1: HTTP Request Tool**

1. Click **+ Add Sub-Node** → **Tools** → **HTTP Request**
2. Configure for API calls your agent needs

**Example Tool 2: Code Tool**

1. Click **+ Add Sub-Node** → **Tools** → **Code Tool**
2. Write custom JavaScript logic

**Example Tool 3: Calculator**

1. Click **+ Add Sub-Node** → **Tools** → **Calculator**
2. For mathematical operations

#### Agent Settings:

- **Max Iterations:** `5` (prevents infinite loops)
- **Return Intermediate Steps:** `false` (cleaner output)

---

### Step 6: Format Streaming Response

#### Configuration:

1. **Add Node** → Core Nodes → **Code**
2. **Name it:** `Format Streaming Response`
3. **Mode:** `Run Once for All Items`
4. **Language:** `JavaScript`

#### Code:

```javascript
// Format AI response for streaming to Nuxt
const items = $input.all();
const agentResponse = items[0].json;

// Extract the text response from AI Agent
let responseText = "";

if (agentResponse.output) {
  responseText = agentResponse.output;
} else if (agentResponse.text) {
  responseText = agentResponse.text;
} else if (typeof agentResponse === "string") {
  responseText = agentResponse;
} else {
  responseText = JSON.stringify(agentResponse);
}

// For true streaming, we just return the complete text
// The Respond to Webhook node will handle the streaming
return [
  {
    json: {
      response: responseText,
      chatId: items[0].json.chatId,
      timestamp: new Date().toISOString(),
    },
  },
];
```

---

### Step 7: Add Respond to Webhook Node

#### Configuration:

1. **Add Node** → Core Nodes → **Respond to Webhook**
2. **Respond With:** `Text`
3. **Response Body:**
   ```
   {{ $json.response }}
   ```

#### Options:

- **Response Code:** `200`
- **Response Headers:** (Already set in Webhook node, but can add more here if needed)

#### Connection:

Connect the **Format Streaming Response** node → **Respond to Webhook** node

---

### Step 8: Add Error Handling (Recommended)

#### Add Error Trigger:

1. On each node, click the three dots → **Settings**
2. Under **Error Handling:**
   - **Continue on Fail:** Enable
   - **Error Output:** Enable

#### Add Error Response Node:

1. **Add Node** → Core Nodes → **Code**
2. **Name it:** `Error Handler`
3. **Connect from:** Each node's error output

#### Error Handler Code:

```javascript
// Handle errors and return friendly message
const error = $input.all()[0].json.error;

const errorMessage = {
  error: true,
  message: error.message || "An unexpected error occurred",
  timestamp: new Date().toISOString(),
};

return [
  {
    json: {
      response: `I apologize, but I encountered an error: ${
        error.message || "Unknown error"
      }. Please try again.`,
      error: errorMessage,
    },
  },
];
```

Connect **Error Handler** → **Respond to Webhook**

---

## 🧪 Testing & Validation

### Test in n8n

1. Click **Test workflow** button
2. The webhook will start listening
3. Copy the **Test URL**

### Test with curl:

```bash
curl -X POST https://your-n8n-instance.com/webhook-test/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "chatId": "test-123",
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ],
    "userId": "test-user",
    "username": "Tester"
  }'
```

**Expected Response:**
You should see the AI's response streamed back as plain text.

### Activate Production Webhook:

1. Click **Save** to save the workflow
2. Click the **Inactive** toggle → **Active**
3. The Production URL is now live

---

## 🔗 Connect to Nuxt Application

### Update Nuxt `.env` file:

```bash
# n8n Integration
NUXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/agent
N8N_WEBHOOK_TOKEN=YOUR_TOKEN_HERE
```

### Test in Nuxt:

1. Start your Nuxt dev server
2. Open a chat
3. Click the toggle to switch to "n8n" agent
4. Send a message
5. You should see the response streaming from n8n!

---

## 🐛 Troubleshooting

### Issue: "n8n webhook URL not configured"

**Solution:** Ensure `NUXT_PUBLIC_N8N_WEBHOOK_URL` is set in your `.env` file

### Issue: "n8n webhook failed: 401 Unauthorized"

**Solutions:**

- Verify the token in n8n webhook auth matches `N8N_WEBHOOK_TOKEN` in `.env`
- Ensure token is prefixed with `Bearer ` in the header
- Check n8n webhook authentication is enabled

### Issue: "n8n webhook failed: 404 Not Found"

**Solutions:**

- Verify the webhook path is correct (e.g., `/webhook/agent`)
- Ensure workflow is **Active** in n8n
- Check n8n instance is accessible from Nuxt server

### Issue: Response not streaming

**Solutions:**

- Verify Webhook node has **"Respond: Streaming response"** selected
- Check response headers include proper streaming headers
- Ensure n8n version is 1.103.0+

### Issue: "No response body from n8n"

**Solutions:**

- Ensure **Respond to Webhook** node is connected
- Verify the response body field has content
- Check for errors in n8n execution log

### Issue: Timeout errors

**Solutions:**

- Reduce AI Agent **Max Iterations** setting
- Simplify or remove complex tools
- Increase timeout in Nuxt fetch (if needed)

### Debugging Tips:

1. **Check n8n Execution Logs:**

   - Go to **Executions** tab in n8n
   - Review each node's input/output
   - Look for error messages

2. **Enable Console Logging:**
   Add to Code nodes:

   ```javascript
   console.log("Debug:", JSON.stringify(data, null, 2));
   ```

3. **Test Each Node Individually:**
   - Use **Test step** on each node
   - Verify data flows correctly

---

## 🚀 Advanced Features

### Feature 1: Add Database Integration

Add a node to log conversations to your database:

1. **Add Node** → **Postgres** (or your database)
2. **Operation:** `Insert`
3. Connect after AI Agent node

### Feature 2: Add Custom Tools

Create workflow-based tools:

1. **Add Node** → **Execute Workflow Tool**
2. Connect sub-workflows for complex operations

### Feature 3: Add Rate Limiting

1. **Add Node** → **Code** (before AI Agent)
2. Implement rate limit logic:

```javascript
// Simple rate limiting
const userId = $json.userId;
const key = `ratelimit:${userId}`;

// Check Redis or in-memory cache
// Implement your rate limiting logic here

return $input.all();
```

### Feature 4: Add Moderation

1. **Add Node** → **OpenAI** → **Moderation**
2. Check user input before processing
3. Reject inappropriate content

### Feature 5: Multi-Model Support

Add logic to route to different models:

```javascript
// In Format for AI Agent node
const modelMap = {
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  claude: "claude-3-sonnet",
  gemini: "gemini-pro",
};

data.model = modelMap[data.model] || "gpt-4o-mini";
```

---

## 📊 Workflow Checklist

Before going to production, verify:

- [ ] Webhook authentication is enabled and secure
- [ ] Streaming response is enabled
- [ ] Error handling is configured
- [ ] Workflow is saved and active
- [ ] Production URL is accessible
- [ ] Token is stored securely
- [ ] Response headers are correct
- [ ] AI model credentials are valid
- [ ] Rate limiting is considered (if needed)
- [ ] Logging is enabled for debugging
- [ ] Tested with curl successfully
- [ ] Tested with Nuxt app successfully

---

## 📝 Notes

### Performance Considerations:

- **Streaming:** Provides better UX but requires proper connection handling
- **Model Selection:** Larger models (gpt-4) are slower but more capable
- **Tool Complexity:** More tools = slower responses
- **Memory:** Keeping history improves context but increases token usage

### Security Best Practices:

1. **Always use authentication** on production webhooks
2. **Use HTTPS** for webhook URLs
3. **Rotate tokens** regularly
4. **Validate input** in extraction nodes
5. **Rate limit** requests per user
6. **Monitor** webhook usage and errors

### Cost Optimization:

- Use **gpt-4o-mini** for most requests (cheaper)
- Limit **context window** size in memory
- Set **max iterations** on agents
- Cache common responses (if possible)

---

## 🎉 Completion

You've successfully created an n8n AI Agent workflow that integrates with your Nuxt chat application!

**Next Steps:**

1. Customize the system prompt for your use case
2. Add domain-specific tools
3. Fine-tune model parameters
4. Monitor and optimize performance

**Support:**

- n8n Documentation: https://docs.n8n.io
- n8n Community: https://community.n8n.io
- This Nuxt Integration: See repository README

---

**Last Updated:** November 11, 2025  
**Workflow Version:** 1.0.0  
**Compatible with:** n8n 1.103.0+, Nuxt 3.x

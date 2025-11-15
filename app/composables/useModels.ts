const AGENT_NAME_KEY = 'n8n-agent-name'
const AGENT_WEBHOOK_KEY = 'n8n-agent-webhook'

export type AgentConnectionState = 'disconnected' | 'connected' | 'invalid'

export function useModels() {
  const runtimeConfig = useRuntimeConfig()

  const storedName = useCookie<string | null>(AGENT_NAME_KEY, {
    default: () => null
  })

  const storedWebhook = useCookie<string | null>(AGENT_WEBHOOK_KEY, {
    default: () => null
  })

  const defaultWebhook = computed(() => runtimeConfig.public.n8nWebhookUrl || '')

  const webhookUrl = computed({
    get: () => storedWebhook.value?.trim() || defaultWebhook.value,
    set: (url: string | null) => {
      if (!url) {
        storedWebhook.value = null
        return
      }

      const normalized = url.trim()
      storedWebhook.value = normalized.length ? normalized : null
    }
  })

  const agentName = computed({
    get: () => storedName.value?.trim() || 'n8n Agent',
    set: (name: string | null) => {
      const normalized = name?.trim()
      storedName.value = normalized?.length ? normalized : null
    }
  })

  const connectionState = computed<AgentConnectionState>(() => {
    if (!webhookUrl.value) {
      return 'disconnected'
    }

    try {
      const parsed = new URL(webhookUrl.value)
      return parsed.protocol.startsWith('http') ? 'connected' : 'invalid'
    } catch {
      return 'invalid'
    }
  })

  function setWebhook(url: string) {
    webhookUrl.value = url
  }

  function resetWebhook() {
    webhookUrl.value = runtimeConfig.public.n8nWebhookUrl || ''
  }

  function renameAgent(name: string) {
    agentName.value = name
  }

  return {
    agentName,
    webhookUrl,
    connectionState,
    setWebhook,
    resetWebhook,
    renameAgent
  }
}

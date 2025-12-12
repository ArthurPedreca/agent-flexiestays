export type AgentSyncState = 'idle' | 'streaming' | 'error'

interface Chat {
  id: string
  label: string
  icon: string
  createdAt: string
}

const CHAT_STATE_KEY = 'n8n-agent-chat-state'

interface AgentNavigationGroup {
  id: string
  label: string
  items: Array<Chat & { status: AgentSyncState }>
}

export function useAgentChatRegistry() {
  const chatStates = useState<Record<string, AgentSyncState>>(CHAT_STATE_KEY, () => ({}))

  const setChatState = (chatId: string, state: AgentSyncState) => {
    chatStates.value = {
      ...chatStates.value,
      [chatId]: state
    }
  }

  const resetChatState = (chatId: string) => {
    const { [chatId]: _removed, ...rest } = chatStates.value
    chatStates.value = rest
  }

  return {
    chatStates,
    setChatState,
    resetChatState
  }
}

export function useChats(chats: Ref<Chat[] | undefined>) {
  const { chatStates, setChatState } = useAgentChatRegistry()

  const orderedChats = computed(() => (
    (chats.value ?? [])
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(chat => ({
        ...chat,
        status: chatStates.value[chat.id] ?? 'idle'
      }))
  ))

  const groups = computed<AgentNavigationGroup[]>(() => {
    const active = orderedChats.value.filter(chat => chat.status !== 'error')
    const attention = orderedChats.value.filter(chat => chat.status === 'error')

    const formatted: AgentNavigationGroup[] = []

    if (active.length) {
      formatted.push({
        id: 'active-connections',
        label: 'All Chats',
        items: active
      })
    }

    if (attention.length) {
      formatted.push({
        id: 'needs-attention',
        label: 'Precisa da sua atenção',
        items: attention
      })
    }

    return formatted
  })

  return {
    groups,
    orderedChats,
    setChatState
  }
}

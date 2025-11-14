<script setup lang="ts">
import type { DefineComponent } from 'vue'
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useClipboard } from '@vueuse/core'
import { getTextFromMessage } from '@nuxt/ui/utils/ai'
import ProseStreamPre from '../../components/prose/PreStream.vue'

const components = {
  pre: ProseStreamPre as unknown as DefineComponent
}

const route = useRoute()
const toast = useToast()
const clipboard = useClipboard()
const { model } = useModels()

// n8n agent toggle
const useN8nAgent = ref(false)
const config = useRuntimeConfig()
const n8nConfigured = computed(() => !!config.public.n8nWebhookUrl)

interface ChatMessage {
  id: string
  chatId: string
  role: 'user' | 'assistant'
  parts: Array<Record<string, unknown>>
  createdAt: string
}

interface ChatData {
  id: string
  title: string | null
  userId: string
  createdAt: string
  messages: ChatMessage[]
}

const { data } = await useFetch<ChatData>(`/api/chats/${route.params.id}`, {
  cache: 'force-cache'
})

if (!data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Chat not found',
    fatal: true
  })
}

const input = ref('')

// Compute the API endpoint based on agent selection
const apiEndpoint = computed(() => {
  if (!data.value) return `/api/chats/${route.params.id}`
  return useN8nAgent.value
    ? `/api/chats/${data.value.id}/n8n`
    : `/api/chats/${data.value.id}`
})

// Create a reactive transport configuration
const transportConfig = computed(() => ({
  api: apiEndpoint.value,
  body: {
    model: model.value
  }
}))

const chat = new Chat({
  id: data.value.id,
  messages: data.value.messages as unknown as UIMessage[],
  transport: new DefaultChatTransport(transportConfig.value),
  onData: (dataPart) => {
    if (dataPart.type === 'data-chat-title') {
      refreshNuxtData('chats')
    }
  },
  onError(error) {
    const { message }
      = typeof error.message === 'string' && error.message[0] === '{'
        ? JSON.parse(error.message)
        : error
    toast.add({
      description: message,
      icon: 'i-lucide-alert-circle',
      color: 'error',
      duration: 0
    })
  }
})

// Watch for agent toggle changes and recreate chat instance
watch(useN8nAgent, () => {
  // When switching agents, we need to update the transport
  // This is handled reactively through the transportConfig computed property
  nextTick(() => {
    if (n8nConfigured.value && useN8nAgent.value) {
      toast.add({
        title: 'Switched to n8n Agent',
        icon: 'i-lucide-bot',
        color: 'primary'
      })
    } else if (useN8nAgent.value && !n8nConfigured.value) {
      toast.add({
        title: 'n8n not configured',
        description: 'Set NUXT_PUBLIC_N8N_WEBHOOK_URL to use n8n agent',
        icon: 'i-lucide-alert-triangle',
        color: 'warning'
      })
      useN8nAgent.value = false
    }
  })
})

function handleSubmit(e: Event) {
  e.preventDefault()
  if (input.value.trim()) {
    chat.sendMessage({
      text: input.value
    })
    input.value = ''
  }
}

const copied = ref(false)

function copy(e: MouseEvent, message: UIMessage) {
  clipboard.copy(getTextFromMessage(message))

  copied.value = true

  setTimeout(() => {
    copied.value = false
  }, 2000)
}

onMounted(() => {
  if (data.value?.messages.length === 1) {
    chat.regenerate()
  }
})
</script>

<template>
  <UDashboardPanel id="chat" class="relative" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <DashboardNavbar />
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6">
        <UChatMessages
          should-auto-scroll
          :messages="chat.messages"
          :status="chat.status"
          :assistant="
            chat.status !== 'streaming'
              ? {
                actions: [
                  {
                    label: 'Copy',
                    icon: copied ? 'i-lucide-copy-check' : 'i-lucide-copy',
                    onClick: copy
                  }
                ]
              }
              : { actions: [] }
          "
          :spacing-offset="160"
          class="lg:pt-(--ui-header-height) pb-4 sm:pb-6"
        >
          <template #content="{ message }">
            <div class="*:first:mt-0 *:last:mb-0">
              <template
                v-for="(part, index) in message.parts"
                :key="`${message.id}-${part.type}-${index}${
                  'state' in part ? `-${part.state}` : ''
                }`"
              >
                <Reasoning
                  v-if="part.type === 'reasoning'"
                  :text="part.text"
                  :is-streaming="part.state !== 'done'"
                />
                <MDCCached
                  v-else-if="part.type === 'text'"
                  :value="part.text"
                  :cache-key="`${message.id}-${index}`"
                  :components="components"
                  :parser-options="{ highlight: false }"
                  class="*:first:mt-0 *:last:mb-0"
                />
                <ToolWeather
                  v-else-if="part.type === 'tool-weather'"
                  :invocation="(part as WeatherUIToolInvocation)"
                />
                <ToolChart
                  v-else-if="part.type === 'tool-chart'"
                  :invocation="(part as ChartUIToolInvocation)"
                />
              </template>
            </div>
          </template>
        </UChatMessages>

        <UChatPrompt
          v-model="input"
          :error="chat.error"
          variant="subtle"
          class="sticky bottom-0 [view-transition-name:chat-prompt] rounded-b-none z-10"
          @submit="handleSubmit"
        >
          <template #footer>
            <div class="flex items-center gap-2">
              <UTooltip
                v-if="n8nConfigured"
                text="Switch between OpenAI and n8n Agent"
              >
                <UToggle v-model="useN8nAgent" :disabled="!n8nConfigured">
                  <template #icon="{ checked }">
                    <UIcon
                      :name="
                        checked ? 'i-lucide-workflow' : 'i-lucide-sparkles'
                      "
                      class="w-4 h-4"
                    />
                  </template>
                </UToggle>
              </UTooltip>
              <span
                v-if="n8nConfigured"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                {{ useN8nAgent ? "n8n" : "OpenAI" }}
              </span>
            </div>

            <ModelSelect v-model="model" />

            <UChatPromptSubmit
              :status="chat.status"
              color="neutral"
              @stop="chat.stop"
              @reload="chat.regenerate"
            />
          </template>
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>

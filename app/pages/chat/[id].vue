<script setup lang="ts">
import type { DefineComponent } from "vue";
import type { FlexiMessage } from "../../../shared/types/chat";
import type { UIMessage } from "ai";
import type { WeatherUIToolInvocation } from "../../../shared/utils/tools/weather";
import type { ChartUIToolInvocation } from "../../../shared/utils/tools/chart";
import type { CarouselUIToolInvocation } from "../../../shared/utils/tools/carousel";
import type { PropertyCardUIToolInvocation } from "../../../shared/utils/tools/property-card";
import type { ImageDisplayUIToolInvocation } from "../../../shared/utils/tools/image-display";
import { useClipboard } from "@vueuse/core";
import { getTextFromMessage } from "@nuxt/ui/utils/ai";
import ProseStreamPre from "../../components/prose/PreStream.vue";
import { LazyModalMessageLimit, LazyModalLogin } from "#components";

const components = {
  pre: ProseStreamPre as unknown as DefineComponent,
};

const route = useRoute();
const toast = useToast();
const overlay = useOverlay();
const { isAuthenticated } = useAuth();

// Message limit for unauthenticated users
const MESSAGE_LIMIT = 5;
const userMessageCount = ref(0);
const showMessageLimitReached = ref(false);

// Create modals
const messageLimitModal = overlay.create(LazyModalMessageLimit, {});
const loginModal = overlay.create(LazyModalLogin, {});

async function openMessageLimitModal() {
  const instance = messageLimitModal.open();
  const shouldOpenLogin = await instance.result;
  if (shouldOpenLogin) {
    openLoginModal();
  }
}

async function openLoginModal() {
  const instance = loginModal.open();
  const result = await instance.result;
  if (result) {
    // User logged in successfully, reset the limit
    showMessageLimitReached.value = false;
  }
}
const clipboard = useClipboard();

interface ChatMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  parts: Array<Record<string, unknown>>;
  createdAt: string;
}

interface ChatData {
  id: string;
  title: string | null;
  userId: string;
  createdAt: string;
  messages: ChatMessage[];
}

const { data, refresh } = await useFetch<ChatData>(`/api/chats/${route.params.id}`, {
  key: `chat-${route.params.id}`,
  watch: [() => route.params.id],
});

if (!data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Chat not found",
    fatal: true,
  });
}

const input = ref("");
const initialMessages = (data.value.messages ??
  []) as unknown as FlexiMessage[];

// Count existing user messages for the limit
const existingUserMessageCount = initialMessages.filter(
  (m) => m.role === "user"
).length;
userMessageCount.value = existingUserMessageCount;

const { messages, status, error, sendMessage, stop } = useN8nChat({
  chatId: data.value.id,
  initialMessages,
});

const copied = ref(false);
const uiMessages = computed(() => messages.value as unknown as UIMessage[]);
const uiStatus = computed<"ready" | "streaming">(() =>
  status.value === "streaming" || status.value === "submitting"
    ? "streaming"
    : "ready"
);

function handleSubmit(e: Event) {
  e.preventDefault();
  if (!input.value.trim()) {
    return;
  }

  // Check message limit for unauthenticated users
  if (!isAuthenticated.value) {
    userMessageCount.value++;

    if (userMessageCount.value >= MESSAGE_LIMIT) {
      showMessageLimitReached.value = true;
      openMessageLimitModal();
      return;
    }
  }

  sendMessage(input.value);
  input.value = "";
}

function copy(e: MouseEvent, message: UIMessage) {
  clipboard.copy(getTextFromMessage(message));

  copied.value = true;

  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

watch(
  () => messages.value.length,
  (newLength, oldLength) => {
    if (newLength > oldLength) {
      refreshNuxtData("chats");
    }
  }
);

watch(error, (value) => {
  if (!value) return;

  toast.add({
    description: value.message,
    icon: "i-lucide-alert-circle",
    color: "error",
    duration: 0,
  });
});
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
          :messages="uiMessages"
          :status="uiStatus"
          :assistant="
            status === 'ready'
              ? {
                  actions: [
                    {
                      label: 'Copy',
                      icon: copied ? 'i-lucide-copy-check' : 'i-lucide-copy',
                      onClick: copy,
                    },
                  ],
                }
              : { actions: [] }
          "
          :spacing-offset="160"
          class="lg:pt-(--ui-header-height) pb-4 sm:pb-6"
        >
          <template #content="{ message }: { message: FlexiMessage }">
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
                <!-- Show loading dots when waiting for first response (no text yet) -->
                <LoadingDots
                  v-else-if="
                    part.type === 'text' &&
                    'state' in part &&
                    part.state === 'waiting' &&
                    !part.text
                  "
                />
                <!-- Show text content + loading dots when tool is streaming -->
                <template
                  v-else-if="
                    part.type === 'text' &&
                    'state' in part &&
                    part.state === 'waiting' &&
                    part.text
                  "
                >
                  <MDCCached
                    :value="part.text"
                    :cache-key="`${message.id}-${index}`"
                    :components="components"
                    :parser-options="{ highlight: false }"
                    class="*:first:mt-0 *:last:mb-0"
                  />
                  <LoadingDots />
                </template>
                <!-- Show text content when streaming or done -->
                <MDCCached
                  v-else-if="part.type === 'text' && part.text"
                  :value="part.text"
                  :cache-key="`${message.id}-${index}`"
                  :components="components"
                  :parser-options="{ highlight: false }"
                  class="*:first:mt-0 *:last:mb-0"
                />
                <!-- Empty state fallback for text parts without content -->
                <LoadingDots v-else-if="part.type === 'text' && !part.text" />
                <!-- Tool components -->
                <ToolWeather
                  v-else-if="part.type === 'tool-weather'"
                  :invocation="(part as WeatherUIToolInvocation)"
                />
                <ToolChart
                  v-else-if="part.type === 'tool-chart'"
                  :invocation="(part as ChartUIToolInvocation)"
                />
                <ToolCarousel
                  v-else-if="part.type === 'tool-carousel'"
                  :invocation="(part as CarouselUIToolInvocation)"
                />
                <ToolPropertyCard
                  v-else-if="part.type === 'tool-property-card'"
                  :invocation="(part as PropertyCardUIToolInvocation)"
                />
                <ToolImageDisplay
                  v-else-if="part.type === 'tool-image-display'"
                  :invocation="(part as ImageDisplayUIToolInvocation)"
                />
              </template>
            </div>
          </template>
        </UChatMessages>

        <UChatPrompt
          v-model="input"
          :error="error ?? undefined"
          variant="subtle"
          class="sticky bottom-0 [view-transition-name:chat-prompt] rounded-b-none z-10"
          @submit="handleSubmit"
        >
          <template #footer>
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <UIcon name="i-lucide-workflow" class="h-4 w-4 text-primary" />
              <span>
                {{ status !== "ready" ? "Agent responding…" : "Agent ready" }}
              </span>
            </div>

            <UChatPromptSubmit
              :status="uiStatus"
              color="neutral"
              @stop="stop"
            />
          </template>
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>

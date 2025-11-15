<script setup lang="ts">
const input = ref("");
const loading = ref(false);

async function createChat(prompt: string) {
  input.value = prompt;
  loading.value = true;

  try {
    const chat = await $fetch("/api/chats", {
      method: 'POST',
      body: { input: prompt }
    })

    refreshNuxtData('chats')
    navigateTo(`/chat/${chat?.id}`)
  } catch (error) {
    console.error('Error creating chat:', error)
    loading.value = false
  }
}

function onSubmit() {
  if (input.value.trim()) {
    createChat(input.value);
  }
}

const quickChats = [
  {
    label: 'Como funciona o FlexiStays?',
    icon: 'i-lucide-home'
  },
  {
    label: 'Ajude-me a encontrar uma acomodação',
    icon: 'i-lucide-search'
  },
  {
    label: 'Quais são as opções de pagamento?',
    icon: "i-lucide-credit-card"
  },
  {
    label: 'Preciso de ajuda com minha reserva',
    icon: "i-lucide-calendar"
  },
];
</script>

<template>
  <UDashboardPanel id="home" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <DashboardNavbar />
    </template>

    <template #body>
      <UContainer
        class="flex-1 flex flex-col justify-center gap-4 sm:gap-6 py-8"
      >
        <h1 class="text-3xl sm:text-4xl text-highlighted font-bold">
          Como posso ajudar você hoje?
        </h1>

        <UChatPrompt
          v-model="input"
          :status="loading ? 'streaming' : 'ready'"
          class="[view-transition-name:chat-prompt]"
          variant="subtle"
          @submit="onSubmit"
        >
          <UChatPromptSubmit color="neutral" />
        </UChatPrompt>

        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="quickChat in quickChats"
            :key="quickChat.label"
            :icon="quickChat.icon"
            :label="quickChat.label"
            size="sm"
            color="neutral"
            variant="outline"
            class="rounded-full"
            :disabled="loading"
            @click="createChat(quickChat.label)"
          />
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>

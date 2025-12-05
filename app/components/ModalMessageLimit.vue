<script setup lang="ts">
const emit = defineEmits<{
  close: [openLogin: boolean];
}>();

function handleLogin() {
  emit("close", true);
}

function handleCancel() {
  emit("close", false);
}
</script>

<template>
  <UModal
    title="Login Required"
    :ui="{
      footer: 'hidden',
      header: 'border-b border-gray-200 dark:border-gray-700',
      body: 'p-0',
    }"
    :close="true"
    :dismissible="true"
    @close="handleCancel"
  >
    <template #body>
      <div class="p-6 text-center space-y-6">
        <!-- Icon -->
        <div class="flex justify-center">
          <div class="p-4 bg-primary/10 rounded-full">
            <UIcon name="i-lucide-lock" class="w-12 h-12 text-primary" />
          </div>
        </div>

        <!-- Title -->
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">
          You've reached the message limit
        </h2>

        <!-- Description -->
        <p class="text-gray-600 dark:text-gray-400">
          To continue chatting with our assistant and complete your booking,
          please log in or create an account. It only takes a moment!
        </p>

        <!-- Benefits -->
        <div
          class="text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2"
        >
          <p class="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Benefits of creating an account:
          </p>
          <div
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="w-4 h-4 text-green-500"
            />
            <span>Save your chat history</span>
          </div>
          <div
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="w-4 h-4 text-green-500"
            />
            <span>Complete your bookings</span>
          </div>
          <div
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="w-4 h-4 text-green-500"
            />
            <span>Access exclusive deals</span>
          </div>
          <div
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <UIcon
              name="i-lucide-check-circle"
              class="w-4 h-4 text-green-500"
            />
            <span>Manage your reservations</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3">
          <UButton
            label="Log in or Sign up"
            size="lg"
            block
            @click="handleLogin"
          />
          <UButton
            label="Maybe later"
            variant="ghost"
            color="neutral"
            size="lg"
            block
            @click="handleCancel"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

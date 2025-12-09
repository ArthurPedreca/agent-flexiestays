<script setup lang="ts">
import type { ImageDisplayUIToolInvocation } from "../../../shared/utils/tools/image-display";

const props = defineProps<{
  invocation: ImageDisplayUIToolInvocation;
}>();

const isLoading = computed(
  () =>
    props.invocation.state === "input-available" ||
    props.invocation.state === "input-streaming"
);

const isError = computed(() => props.invocation.state === "output-error");
</script>

<template>
  <div class="my-5">
    <!-- Header -->
    <div v-if="invocation.output?.title" class="flex items-center gap-2 mb-2">
      <UIcon name="i-lucide-image" class="size-4 text-primary" />
      <span class="text-sm font-medium text-muted-foreground">{{
        invocation.output.title
      }}</span>
    </div>

    <!-- Loading state -->
    <USkeleton v-if="isLoading" class="h-48 w-full rounded-xl" />

    <!-- Error state -->
    <div
      v-else-if="isError"
      class="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-center"
    >
      <UIcon
        name="i-lucide-triangle-alert"
        class="size-8 mx-auto mb-2 text-red-500"
      />
      <p class="text-sm text-red-600 dark:text-red-400">
        Erro ao carregar imagem
      </p>
    </div>

    <!-- Image -->
    <figure
      v-else-if="
        invocation.state === 'output-available' && invocation.output?.src
      "
      class="overflow-hidden rounded-xl border border-default"
    >
      <img
        :src="invocation.output.src"
        :alt="invocation.output.alt ?? 'Image'"
        class="w-full object-cover max-h-96"
        loading="lazy"
      />
      <figcaption
        v-if="invocation.output.caption"
        class="bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
      >
        {{ invocation.output.caption }}
      </figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
import type { CarouselUIToolInvocation } from "../../../shared/utils/tools/carousel";

const props = defineProps<{
  invocation: CarouselUIToolInvocation;
}>();

const isLoading = computed(
  () =>
    props.invocation.state === "input-available" ||
    props.invocation.state === "input-streaming"
);

const isError = computed(() => props.invocation.state === "output-error");

const title = computed(() => props.invocation.output?.title ?? "Acomodações");

const failedImages = reactive(new Set<string | number>());

function handleImageError(itemKey: string | number) {
  failedImages.add(itemKey);
}

function formatPrice(price: string | number | undefined): string {
  if (!price) return "";
  if (typeof price === "number") return `£${price}`;
  return price;
}
</script>

<template>
  <div class="my-5">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-3">
      <UIcon name="i-lucide-layout-grid" class="size-5 text-primary" />
      <span class="text-sm font-medium text-muted-foreground">{{ title }}</span>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="i in 3" :key="i" class="h-64 w-full rounded-xl" />
    </div>

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
        Erro ao carregar propriedades
      </p>
    </div>

    <!-- Properties Grid -->
    <div
      v-else-if="
        invocation.state === 'output-available' &&
        invocation.output?.items?.length
      "
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="(item, index) in invocation.output.items"
        :key="item.id ?? `item-${index}`"
        class="group flex flex-col overflow-hidden rounded-xl border border-default bg-elevated transition-shadow hover:shadow-lg"
      >
        <!-- Image -->
        <div v-if="item.image && !failedImages.has(item.id ?? `item-${index}`)" class="relative aspect-video overflow-hidden">
          <img
            :src="item.image"
            :alt="item.title"
            class="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
            @error="handleImageError(item.id ?? `item-${index}`)"
          />
          <div
            v-if="item.price"
            class="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-1 text-sm font-semibold text-white"
          >
            {{ formatPrice(item.price)
            }}<span class="text-xs font-normal">/noite</span>
          </div>
        </div>

        <!-- Content -->
        <div class="flex flex-1 flex-col gap-2 p-4">
          <div>
            <h3 class="font-semibold text-highlighted line-clamp-1">
              {{ item.title }}
            </h3>
            <p v-if="item.subtitle" class="text-sm text-muted-foreground">
              {{ item.subtitle }}
            </p>
          </div>

          <p
            v-if="item.description"
            class="text-sm text-muted-foreground line-clamp-2"
          >
            {{ item.description }}
          </p>

          <!-- Tags -->
          <div v-if="item.tags?.length" class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="tag in item.tags.slice(0, 4)"
              :key="tag"
              variant="subtle"
              color="neutral"
              size="xs"
            >
              {{ tag }}
            </UBadge>
            <UBadge
              v-if="item.tags.length > 4"
              variant="subtle"
              color="neutral"
              size="xs"
            >
              +{{ item.tags.length - 4 }}
            </UBadge>
          </div>

          <!-- Actions -->
          <div v-if="item.actions?.length" class="mt-auto flex gap-2 pt-2">
            <UButton
              v-for="(action, actionIndex) in item.actions"
              :key="actionIndex"
              :to="action.url"
              target="_blank"
              size="xs"
              :variant="actionIndex === 0 ? 'solid' : 'outline'"
              :color="actionIndex === 0 ? 'primary' : 'neutral'"
              class="flex-1"
            >
              {{ action.label }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="rounded-xl border border-dashed border-default p-8 text-center"
    >
      <UIcon
        name="i-lucide-home"
        class="size-8 mx-auto mb-2 text-muted-foreground"
      />
      <p class="text-sm text-muted-foreground">
        Nenhuma propriedade encontrada
      </p>
    </div>
  </div>
</template>

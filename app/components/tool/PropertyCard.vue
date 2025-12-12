<script setup lang="ts">
import type { PropertyCardUIToolInvocation } from "../../../shared/utils/tools/property-card";

const props = defineProps<{
  invocation: PropertyCardUIToolInvocation;
}>();

const isLoading = computed(
  () =>
    props.invocation.state === "input-available" ||
    props.invocation.state === "input-streaming"
);

const isError = computed(() => props.invocation.state === "output-error");

const imageError = ref(false);

function handleImageError() {
  imageError.value = true;
}

function formatPrice(price: string | number | undefined): string {
  if (!price) return "";
  if (typeof price === "number") return `£${price}`;
  return price;
}

function formatDetailKey(key: string): string {
  const labels: Record<string, string> = {
    bedrooms: "Quartos",
    bathrooms: "Banheiros",
    guests: "Hóspedes",
    area: "Área",
    beds: "Camas",
  };
  return labels[key.toLowerCase()] ?? key;
}
</script>

<template>
  <div class="my-5">
    <!-- Loading state -->
    <USkeleton v-if="isLoading" class="h-64 w-full rounded-xl" />

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
        Erro ao carregar propriedade
      </p>
    </div>

    <!-- Property Card -->
    <div
      v-else-if="invocation.state === 'output-available' && invocation.output"
      class="overflow-hidden rounded-xl border border-default bg-elevated shadow-sm"
    >
      <div class="flex flex-col sm:flex-row">
        <!-- Image -->
        <div v-if="invocation.output.image && !imageError" class="relative sm:w-2/5">
          <img
            :src="invocation.output.image"
            :alt="invocation.output.title"
            class="h-48 w-full object-cover sm:h-full"
            loading="lazy"
            @error="handleImageError"
          />
          <div
            v-if="invocation.output.price"
            class="absolute bottom-3 left-3 rounded-lg bg-black/70 px-3 py-1.5 text-sm font-bold text-white"
          >
            {{ formatPrice(invocation.output.price)
            }}<span class="text-xs font-normal">/noite</span>
          </div>
        </div>

        <!-- Content -->
        <div class="flex flex-1 flex-col gap-3 p-5">
          <div>
            <h3 class="text-lg font-semibold text-highlighted">
              {{ invocation.output.title }}
            </h3>
            <p
              v-if="invocation.output.subtitle"
              class="text-sm text-muted-foreground"
            >
              {{ invocation.output.subtitle }}
            </p>
          </div>

          <p
            v-if="invocation.output.description"
            class="text-sm text-muted-foreground"
          >
            {{ invocation.output.description }}
          </p>

          <!-- Tags -->
          <div
            v-if="invocation.output.tags?.length"
            class="flex flex-wrap gap-2"
          >
            <UBadge
              v-for="tag in invocation.output.tags"
              :key="tag"
              variant="subtle"
              color="neutral"
              size="sm"
            >
              {{ tag }}
            </UBadge>
          </div>

          <!-- Details grid -->
          <div
            v-if="
              invocation.output.details &&
              Object.keys(invocation.output.details).length
            "
            class="grid grid-cols-2 gap-2 pt-2 border-t border-default"
          >
            <div
              v-for="(value, key) in invocation.output.details"
              :key="key"
              class="flex items-center gap-2"
            >
              <span class="text-xs text-muted-foreground"
                >{{ formatDetailKey(String(key)) }}:</span
              >
              <span class="text-sm font-medium">{{ value }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div
            v-if="invocation.output.actions?.length"
            class="flex gap-2 pt-2 mt-auto"
          >
            <UButton
              v-for="(action, index) in invocation.output.actions"
              :key="index"
              :to="action.url"
              target="_blank"
              size="sm"
              :variant="index === 0 ? 'solid' : 'outline'"
              :color="index === 0 ? 'primary' : 'neutral'"
            >
              {{ action.label }}
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

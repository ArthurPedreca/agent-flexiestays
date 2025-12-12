<script setup lang="ts">
import { useSettings } from "~/composables/useSettings";

const { logo, darkLogo, isLoaded } = useSettings();
const colorMode = useColorMode();

const currentLogo = computed(() => {
  if (!isLoaded.value) return null;
  return colorMode.value === "dark" ? logo.value : darkLogo.value;
});
</script>

<template>
  <img
    v-if="currentLogo"
    :src="currentLogo"
    alt="Flexiestays"
    class="h-8 w-auto shrink-0 object-contain"
  />
  <div v-else class="h-8 w-8 shrink-0 rounded bg-elevated animate-pulse" />
</template>

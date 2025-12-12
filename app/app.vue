<script setup lang="ts">
import { useSettings } from "~/composables/useSettings";

const colorMode = useColorMode();
const { siteName, favicon, primaryColor, initSettings, isLoaded } =
  useSettings();

// Initialize settings on app mount
onMounted(async () => {
  await initSettings();
});

// Dynamic theme color based on mode and API colors
const themeColor = computed(() => {
  if (!isLoaded.value) {
    return colorMode.value === "dark" ? "#0B0C26" : "#F6F6FA";
  }
  return colorMode.value === "dark" ? primaryColor.value : "#F6F6FA";
});

// Dynamic page title
const pageTitle = computed(() =>
  isLoaded.value ? `Agent ${siteName.value}` : "Agent Flexiestays"
);

// Dynamic favicon
const faviconUrl = computed(() =>
  isLoaded.value && favicon.value ? favicon.value : "/favicon.ico"
);

useHead({
  title: pageTitle,
  meta: [
    { charset: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { key: "theme-color", name: "theme-color", content: themeColor },
  ],
  link: [{ rel: "icon", href: faviconUrl, type: "image/png" }],
  htmlAttrs: {
    lang: "en",
  },
});

const description =
  "Your AI-powered assistant for flexible stays and accommodation.";

useSeoMeta({
  title: pageTitle,
  description,
  ogTitle: pageTitle,
  ogDescription: description,
  twitterCard: "summary_large_image",
});
</script>

<template>
  <UApp :toaster="{ position: 'top-right' }">
    <NuxtLoadingIndicator color="var(--ui-primary)" />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

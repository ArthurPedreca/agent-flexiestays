<script setup lang="ts">
const { agentName, webhookUrl, connectionState } = useModels();

const badgeMeta = computed(() => {
  switch (connectionState.value) {
    case "connected":
      return {
        color: "primary" as const,
        icon: "i-lucide-bot",
        text: `${agentName.value} pronto`,
      };
    case "invalid":
      return {
        color: "warning" as const,
        icon: "i-lucide-alert-triangle",
        text: "Webhook inválido",
      };
    default:
      return {
        color: "neutral" as const,
        icon: "i-lucide-plug-zap",
        text: "Configure o webhook do n8n",
      };
  }
});

const webhookPreview = computed(() => {
  if (!webhookUrl.value) {
    return null;
  }

  return webhookUrl.value.replace(/^https?:\/\//, "");
});
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
    <UBadge :color="badgeMeta.color" variant="soft" :icon="badgeMeta.icon">
      {{ badgeMeta.text }}
    </UBadge>
    <span v-if="webhookPreview" class="truncate max-w-[260px]">
      {{ webhookPreview }}
    </span>
  </div>
</template>

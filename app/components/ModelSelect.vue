<script setup lang="ts">
const { agentName } = useModels();
</script>

<template>
  <AgentStatusBadge>
    <template #default>
      {{ agentName }}
    </template>
  </AgentStatusBadge>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import { useAuth } from "~/composables/useAuth";

defineProps<{
  collapsed?: boolean;
}>();

const colorMode = useColorMode();
const { user, logout } = useAuth();

// Get user display name
const displayName = computed(() => {
  if (!user.value) return "User";
  if (user.value.firstName && user.value.lastName) {
    return `${user.value.firstName} ${user.value.lastName}`;
  }
  return user.value.email || "User";
});

// Get user avatar
const userAvatar = computed(() => user.value?.picture || undefined);

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: "label",
      label: displayName.value,
      avatar: {
        src: userAvatar.value,
        alt: displayName.value,
      },
    },
  ],
  [
    {
      label: "Appearance",
      icon: "i-lucide-sun-moon",
      children: [
        {
          label: "Light",
          icon: "i-lucide-sun",
          type: "checkbox",
          checked: colorMode.value === "light",
          onSelect(e: Event) {
            e.preventDefault();
            colorMode.preference = "light";
          },
        },
        {
          label: "Dark",
          icon: "i-lucide-moon",
          type: "checkbox",
          checked: colorMode.value === "dark",
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.preference = "dark";
            }
          },
          onSelect(e: Event) {
            e.preventDefault();
          },
        },
      ],
    },
  ],
  [
    {
      label: "Log out",
      icon: "i-lucide-log-out",
      async onSelect() {
        await logout();
        navigateTo("/");
      },
    },
  ],
]);
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{
      content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)',
    }"
  >
    <UButton
      v-bind="{
        label: collapsed ? undefined : displayName,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
      }"
      :avatar="{
        src: userAvatar,
        alt: displayName,
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
    />
  </UDropdownMenu>
</template>

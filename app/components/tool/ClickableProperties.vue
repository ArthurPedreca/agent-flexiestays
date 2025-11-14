<script setup lang="ts">
interface ClickablePropertiesInvocation {
  type: 'tool-clickable-properties'
  state: string
  text?: string
  clickable_properties?: string[]
  result?: {
    text: string
    clickable_properties: string[]
  }
}

const props = defineProps<{
  invocation: ClickablePropertiesInvocation
}>()

const text = computed(() => {
  return props.invocation.result?.text || props.invocation.text || ''
})

const clickableProperties = computed(() => {
  return props.invocation.result?.clickable_properties || props.invocation.clickable_properties || []
})

// Parse text and replace [[PropertyName]] with clickable elements
const parsedContent = computed(() => {
  let content = text.value
  const parts: Array<{ type: 'text' | 'property', content: string }> = []

  // Regex to match [[PropertyName]]
  const regex = /\[\[([^\]]+)\]\]/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index)
      })
    }

    // Add the property name
    parts.push({
      type: 'property',
      content: match[1]
    })

    lastIndex = regex.lastIndex
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex)
    })
  }

  return parts
})

const emit = defineEmits<{
  selectProperty: [propertyName: string]
}>()

const handlePropertyClick = (propertyName: string) => {
  emit('selectProperty', propertyName)
}

const color = computed(() => {
  return ({
    'output-error': 'bg-muted text-error'
  })[props.invocation.state as string] || 'bg-transparent'
})

const icon = computed(() => {
  return ({
    'input-available': 'i-lucide-building',
    'output-error': 'i-lucide-triangle-alert'
  })[props.invocation.state as string] || 'i-lucide-loader-circle'
})

const message = computed(() => {
  return ({
    'input-available': 'Loading...',
    'output-error': 'Can\'t load content, please try again'
  })[props.invocation.state as string] || 'Loading...'
})
</script>

<template>
  <div class="my-2">
    <template v-if="invocation.state === 'result' || invocation.state === 'output-available'">
      <div class="text-base">
        <template v-for="(part, index) in parsedContent" :key="index">
          <span v-if="part.type === 'text'">{{ part.content }}</span>
          <button
            v-else
            class="inline-flex items-center gap-1 px-2 py-0.5 mx-1 text-primary bg-primary/10 hover:bg-primary/20 rounded-md font-medium transition-colors duration-200 border border-primary/20"
            @click="handlePropertyClick(part.content)"
          >
            <UIcon name="i-lucide-building-2" class="size-3.5" />
            <span>{{ part.content }}</span>
          </button>
        </template>
      </div>
    </template>

    <!-- Loading/Error state -->
    <div v-else class="rounded-xl px-5 py-4" :class="color">
      <div class="flex items-center justify-center">
        <div class="text-center">
          <UIcon
            :name="icon"
            class="size-6 mx-auto mb-1"
            :class="[invocation.state === 'input-streaming' && 'animate-spin']"
          />
          <div class="text-sm">
            {{ message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

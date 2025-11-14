<script setup lang="ts">
interface Property {
  id: string
  name: string
  nickname?: string
  price: number
  image: string
}

interface CarouselInvocation {
  type: 'tool-carousel'
  state: string
  properties?: Property[]
  result?: {
    properties: Property[]
  }
}

const props = defineProps<{
  invocation: CarouselInvocation
}>()

const properties = computed(() => {
  return props.invocation.result?.properties || props.invocation.properties || []
})

const scrollContainer = ref<HTMLElement>()

const scrollLeft = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: -320, behavior: 'smooth' })
  }
}

const scrollRight = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: 320, behavior: 'smooth' })
  }
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
    'input-available': 'Loading properties...',
    'output-error': 'Can\'t load properties, please try again'
  })[props.invocation.state as string] || 'Loading properties...'
})

const emit = defineEmits<{
  selectProperty: [propertyId: string]
}>()

const handlePropertyClick = (propertyId: string) => {
  emit('selectProperty', propertyId)
}
</script>

<template>
  <div class="my-5">
    <template v-if="invocation.state === 'result' || invocation.state === 'output-available'">
      <div class="relative group">
        <!-- Left scroll button -->
        <button
          class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
          @click="scrollLeft"
        >
          <UIcon name="i-lucide-chevron-left" class="size-5" />
        </button>

        <!-- Carousel container -->
        <div
          ref="scrollContainer"
          class="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar snap-x snap-mandatory py-2"
        >
          <div
            v-for="property in properties"
            :key="property.id"
            class="flex-shrink-0 w-[300px] snap-start"
          >
            <button
              class="w-full text-left bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer border border-gray-200 dark:border-gray-700"
              @click="handlePropertyClick(property.id)"
            >
              <!-- Property image -->
              <div class="relative h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <img
                  v-if="property.image"
                  :src="property.image"
                  :alt="property.name"
                  class="w-full h-full object-cover"
                >
                <div v-else class="w-full h-full flex items-center justify-center">
                  <UIcon name="i-lucide-building" class="size-16 text-gray-400" />
                </div>
              </div>

              <!-- Property details -->
              <div class="p-4">
                <div v-if="property.nickname" class="text-xs text-primary font-semibold mb-1">
                  {{ property.nickname }}
                </div>
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {{ property.name }}
                </h3>
                <div class="flex items-center justify-between">
                  <div class="text-xl font-bold text-primary">
                    £{{ property.price }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    per night
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Right scroll button -->
        <button
          class="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
          @click="scrollRight"
        >
          <UIcon name="i-lucide-chevron-right" class="size-5" />
        </button>
      </div>
    </template>

    <!-- Loading/Error state -->
    <div v-else class="rounded-xl px-5 py-4" :class="color">
      <div class="flex items-center justify-center h-44">
        <div class="text-center">
          <UIcon
            :name="icon"
            class="size-8 mx-auto mb-2"
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

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

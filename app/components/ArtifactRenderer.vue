<script setup lang="ts">
import type { ArtifactUIPart } from '../../shared/types/chat'

interface CarouselAction {
  label?: string
  url?: string
}

interface CarouselItem {
  id?: string
  title?: string
  subtitle?: string
  description?: string
  image?: string
  tags?: string[]
  price?: string | number
  details?: Record<string, string | number>
  actions?: CarouselAction[]
}

interface CardData {
  id?: string
  title?: string
  subtitle?: string
  description?: string
  image?: string
  tags?: string[]
  price?: string | number
  details?: Record<string, string | number>
  actions?: CarouselAction[]
}

interface ImageData {
  src?: string
  alt?: string
  caption?: string
}

const props = defineProps<{ artifact: ArtifactUIPart }>()

const isPending = computed(() => props.artifact.state === 'streaming')

// Type checkers
const isCarousel = computed(() => props.artifact.artifactType === 'carousel')
const isCard = computed(() => props.artifact.artifactType === 'card')
const isImage = computed(() => props.artifact.artifactType === 'image')

// Data extractors
const carouselItems = computed<CarouselItem[]>(() => {
  const rawItems = props.artifact.data?.items
  return Array.isArray(rawItems) ? rawItems : []
})

const cardData = computed<CardData>(() => {
  return props.artifact.data as CardData ?? {}
})

const imageData = computed<ImageData>(() => {
  return props.artifact.data as ImageData ?? {}
})

const title = computed(() => props.artifact.title ?? getFallbackTitle(props.artifact.artifactType))
const formattedData = computed(() => JSON.stringify(props.artifact.data ?? {}, null, 2))

const failedImages = reactive(new Set<string | number>())
const cardImageError = ref(false)
const singleImageError = ref(false)

function handleCarouselImageError(itemKey: string | number) {
  failedImages.add(itemKey)
}

function handleCardImageError() {
  cardImageError.value = true
}

function handleSingleImageError() {
  singleImageError.value = true
}

function getFallbackTitle(type: string): string {
  const titles: Record<string, string> = {
    carousel: 'Property Suggestions',
    card: 'Property Details',
    image: 'Image',''
    map: 'Location'
  }
  return titles[type] ?? 'Information'
}

function formatPrice(price: string | number | undefined): string {
  if (!price) return ''
  if (typeof price === 'number') return `£${price}`
  return price
}
</script>

<template>
  <div class="my-4 space-y-3">
    <!-- Header -->
    <div v-if="title || artifact.description" class="flex items-center gap-2">
      <UIcon
        :name="
          isCarousel
            ? 'i-lucide-layout-grid'
            : isCard
            ? 'i-lucide-square'
            : isImage
            ? 'i-lucide-image'
            : 'i-lucide-box'
        "
        class="size-4 text-primary"
      />
      <span class="text-sm font-medium text-muted-foreground">{{ title }}</span>
    </div>

    <!-- Loading state -->
    <USkeleton v-if="isPending" class="h-48 w-full rounded-xl" />

    <!-- CAROUSEL: Multiple properties -->
    <div
      v-else-if="isCarousel && carouselItems.length"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="(item, index) in carouselItems"
        :key="item.id ?? `carousel-${index}`"
        class="group flex flex-col overflow-hidden rounded-xl border border-default bg-elevated transition-shadow hover:shadow-lg"
      >
        <!-- Image -->
        <div
          v-if="item.image && !failedImages.has(item.id ?? `carousel-${index}`)"
          class="relative aspect-video overflow-hidden"
        >
          <img
            :src="item.image"
            :alt="item.title ?? 'Property image'"
            class="h-full w-full object-cover transition-transform group-hover:scale-105"
            @error="handleCarouselImageError(item.id ?? `carousel-${index}`)"
          />
          <div
            v-if="item.price"
            class="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-1 text-sm font-semibold text-white"
          >
            {{ formatPrice(item.price) }}/night
          </div>
        </div>

        <!-- Content -->
        <div class="flex flex-1 flex-col gap-2 p-4">
          <div>
            <h4 class="font-semibold text-foreground line-clamp-1">
              {{ item.title ?? `Property ${index + 1}` }}
            </h4>
            <p v-if="item.subtitle" class="text-xs text-muted-foreground">
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
              size="xs"
              variant="soft"
              color="neutral"
            >
              {{ tag }}
            </UBadge>
          </div>

          <!-- Actions -->
          <div v-if="item.actions?.length" class="mt-auto flex gap-2 pt-2">
            <UButton
              v-for="(action, actionIdx) in item.actions"
              :key="action.url ?? actionIdx"
              :to="action.url"
              size="xs"
              variant="soft"
              color="primary"
              target="_blank"
            >
              {{ action.label ?? "View" }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- CARD: Single property highlight -->
    <div
      v-else-if="isCard && cardData"
      class="overflow-hidden rounded-xl border border-default bg-elevated shadow-sm"
    >
      <div class="flex flex-col sm:flex-row">
        <!-- Image -->
        <div v-if="cardData.image && !cardImageError" class="relative sm:w-2/5">
          <img
            :src="cardData.image"
            :alt="cardData.title ?? 'Property image'"
            class="h-48 w-full object-cover sm:h-full"
            @error="handleCardImageError"
          />
          <div
            v-if="cardData.price"
            class="absolute bottom-3 left-3 rounded-lg bg-black/70 px-3 py-1.5 text-sm font-bold text-white"
          >
            {{ formatPrice(cardData.price) }}/night
          </div>
        </div>

        <!-- Content -->
        <div class="flex flex-1 flex-col gap-3 p-5">
          <div>
            <h3 class="text-lg font-bold text-foreground">
              {{ cardData.title ?? "Property" }}
            </h3>
            <p v-if="cardData.subtitle" class="text-sm text-muted-foreground">
              {{ cardData.subtitle }}
            </p>
          </div>

          <p v-if="cardData.description" class="text-sm text-muted-foreground">
            {{ cardData.description }}
          </p>

          <!-- Tags -->
          <div v-if="cardData.tags?.length" class="flex flex-wrap gap-2">
            <UBadge
              v-for="tag in cardData.tags"
              :key="tag"
              size="sm"
              variant="soft"
              color="primary"
            >
              {{ tag }}
            </UBadge>
          </div>

          <!-- Details grid -->
          <div
            v-if="cardData.details && Object.keys(cardData.details).length"
            class="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-sm"
          >
            <div
              v-for="(value, key) in cardData.details"
              :key="key"
              class="flex flex-col"
            >
              <span class="text-xs text-muted-foreground capitalize">{{
                key
              }}</span>
              <span class="font-medium">{{ value }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div
            v-if="cardData.actions?.length"
            class="mt-auto flex flex-wrap gap-2 pt-2"
          >
            <UButton
              v-for="(action, idx) in cardData.actions"
              :key="action.url ?? idx"
              :to="action.url"
              :variant="idx === 0 ? 'solid' : 'outline'"
              :color="idx === 0 ? 'primary' : 'neutral'"
              size="sm"
              target="_blank"
            >
              {{ action.label ?? "View" }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- IMAGE: Single image with caption -->
    <figure
      v-else-if="isImage && imageData.src && !singleImageError"
      class="overflow-hidden rounded-xl border border-default"
    >
      <img
        :src="imageData.src"
        :alt="imageData.alt ?? 'Image'"
        class="w-full object-cover"
        @error="handleSingleImageError"
      />
      <figcaption
        v-if="imageData.caption"
        class="bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
      >
        {{ imageData.caption }}
      </figcaption>
    </figure>

    <!-- FALLBACK: Unknown artifact type -->
    <div
      v-else
      class="rounded-xl border border-dashed border-default bg-muted/20 p-4"
    >
      <p class="mb-2 text-xs text-muted-foreground">
        Artifact: {{ artifact.artifactType }}
      </p>
      <pre class="max-h-40 overflow-auto text-xs text-muted-foreground">{{
        formattedData
      }}</pre>
    </div>
  </div>
</template>

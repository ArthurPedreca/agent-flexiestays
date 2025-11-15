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
  actions?: CarouselAction[]
}

const props = defineProps<{ artifact: ArtifactUIPart }>()

const isPending = computed(() => props.artifact.state === 'streaming')
const isCarousel = computed(() => props.artifact.artifactType === 'carousel')
const isMap = computed(() => props.artifact.artifactType === 'map')

const carouselItems = computed<CarouselItem[]>(() => {
  const rawItems = props.artifact.data ? props.artifact.data['items'] : undefined
  return Array.isArray(rawItems) ? rawItems as CarouselItem[] : []
})

const mapInfo = computed(() => normalizeMapData(props.artifact.data))
const mapLink = computed(() => mapInfo.value ? getMapLink(mapInfo.value.lat, mapInfo.value.lng) : null)
const formattedData = computed(() => JSON.stringify(props.artifact.data ?? {}, null, 2))
const title = computed(() => props.artifact.title ?? getFallbackTitle(props.artifact.artifactType))
</script>

<template>
  <div class="space-y-4 rounded-2xl border border-default bg-muted/20 p-4 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-1">
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Artifact
        </p>
        <p class="text-base font-semibold text-foreground">
          {{ title }}
        </p>
        <p v-if="artifact.description" class="text-sm text-muted-foreground">
          {{ artifact.description }}
        </p>
      </div>
      <UBadge
        v-if="artifact.artifactType"
        color="primary"
        variant="soft"
        class="uppercase tracking-wide"
      >
        {{ artifact.artifactType }}
      </UBadge>
    </div>

    <USkeleton v-if="isPending" class="h-32 w-full rounded-xl" />

    <template v-else>
      <div v-if="isCarousel" class="grid gap-3 md:grid-cols-2">
        <div
          v-for="(item, index) in carouselItems"
          :key="item.id ?? `${artifact.id}-carousel-${index}`"
          class="flex h-full flex-col gap-3 rounded-xl border border-default bg-background/90 p-4"
        >
          <img
            v-if="item.image"
            :src="item.image"
            :alt="item.title ?? 'Imagem do item'"
            class="h-40 w-full rounded-lg object-cover"
          >

          <div class="space-y-1">
            <p class="text-sm font-semibold">
              {{ item.title ?? `Item ${index + 1}` }}
            </p>
            <p v-if="item.subtitle" class="text-xs uppercase text-muted-foreground">
              {{ item.subtitle }}
            </p>
            <p v-if="item.description" class="text-sm text-muted-foreground">
              {{ item.description }}
            </p>
          </div>

          <div v-if="item.tags?.length" class="flex flex-wrap gap-2">
            <UBadge
              v-for="tag in item.tags"
              :key="tag"
              size="xs"
              variant="soft"
            >
              {{ tag }}
            </UBadge>
          </div>

          <div v-if="item.actions?.length" class="mt-auto flex flex-wrap gap-2">
            <UButton
              v-for="(action, actionIndex) in item.actions"
              :key="action.url ?? actionIndex"
              :to="action.url"
              size="xs"
              variant="soft"
              color="primary"
              target="_blank"
              icon="i-lucide-arrow-up-right"
            >
              {{ action.label ?? 'Abrir' }}
            </UButton>
          </div>
        </div>
      </div>

      <div v-else-if="isMap" class="space-y-3">
        <div class="rounded-xl border border-default bg-background/90 p-4">
          <p class="text-sm font-medium text-foreground">
            {{ mapInfo?.label ?? 'Localização sugerida' }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ formatCoordinates(mapInfo?.lat, mapInfo?.lng) }}
          </p>
          <p v-if="mapInfo?.address" class="text-sm text-muted-foreground">
            {{ mapInfo.address }}
          </p>
          <div v-if="mapLink" class="mt-3">
            <UButton
              :to="mapLink"
              target="_blank"
              size="xs"
              variant="soft"
              color="primary"
              icon="i-lucide-map"
            >
              Abrir no mapa
            </UButton>
          </div>
        </div>
        <div class="h-52 rounded-xl border border-dashed border-default bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          Visualização interativa do mapa poderá ser exibida aqui no futuro.
        </div>
      </div>

      <div v-else class="rounded-xl border border-dashed border-default bg-background/80">
        <pre class="max-h-80 overflow-auto rounded-xl p-4 text-xs text-muted-foreground">
{{ formattedData }}
        </pre>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
function getFallbackTitle(type: string) {
  switch (type) {
    case 'carousel':
      return 'Sugestões do agente'
    case 'map':
      return 'Localização recomendada'
    default:
      return 'Informação do agente'
  }
}

interface MapInfo {
  lat: number
  lng: number
  label?: string
  address?: string
}

function normalizeMapData(data: Record<string, unknown> | undefined): MapInfo | null {
  if (!data) return null
  const lat = getNumber(data['lat'] ?? data['latitude'])
  const lng = getNumber(data['lng'] ?? data['longitude'] ?? data['lon'])

  if (lat === null || lng === null) {
    return null
  }

  return {
    lat,
    lng,
    label: typeof data['label'] === 'string' ? data['label'] as string : undefined,
    address: typeof data['address'] === 'string' ? data['address'] as string : undefined
  }
}

function getNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function getMapLink(lat: number, lng: number) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`
}

function formatCoordinates(lat?: number, lng?: number) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return 'Coordenadas indisponíveis'
  }

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}
</script>

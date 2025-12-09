import { tool } from 'ai'
import { z } from 'zod'
import type { UIToolInvocation } from 'ai'

export type CarouselUIToolInvocation = UIToolInvocation<typeof carouselTool>

const carouselItemSchema = z.object({
  id: z.string().optional().describe('Unique identifier for the property'),
  title: z.string().describe('Property title/name'),
  subtitle: z.string().optional().describe('Location or secondary info'),
  description: z.string().optional().describe('Brief description of the property'),
  image: z.string().optional().describe('Image URL for the property'),
  tags: z.array(z.string()).optional().describe('Feature tags like "Wi-Fi", "Pool", etc.'),
  price: z.union([z.string(), z.number()]).optional().describe('Price per night'),
  details: z.record(z.string(), z.union([z.string(), z.number()])).optional().describe('Additional details'),
  actions: z.array(z.object({
    label: z.string().describe('Button label'),
    url: z.string().describe('Action URL')
  })).optional().describe('Action buttons')
})

export const carouselTool = tool({
  description: 'Display a carousel/grid of property cards. Use this to show multiple accommodation options to the user.',
  inputSchema: z.object({
    title: z.string().optional().describe('Title for the carousel section'),
    items: z.array(carouselItemSchema).min(1).describe('Array of properties to display')
  }),
  execute: async ({ title, items }) => {
    return {
      title,
      items
    }
  }
})

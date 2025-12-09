import { tool } from 'ai'
import { z } from 'zod'
import type { UIToolInvocation } from 'ai'

export type PropertyCardUIToolInvocation = UIToolInvocation<typeof propertyCardTool>

export const propertyCardTool = tool({
  description: 'Display a single property card with detailed information. Use this to highlight one specific accommodation.',
  inputSchema: z.object({
    id: z.string().optional().describe('Unique identifier for the property'),
    title: z.string().describe('Property title/name'),
    subtitle: z.string().optional().describe('Location or secondary info'),
    description: z.string().optional().describe('Detailed description of the property'),
    image: z.string().optional().describe('Image URL for the property'),
    tags: z.array(z.string()).optional().describe('Feature tags like "Wi-Fi", "Pool", etc.'),
    price: z.union([z.string(), z.number()]).optional().describe('Price per night'),
    details: z.record(z.string(), z.union([z.string(), z.number()])).optional().describe('Additional details like bedrooms, bathrooms, etc.'),
    actions: z.array(z.object({
      label: z.string().describe('Button label'),
      url: z.string().describe('Action URL')
    })).optional().describe('Action buttons')
  }),
  execute: async (data) => {
    return data
  }
})

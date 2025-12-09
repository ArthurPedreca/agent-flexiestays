import { tool } from 'ai'
import { z } from 'zod'
import type { UIToolInvocation } from 'ai'

export type ImageDisplayUIToolInvocation = UIToolInvocation<typeof imageDisplayTool>

export const imageDisplayTool = tool({
  description: 'Display an image with optional caption. Use this to show property photos or any relevant images.',
  inputSchema: z.object({
    src: z.string().describe('Image URL'),
    alt: z.string().optional().describe('Alt text for accessibility'),
    caption: z.string().optional().describe('Caption to display below the image'),
    title: z.string().optional().describe('Title above the image')
  }),
  execute: async (data) => {
    return data
  }
})

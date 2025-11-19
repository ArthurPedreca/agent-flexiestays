import n8nHandler from './[id]/stream.post'

defineRouteMeta({
  openAPI: {
    description: 'Chat with n8n AI Agent (legacy route).',
    tags: ['ai', 'n8n']
  }
})

export default n8nHandler

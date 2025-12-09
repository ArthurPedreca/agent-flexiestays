# Formato de Tool Calls para Agentes n8n

Este documento explica como os agentes devem formatar suas respostas para exibir componentes visuais no chat.

## Formato Geral

Use tags `[tool:nome]` para envolver o JSON do componente:

```
[tool:nome-da-tool]{"campo": "valor"}[/tool]
```

## Tools Disponíveis

### 1. Carousel (Grid de Propriedades)

Use para mostrar múltiplas propriedades/acomodações:

```
[tool:carousel]{
  "title": "Acomodações Disponíveis",
  "items": [
    {
      "id": "prop-1",
      "title": "Apartamento Moderno",
      "subtitle": "Bournemouth, Reino Unido",
      "description": "Lindo apartamento com vista para o mar",
      "image": "https://example.com/image.jpg",
      "tags": ["Wi-Fi", "Estacionamento", "2 Quartos"],
      "price": 120,
      "actions": [
        {"label": "Ver Detalhes", "url": "/property/prop-1"}
      ]
    }
  ]
}[/tool]
```

### 2. Property Card (Card Individual)

Use para destacar uma única propriedade com mais detalhes:

```
[tool:property-card]{
  "id": "prop-1",
  "title": "Studio Premium Centro",
  "subtitle": "São Paulo, Brasil",
  "description": "Studio completo no coração da cidade, perfeito para viajantes a negócios.",
  "image": "https://example.com/studio.jpg",
  "tags": ["Wi-Fi", "Academia", "Cozinha Equipada"],
  "price": 180,
  "details": {
    "bedrooms": 1,
    "bathrooms": 1,
    "guests": 2,
    "area": "35m²"
  },
  "actions": [
    {"label": "Reservar", "url": "/booking/prop-1"},
    {"label": "Ver Mais", "url": "/property/prop-1"}
  ]
}[/tool]
```

### 3. Image Display (Imagem)

Use para mostrar uma imagem com legenda opcional:

```
[tool:image-display]{
  "src": "https://example.com/photo.jpg",
  "alt": "Vista da piscina",
  "caption": "Piscina aquecida disponível 24h",
  "title": "Área de Lazer"
}[/tool]
```

## Exemplos de Uso

### Resposta com Carousel

```
Encontrei algumas opções perfeitas para você! Aqui estão as melhores acomodações em Bournemouth:

[tool:carousel]{
  "title": "Acomodações em Bournemouth",
  "items": [
    {
      "title": "Bright & Stylish 1-Bed Apt",
      "subtitle": "Bournemouth, Reino Unido",
      "description": "Apartamento moderno com 1 quarto, estacionamento gratuito e Wi-Fi",
      "image": "https://assets.guesty.com/...",
      "tags": ["Wi-Fi", "Estacionamento", "1 Quarto"],
      "price": 100,
      "actions": [{"label": "Ver Detalhes", "url": "/property/bright-stylish-1-bed"}]
    },
    {
      "title": "Shore Retreat Apartments",
      "subtitle": "Bournemouth, Reino Unido",
      "description": "Apartamentos com check-in automatizado e cozinha equipada",
      "image": "https://assets.guesty.com/...",
      "tags": ["Cozinha", "Check-in Automático"],
      "price": 55,
      "actions": [{"label": "Ver Detalhes", "url": "/property/shore-retreat"}]
    }
  ]
}[/tool]

Quer mais informações sobre alguma dessas opções?
```

### Resposta com Card Individual

```
Excelente escolha! Aqui estão os detalhes do apartamento que você selecionou:

[tool:property-card]{
  "title": "Bright & Stylish King Bed Apt",
  "subtitle": "Bournemouth, Reino Unido",
  "description": "Apartamento premium com cama king size, academia gratuita e localização privilegiada próximo à praia. Ideal para casais ou viajantes a negócios que buscam conforto e praticidade.",
  "image": "https://assets.guesty.com/...",
  "tags": ["Wi-Fi", "Academia", "Cama King", "Beira-mar"],
  "price": 135,
  "details": {
    "bedrooms": 1,
    "bathrooms": 1,
    "guests": 2
  },
  "actions": [
    {"label": "Reservar Agora", "url": "/booking/bright-stylish-king"},
    {"label": "Ver Fotos", "url": "/property/bright-stylish-king/photos"}
  ]
}[/tool]

Posso ajudar com a reserva ou tem alguma dúvida?
```

## Notas Importantes

1. **JSON deve ser válido**: Certifique-se de que o JSON dentro das tags seja válido
2. **Não quebre linhas no JSON**: Mantenha o JSON em uma linha ou use escape correto
3. **URLs das imagens**: Use URLs completas e válidas
4. **Preços**: Podem ser número ou string (ex: `100` ou `"£100"`)
5. **Tags**: Limite a 4-5 tags mais relevantes
6. **Actions**: O primeiro action será o botão principal (destaque)

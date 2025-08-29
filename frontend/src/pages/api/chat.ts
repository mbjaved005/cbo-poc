import type { NextApiRequest, NextApiResponse } from 'next'

interface ChatRequest {
  message: string
  conversation_id?: string
  language?: 'en' | 'ar'
}

interface ChatResponse {
  response: string
  // Backward-compat for UI expecting `message`
  message?: string
  conversation_id: string
  sources?: Array<{
    text: string
    score: number
    metadata: Record<string, string>
  }>
  language: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | { detail: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' })
  }

  try {
    const { message, conversation_id, language = 'en' }: ChatRequest = req.body

    if (!message?.trim()) {
      return res.status(400).json({ detail: 'Message is required' })
    }

    // Get auth token from request headers
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Authorization required' })
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    
    // Forward request to FastAPI backend
    const response = await fetch(`${backendUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        message,
        conversation_id,
        language,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return res.status(response.status).json({ 
        detail: errorData.detail || 'Chat request failed' 
      })
    }

    const raw = await response.json()
    const mapped: ChatResponse = {
      response: raw.response ?? raw.message ?? '',
      message: raw.response ?? raw.message ?? '',
      conversation_id: raw.conversation_id ?? raw.id ?? conversation_id ?? '',
      sources: raw.sources ?? raw.response?.sources ?? [],
      language,
    }
    return res.status(200).json(mapped)

  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({ 
      detail: 'Internal server error' 
    })
  }
}

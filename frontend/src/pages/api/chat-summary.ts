import type { NextApiRequest, NextApiResponse } from 'next'

interface SummaryResponse {
  summary: string
  language: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SummaryResponse | { detail: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' })
  }

  try {
    // Require auth token from client
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Authorization required' })
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

    const response = await fetch(`${backendUrl}/chat-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(req.body || {}),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return res.status(response.status).json({
        detail: errorData.detail || 'Chat summary request failed',
      })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    console.error('chat-summary API error:', error)
    return res.status(500).json({ detail: 'Internal server error' })
  }
}

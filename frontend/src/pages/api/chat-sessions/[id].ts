import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

  // Require auth token from client
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Authorization required' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ detail: 'Invalid session id' })
  }

  try {
    if (req.method === 'DELETE') {
      const response = await fetch(`${backendUrl}/chat-sessions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader,
        },
      })

      if (response.status === 204) {
        return res.status(204).end()
      }

      const data = await response.json().catch(() => ({}))
      return res.status(response.status).json(data)
    }

    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ detail: 'Method not allowed' })
  } catch (error) {
    console.error('chat-sessions/[id] API error:', error)
    return res.status(500).json({ detail: 'Internal server error' })
  }
}

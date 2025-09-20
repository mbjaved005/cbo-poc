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

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${backendUrl}/chat-sessions`, {
        headers: {
          'Authorization': authHeader,
        },
      })

      const data = await response.json().catch(() => ({}))
      return res.status(response.status).json(data)
    }

    if (req.method === 'POST') {
      const response = await fetch(`${backendUrl}/chat-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(req.body || {}),
      })

      const data = await response.json().catch(() => ({}))
      return res.status(response.status).json(data)
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ detail: 'Method not allowed' })
  } catch (error) {
    console.error('chat-sessions API error:', error)
    return res.status(500).json({ detail: 'Internal server error' })
  }
}

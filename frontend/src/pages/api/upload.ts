import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

interface UploadResponse {
  response: string
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
  res: NextApiResponse<UploadResponse | { detail: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' })
  }

  try {
    // Get auth token from request headers
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Authorization required' })
    }

    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file
    const message = Array.isArray(fields.message) ? fields.message[0] : fields.message || ''
    const conversation_id = Array.isArray(fields.conversation_id) ? fields.conversation_id[0] : fields.conversation_id
    const language = Array.isArray(fields.language) ? fields.language[0] : fields.language || 'en'

    if (!file) {
      return res.status(400).json({ detail: 'No file uploaded' })
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    
    // Create FormData for backend request
    const formData = new FormData()
    const fileBuffer = fs.readFileSync(file.filepath)
    const blob = new Blob([fileBuffer], { type: file.mimetype || 'application/octet-stream' })
    
    formData.append('file', blob, file.originalFilename || 'upload')
    formData.append('message', message)
    if (conversation_id) {
      formData.append('conversation_id', conversation_id)
    }
    formData.append('language', language)

    // Forward request to FastAPI backend
    const response = await fetch(`${backendUrl}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: formData,
    })

    // Clean up temporary file
    fs.unlinkSync(file.filepath)

    if (!response.ok) {
      const errorData = await response.json()
      return res.status(response.status).json({ 
        detail: errorData.detail || 'File upload failed' 
      })
    }

    const data: UploadResponse = await response.json()
    return res.status(200).json(data)

  } catch (error) {
    console.error('Upload API error:', error)
    return res.status(500).json({ 
      detail: 'Internal server error' 
    })
  }
}

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
  // Backward-compat for UI expecting `message`
  message?: string
  conversation_id: string
  sources?: Array<{
    text: string
    score: number
    metadata: Record<string, string>
  }>
  language: 'en' | 'ar'
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
    const languageField = Array.isArray(fields.language) ? fields.language[0] : fields.language || 'en'
    const lang: 'en' | 'ar' = languageField === 'ar' ? 'ar' : 'en'

    if (!file) {
      return res.status(400).json({ detail: 'No file uploaded' })
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

    // Read file content (prefer text; fallback to base64 for binaries)
    let content: string
    try {
      content = fs.readFileSync(file.filepath, 'utf-8')
    } catch (e) {
      const buf = fs.readFileSync(file.filepath)
      const b64 = (buf as Buffer).toString('base64')
      content = `[binary:${file.mimetype || 'application/octet-stream'};base64]\n${b64}`
    }

    // 1) Upload the document to backend as JSON
    const uploadResp = await fetch(`${backendUrl}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        filename: file.originalFilename || 'upload',
        content,
        classification: 'public',
      }),
    })

    // Clean up temporary file
    fs.unlinkSync(file.filepath)

    if (!uploadResp.ok) {
      const errorData = await uploadResp.json().catch(() => ({}))
      return res.status(uploadResp.status).json({
        detail: errorData.detail || 'File upload failed',
      })
    }

    // 2) Trigger chat to keep UI flow consistent
    const chatResp = await fetch(`${backendUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        message: message || (lang === 'ar' ? 'تم رفع ملف.' : 'File uploaded.'),
        conversation_id,
        language: lang,
      }),
    })

    if (!chatResp.ok) {
      const errorData = await chatResp.json().catch(() => ({}))
      return res.status(chatResp.status).json({
        detail: errorData.detail || 'Chat request after upload failed',
      })
    }

    const chatData = await chatResp.json()
    const mapped: UploadResponse = {
      response: chatData.response ?? chatData.message ?? '',
      message: chatData.response ?? chatData.message ?? '',
      conversation_id: chatData.conversation_id ?? conversation_id ?? '',
      sources: chatData.sources ?? [],
      language: lang,
    }
    return res.status(200).json(mapped)

  } catch (error) {
    console.error('Upload API error:', error)
    return res.status(500).json({ 
      detail: 'Internal server error' 
    })
  }
}

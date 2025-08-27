import type { NextApiRequest, NextApiResponse } from 'next';

type LoginRequest = {
  username: string;
  password: string;
};

type LoginResponse = {
  access_token?: string;
  token_type?: string;
  user?: {
    id: number;
    username: string;
    role: string;
  };
  detail?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const { username, password }: LoginRequest = req.body;

  if (!username || !password) {
    return res.status(400).json({ detail: 'Username and password are required' });
  }

  try {
    // Get backend URL from environment or use default
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // Forward the login request to FastAPI backend
    const response = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Success - return the token and user info
      return res.status(200).json({
        access_token: data.access_token,
        token_type: data.token_type,
        user: data.user,
      });
    } else {
      // Authentication failed
      return res.status(response.status).json({
        detail: data.detail || 'Authentication failed',
      });
    }
  } catch (error) {
    console.error('Login API error:', error);
    return res.status(500).json({
      detail: 'Internal server error. Please try again later.',
    });
  }
}

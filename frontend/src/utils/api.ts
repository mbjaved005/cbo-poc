// API utility functions with validation
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

// Centralized API client with validation
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Ensure JSON content type for POST/PUT requests
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.detail || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      console.error('API Request Error:', error);
      return {
        error: 'Network error. Please check your connection.',
        status: 0,
      };
    }
  }

  // Validated login method
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    // Validate input format
    if (!credentials.username || !credentials.password) {
      return {
        error: 'Username and password are required',
        status: 400,
      };
    }

    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

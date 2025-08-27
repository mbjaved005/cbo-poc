import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Menu and Help icons (using simple SVGs for now)
const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HelpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { apiClient } = await import('../utils/api');
      const result = await apiClient.login(formData);

      if (result.data) {
        // Store token and user info
        localStorage.setItem('token', result.data.access_token);
        localStorage.setItem('user_info', JSON.stringify(result.data.user));
        router.push('/dashboard');
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please check your internet connection.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>CBO Banking - Sign In</title>
        <meta name="description" content="Central Bank of Oman Banking Portal - Secure Login" />
      </Head>
      
      <div className="bg-cbo-background min-h-screen relative">
        {/* Header with Menu and Help icons */}
        <div className="absolute top-8 left-7">
          <button className="w-[42px] h-[42px] flex items-center justify-center text-black hover:bg-black/5 rounded-lg transition-colors">
            <MenuIcon />
          </button>
        </div>
        
        <div className="absolute top-8 right-7">
          <button className="w-[42px] h-[42px] flex items-center justify-center text-[#1e1e1e] hover:bg-black/5 rounded-lg transition-colors">
            <HelpIcon />
          </button>
        </div>

        {/* CBO Logo/Brand */}
        <div className="absolute top-[26px] left-1/2 transform -translate-x-1/2">
          <div className="bg-[#000000] h-[54px] w-[153px] flex items-center justify-center rounded-lg">
            <span className="text-white font-['Source_Sans_Pro'] font-semibold text-lg">
              CBO BANKING
            </span>
          </div>
        </div>

        {/* Main Login Content */}
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-md">
            {/* Welcome Text */}
            <div className="text-center mb-8">
              <h1 className="font-source-sans font-semibold text-cbo-text-dark text-4xl mb-3">
                Welcome Back
              </h1>
              <p className="font-source-sans text-cbo-text-secondary text-lg">
                Sign in to your CBO Banking account
              </p>
            </div>

            {/* Login Form Card */}
            <div className="bg-white rounded-[21px] p-8 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[12px] text-sm" data-testid="error-message">
                    {error}
                  </div>
                )}

                {/* Username Field */}
                <div>
                  <label htmlFor="username" className="block font-source-sans text-cbo-text-dark text-sm font-medium mb-2">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Enter your username or email"
                    data-testid="username-input"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block font-source-sans text-cbo-text-dark text-sm font-medium mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Enter your password"
                    data-testid="password-input"
                  />
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="login-button"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Signing In...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Forgot Password Link */}
                <div className="text-center">
                  <button
                    type="button"
                    className="font-source-sans text-cbo-purple text-sm hover:text-[#4318d6] transition-colors"
                    onClick={() => {
                      // TODO: Implement forgot password functionality
                      alert('Forgot password functionality will be implemented soon.');
                    }}
                  >
                    Forgot your password?
                  </button>
                </div>
              </form>
            </div>

            {/* Footer Text */}
            <div className="text-center mt-6">
              <p className="font-source-sans text-cbo-text-secondary text-sm">
                Secure banking powered by Central Bank of Oman
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

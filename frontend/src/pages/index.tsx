import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token')
    if (token) {
      // User is authenticated, redirect to dashboard
      router.push('/dashboard')
    } else {
      // User is not authenticated, redirect to login
      router.push('/login')
    }
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-cbo-background">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cbo-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-source-sans text-cbo-text-secondary">Loading...</p>
      </div>
    </div>
  )
}

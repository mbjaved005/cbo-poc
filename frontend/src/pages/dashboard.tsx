import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon, 
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon
} from '@heroicons/react/24/outline'
import { logout } from '../utils/auth'

interface UserInfo {
  id: number
  username: string
  role: string
}

export default function Dashboard() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      const storedUserInfo = localStorage.getItem('user_info')

      if (!token) {
        router.push('/login')
        return
      }

      if (storedUserInfo) {
        try {
          setUserInfo(JSON.parse(storedUserInfo))
        } catch (e) {
          console.error('Error parsing user info:', e)
        }
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    logout()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cbo-background">
        <div className="w-16 h-16 border-4 border-cbo-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>CBO Banking App - Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-xl font-bold text-gray-900">CBO Banking App</h1>
                </div>
                <div className="hidden md:ml-6 md:flex md:space-x-8">
                  <Link href="/dashboard" className="text-indigo-600 border-b-2 border-indigo-600 px-1 pt-1 text-sm font-medium" data-testid="dashboard-link">
                    Dashboard
                  </Link>
                  <Link href="/chat" className="text-gray-500 hover:text-gray-700 px-1 pt-1 text-sm font-medium" data-testid="chat-link">
                    AI Assistant
                  </Link>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-cbo-text-secondary font-source-sans">
                  Welcome, {userInfo?.username || 'User'}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-cbo-text-secondary hover:text-cbo-purple transition-colors"
                  data-testid="logout-button"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back, {userInfo?.username}!
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Access your AI-powered banking assistant and document management tools.
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* AI Chat Assistant */}
              <Link href="/chat">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ChatBubbleLeftRightIcon className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            AI Assistant
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            Chat with AI
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <span className="font-medium text-indigo-600">Get instant answers</span>
                      <span className="text-gray-500"> to banking queries in Arabic & English</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Document Management */}
              <Link href="/documents">
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Documents
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            Manage Files
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <span className="font-medium text-green-600">Upload & analyze</span>
                      <span className="text-gray-500"> documents with AI-powered insights</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* System Status */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                        <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          System Status
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          All Systems Online
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-5 py-3">
                  <div className="text-sm">
                    <span className="font-medium text-green-600">Vectara AI:</span>
                    <span className="text-gray-500"> Connected & Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  <li className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-900">
                        System initialized successfully
                      </div>
                      <div className="text-sm text-gray-500">
                        Just now
                      </div>
                    </div>
                  </li>
                  <li className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-900">
                        AI Assistant ready for queries
                      </div>
                      <div className="text-sm text-gray-500">
                        2 minutes ago
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>

    </>
  )
}

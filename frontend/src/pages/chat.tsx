/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { getUserInfo, logout } from '../utils/auth'

// Local Assets
const imgRectangle1076 = "/assets/rectangle1076.png";
const imgStars = "/assets/stars.svg";
const imgMaterialSymbolsMailOutlineRounded = "/assets/mail-outline.svg";
const imgMaterialSymbolsBookmarkOutlineRounded = "/assets/bookmark-outline.svg";
const imgGroup = "/assets/group.svg";
const imgGroup5 = "/assets/cbo-logo.svg";
const imgGroup6 = "/assets/group6.svg";
const imgCopyIcon = "/assets/copy-icon.svg";
const imgLikeIcon = "/assets/like-icon.svg";
const imgTablerRefresh = "/assets/refresh-icon.svg";
const imgPaperclip = "/assets/paperclip.svg";
const imgLine17 = "/assets/line17.svg";
const imgChevronDown = "/assets/chevron-down.svg";
const imgGroup1 = "/assets/group1.svg";
const imgGroup2 = "/assets/group2.svg";
const imgLine18 = "/assets/line18.svg";
const imgGroup3 = "/assets/group3.svg";
const imgLine16 = "/assets/line16.svg";
const imgFileText = "/assets/file-text.svg";
const imgFi2997933 = "/assets/fi_2997933.svg";
import Head from 'next/head'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
  sources?: Array<{
    text: string
    score: number
    metadata: Record<string, string>
  }>
  liked?: boolean
  disliked?: boolean
  originalQuery?: string
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

interface UserInfo {
  id: number
  username: string
  role: string
}

export default function ChatPage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Detect inline summaries to hide from normal message stream
  const isInlineSummary = (text: string) => {
    const t = (text || '').trim().toLowerCase()
    return (
      t.startsWith('summary of this conversation') ||
      t.startsWith('summary of the conversation') ||
      t.startsWith('conversation summary') ||
      t.startsWith('here is a summary of our conversation')
    )
  }
  const [refreshingMessageId, setRefreshingMessageId] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [summaryText, setSummaryText] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Generate chat title from first user message
  const generateChatTitle = useCallback((firstMessage: string): string => {
    const maxLength = 30
    if (firstMessage.length <= maxLength) {
      return firstMessage
    }
    return firstMessage.substring(0, maxLength) + '...'
  }, [])

  // Load chat sessions from database with localStorage fallback
  const loadChatSessions = useCallback(async (): Promise<ChatSession[]> => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return []

      // Try to load from database first
      const response = await fetch('/api/chat-sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const dbSessions = data.sessions.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
        }))

        // Save to localStorage as backup
        localStorage.setItem('chat_sessions', JSON.stringify(dbSessions))
        return dbSessions
      } else {
        // Fallback to localStorage if database fails
        console.warn('Database unavailable, using localStorage fallback')
        return loadChatSessionsFromStorage()
      }
    } catch (e) {
      console.error('Error loading chat sessions from database:', e)
      // Fallback to localStorage
      return loadChatSessionsFromStorage()
    }
  }, [])

  // Fallback function to load from localStorage
  const loadChatSessionsFromStorage = (): ChatSession[] => {
    try {
      const stored = localStorage.getItem('chat_sessions')
      if (stored) {
        const sessions = JSON.parse(stored)
        return sessions.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
        }))
      }
    } catch (e) {
      console.error('Error loading chat sessions from localStorage:', e)
      console.error('Error loading chat sessions:', e)
    }
    return []
  }

  // Save chat sessions to localStorage
  const saveChatSessions = (sessions: ChatSession[]) => {
    try {
      localStorage.setItem('chat_sessions', JSON.stringify(sessions))
    } catch (e) {
      console.error('Error saving chat sessions:', e)
    }
  }

  // Create new chat session in database with fallback
  const createChatSessionInDB = useCallback(async (title: string): Promise<string | null> => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return null

      const response = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title })
      })

      if (response.ok) {
        const data = await response.json()
        return data.id
      }
    } catch (e) {
      console.error('Error creating chat session in database:', e)
    }
    return null
  }, [])

  // Create new chat session
  const createNewChatSession = useCallback(async (): Promise<ChatSession> => {
    const title = language === 'ar' ? 'محادثة جديدة' : 'New Chat'

    // Try database first, fallback to local ID
    const sessionId = await createChatSessionInDB(title) || `chat_${Date.now()}`

    return {
      id: sessionId,
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }, [language, createChatSessionInDB])

  // Copy message to clipboard
  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(id)
      setTimeout(() => setCopiedMessageId(null), 1500)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Handle like message
  const handleLikeMessage = (messageId: string) => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId && msg.sender === 'ai') {
        return {
          ...msg,
          liked: !msg.liked,
          disliked: false // Clear dislike if liking
        }
      }
      return msg
    })
    setMessages(updatedMessages)
    updateCurrentSession(updatedMessages)
  }

  // Handle dislike message
  const handleDislikeMessage = (messageId: string) => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId && msg.sender === 'ai') {
        return {
          ...msg,
          disliked: !msg.disliked,
          liked: false // Clear like if disliking
        }
      }
      return msg
    })
    setMessages(updatedMessages)
    updateCurrentSession(updatedMessages)
  }

  // Handle refresh message
  const handleRefreshMessage = async (messageId: string, originalQuery: string) => {
    if (!originalQuery.trim()) return

    setRefreshingMessageId(messageId)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: originalQuery,
          conversation_id: conversationId,
          filters: selectedFilters,
          file_content: selectedFile ? await selectedFile.text() : null
        })
      })

      if (response.ok) {
        const data = await response.json()

        // Update the specific message
        const updatedMessages = messages.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              text: data.response,
              sources: data.sources || []
            }
          }
          return msg
        })

        setMessages(updatedMessages)
        updateCurrentSession(updatedMessages)
      }
    } catch (error) {
      console.error('Error refreshing message:', error)
    } finally {
      setRefreshingMessageId(null)
    }
  }

  // Handle summarize chat
  const handleSummarizeChat = async () => {
    if (messages.length === 0) return

    setIsGeneratingSummary(true)
    setShowSummary(true)
    setSummaryText('')

    try {
      const chatHistory = messages.map(msg =>
        `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
      ).join('\n\n')

      // Truncate if too long (keep under 4000 chars to be safe)
      const maxLength = 4000
      const truncatedHistory = chatHistory.length > maxLength
        ? chatHistory.substring(0, maxLength) + '...[conversation truncated]'
        : chatHistory

      const response = await fetch('/api/chat-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          conversation_history: truncatedHistory,
          language: language
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSummaryText(data.summary)
      } else {
        setSummaryText('Unable to generate summary at this time. Please try again.')
      }
    } catch (error) {
      console.error('Error summarizing chat:', error)
      setSummaryText('Error generating summary. Please try again.')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // Close summary modal
  const handleCloseSummary = () => {
    setShowSummary(false)
    setSummaryText('')
  }

  // Update current session with new messages
  const updateCurrentSession = useCallback((newMessages: Message[]) => {
    setChatSessions(prevSessions => {
      const updatedSessions = prevSessions.map(session => {
        if (session.id === currentSessionId) {
          const updatedSession = {
            ...session,
            messages: newMessages,
            updatedAt: new Date()
          }

          // Update title if this is the first user message
          if (newMessages.length === 1 && newMessages[0].sender === 'user') {
            updatedSession.title = generateChatTitle(newMessages[0].text)
          }

          return updatedSession
        }
        return session
      })

      saveChatSessions(updatedSessions)
      return updatedSessions
    })
  }, [currentSessionId, generateChatTitle])

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

      // Load chat sessions
      const sessions = await loadChatSessions()
      setChatSessions(sessions)

      // Load current session or create new one
      const storedCurrentSessionId = localStorage.getItem('current_session_id')
      if (storedCurrentSessionId && sessions.find(s => s.id === storedCurrentSessionId)) {
        const currentSession = sessions.find(s => s.id === storedCurrentSessionId)
        if (currentSession) {
          setCurrentSessionId(storedCurrentSessionId)
          setMessages(currentSession.messages)
          setConversationId(storedCurrentSessionId)
        }
      } else {
        // Create new session if none exists
        const newSession = await createNewChatSession()
        const updatedSessions = [...sessions, newSession]
        setChatSessions(updatedSessions)
        saveChatSessions(updatedSessions)
        setCurrentSessionId(newSession.id)
        localStorage.setItem('current_session_id', newSession.id)
      }
    }

    checkAuth()
  }, [router, language, loadChatSessions, createNewChatSession])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!isLoading) {
      scrollToBottom()
      // Focus input field after response is received
      setTimeout(() => {
        inputRef.current?.focus()
      }, 200)
    }
  }, [isLoading])

  // Update current session when messages change
  useEffect(() => {
    if (messages.length > 0 && currentSessionId) {
      updateCurrentSession(messages)
    }
  }, [messages, currentSessionId, updateCurrentSession])

  useEffect(() => {
    if (conversationId) {
      localStorage.setItem('conversation_id', conversationId)
    }
    if (currentSessionId) {
      localStorage.setItem('current_session_id', currentSessionId)
    }
  }, [conversationId, currentSessionId])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleQuestionClick = async (question: string) => {
    console.log('handleQuestionClick called', { question, isLoading })
    if (isLoading) return

    setInputValue('') // question)

    // Auto-send the question
    const userMessage: Message = {
      id: Date.now().toString(),
      text: question,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      console.log('Token check:', token ? 'Token exists' : 'No token found')
      if (!token) {
        console.log('No token, redirecting to login')
        router.push('/login')
        return
      }

      let response: Response

      if (selectedFile) {
        // Handle file upload
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('message', inputValue.trim() || '')
        formData.append('conversation_id', conversationId || '')
        formData.append('language', language)
        if (selectedFilters.length > 0) {
          formData.append('filters', JSON.stringify(selectedFilters))
        }

        response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        })
      } else {
        // Handle regular text message
        console.log('Making API call to /api/chat')
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: question,
            conversation_id: conversationId || undefined,
            language,
            conversation_history: messages.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            }))
          }),
        })
        console.log('API response status:', response.status)
      }

      const data = await response.json()

      if (response.ok) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.message,
          sender: 'ai',
          timestamp: new Date(),
          sources: data.sources,
          originalQuery: inputValue.trim() || ''
        }

        setMessages(prev => [...prev, aiMessage])
        if (data.conversation_id) {
          setConversationId(data.conversation_id)
        }

        // Clear selected file after successful upload
        if (selectedFile) {
          setSelectedFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      } else {
        // Handle specific error cases
        if (response.status === 401) {
          router.push('/login')
          return
        }

        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: language === 'ar'
            ? `عذراً، حدث خطأ: ${data.detail || 'فشل في الحصول على الرد'}`
            : `Sorry, an error occurred: ${data.detail || 'Failed to get response'}`,
          sender: 'ai',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
        console.error('Chat API error:', data.detail)
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        text: language === 'ar'
          ? 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.'
          : 'Sorry, connection error. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('handleSendMessage called', { inputValue, selectedFile, isLoading })

    if ((!inputValue.trim() && !selectedFile) || isLoading) {
      console.log('Early return - no message or loading')
      return
    }

    const messageText = inputValue.trim() || (selectedFile ? `[${language === 'ar' ? 'ملف مرفق' : 'File attached'}]: ${selectedFile.name}` : '')
    console.log('Message text:', messageText)

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    }

    console.log('Adding user message to state')
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      console.log('Token check:', token ? 'Token exists' : 'No token found')
      if (!token) {
        console.log('No token, redirecting to login')
        router.push('/login')
        return
      }

      let response: Response

      if (selectedFile) {
        // Handle file upload
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('message', inputValue.trim() || '')
        formData.append('conversation_id', conversationId || '')
        formData.append('language', language)
        if (selectedFilters.length > 0) {
          formData.append('filters', JSON.stringify(selectedFilters))
        }

        response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        })
      } else {
        // Handle regular text message
        console.log('Making API call to /api/chat')
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: messageText,
            conversation_id: conversationId || undefined,
            language,
            filters: selectedFilters.length > 0 ? selectedFilters : undefined,
            conversation_history: messages.map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.text
            }))
          }),
        })
        console.log('API response status:', response.status)
      }

      const data = await response.json()

      if (response.ok) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.message,
          sender: 'ai',
          timestamp: new Date(),
          sources: data.sources,
          originalQuery: inputValue.trim() || ''
        }

        setMessages(prev => [...prev, aiMessage])
        if (data.conversation_id) {
          setConversationId(data.conversation_id)
        }

        // Clear selected file after successful upload
        if (selectedFile) {
          setSelectedFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      } else {
        // Handle specific error cases
        if (response.status === 401) {
          router.push('/login')
          return
        }

        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: language === 'ar'
            ? `عذراً، حدث خطأ: ${data.detail || 'فشل في الحصول على الرد'}`
            : `Sorry, an error occurred: ${data.detail || 'Failed to get response'}`,
          sender: 'ai',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
        console.error('Chat API error:', data.detail)
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        text: language === 'ar'
          ? 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.'
          : 'Sorry, connection error. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en')
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(language === 'ar'
          ? 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت.'
          : 'File size too large. Maximum 10MB allowed.')
        return
      }

      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ]

      if (!allowedTypes.includes(file.type)) {
        alert(language === 'ar'
          ? 'نوع الملف غير مدعوم. يرجى اختيار PDF، Word، Excel، PowerPoint، نص، أو صورة.'
          : 'File type not supported. Please select PDF, Word, Excel, PowerPoint, text, or image files.')
        return
      }

      setSelectedFile(file)
    }
  }

  const removeSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const toggleFilters = () => {
    setShowFilters(prev => !prev)
  }

  const handleStartNewChat = async () => {
    // Create new chat session
    const newSession = await createNewChatSession()
    const updatedSessions = [...chatSessions, newSession]
    setChatSessions(updatedSessions)
    saveChatSessions(updatedSessions)

    // Switch to new session
    setCurrentSessionId(newSession.id)
    setConversationId(newSession.id)
    setMessages([])
    setSelectedFilters([])
    setSelectedFile(null)
    setInputValue('')

    // Update localStorage
    localStorage.setItem('current_session_id', newSession.id)
    localStorage.setItem('conversation_id', newSession.id)
  }

  const handleSelectChatSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSessionId(sessionId)
      setConversationId(sessionId)
      setMessages(session.messages)
      setSelectedFilters([])
      setSelectedFile(null)
      setInputValue('')

      // Update localStorage
      localStorage.setItem('current_session_id', sessionId)
      localStorage.setItem('conversation_id', sessionId)
    }
  }

  const handleFilterChange = (filter: string) => {
    setSelectedFilters(prev =>
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

  // Delete session helpers
  const removeSessionLocally = async (sessionId: string) => {
    setChatSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionId)
      saveChatSessions(remaining)
      // If we removed the current session, switch context
      if (currentSessionId === sessionId) {
        if (remaining.length > 0) {
          // Pick most recently updated
          const next = [...remaining].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
          setCurrentSessionId(next.id)
          setConversationId(next.id)
          setMessages(next.messages)
          localStorage.setItem('current_session_id', next.id)
          localStorage.setItem('conversation_id', next.id)
        } else {
          // Create a fresh session if none remain
          createNewChatSession().then(newSession => {
            const updated = [newSession]
            setChatSessions(updated)
            saveChatSessions(updated)
            setCurrentSessionId(newSession.id)
            setConversationId(newSession.id)
            setMessages([])
            localStorage.setItem('current_session_id', newSession.id)
            localStorage.setItem('conversation_id', newSession.id)
          })
        }
      }
      return remaining
    })
  }

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const token = localStorage.getItem('token')

      // Best-effort backend delete; never redirect here
      if (token) {
        try {
          await fetch(`/api/chat-sessions/${encodeURIComponent(sessionToDelete.id)}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        } catch (err) {
          console.warn('Backend delete request failed, proceeding with local removal', err)
        }
      } else {
        console.warn('No token found, performing local removal only')
      }

      // Local removal is the source of truth for UI responsiveness
      await removeSessionLocally(sessionToDelete.id)
      setShowDeleteModal(false)
      setSessionToDelete(null)
    } catch (e: any) {
      console.error('Error deleting session:', e)
      if (sessionToDelete) {
        await removeSessionLocally(sessionToDelete.id)
        setShowDeleteModal(false)
        setSessionToDelete(null)
      } else {
        setDeleteError(language === 'ar' ? 'تعذر حذف المحادثة.' : 'Unable to delete the chat.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Cancel delete action and close modal
  const handleCancelDelete = () => {
    if (isDeleting) return
    setShowDeleteModal(false)
    setSessionToDelete(null)
  }

  const filterOptions = [
    { id: 'banking', label: language === 'ar' ? 'الخدمات المصرفية' : 'Banking Services' },
    { id: 'loans', label: language === 'ar' ? 'القروض' : 'Loans' },
    { id: 'regulations', label: language === 'ar' ? 'اللوائح' : 'Regulations' },
    { id: 'policies', label: language === 'ar' ? 'السياسات' : 'Policies' },
    { id: 'compliance', label: language === 'ar' ? 'الامتثال' : 'Compliance' },
    { id: 'reports', label: language === 'ar' ? 'التقارير' : 'Reports' }
  ]

  return (
    <>
      <Head>
        <title>CBO Banking App - AI Assistant</title>
      </Head>

      <div className="bg-[#f1f3f9] relative min-h-screen w-full" data-name="102" data-node-id="1489:446">
        {/* CBO Logo Mask */}
        <div className="absolute contents left-5 top-[24.53px]" data-name="Mask group" data-node-id="1489:1953">
          <div
            className="absolute bg-[#17365f] left-[14.23px] size-[69.261px] top-[18.76px]"
            data-node-id="1489:1952"
            style={{
              maskImage: `url('${imgRectangle1076}')`,
              maskSize: '59px 59px',
              maskPosition: '5.772px',
              maskRepeat: 'no-repeat'
            }}
          />
        </div>

        {/* Central Bank of Oman Text */}
        <div
          className="absolute font-['Source_Sans_Pro:SemiBold',_sans-serif] leading-[0] left-[92px] not-italic text-[#17365f] text-[26px] text-nowrap top-[37.53px]"
          data-node-id="1489:1954"
        >
          <p className="block leading-[normal] whitespace-pre">Central Bank of Oman</p>
        </div>

        {/* Start New Chat */}
        <button
          onClick={handleStartNewChat}
          className="absolute box-border content-stretch flex gap-[11px] items-center justify-start left-5 p-0 top-[140.53px] hover:opacity-70 transition-opacity cursor-pointer"
          data-node-id="1489:1974"
        >
          <div className="relative shrink-0 size-6" data-name="stars" data-node-id="1489:449">
            <img alt="" className="block max-w-none size-full" src={imgStars} />
          </div>
          <div
            className="font-['Source_Sans_Pro:SemiBold',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#17365f] text-[20px] text-nowrap"
            data-node-id="1489:453"
          >
            <p className="block leading-[normal] whitespace-pre">{language === 'ar' ? 'محادثة جديدة' : 'Start New Chat'}</p>
          </div>
        </button>

        {/* Divider Line */}
        <div className="absolute h-0 left-[22px] top-[194.53px] w-[264px]" data-node-id="1489:1972">
          <div className="absolute bottom-0 left-0 right-0 top-[-1px]">
            <img alt="" className="block max-w-none size-full" src={imgLine16} />
          </div>
        </div>

        {/* Chat History List */}
        <div className="absolute left-[22px] top-[219.53px] bottom-[24px] w-[264px] overflow-y-auto scrollbar-cbo pr-1">
          {chatSessions.length === 0 ? (
            <div
              className="font-['Source_Sans_Pro:Regular',_sans-serif] leading-[0] not-italic opacity-60 text-[#17365f] text-[20px] text-nowrap"
              data-node-id="1489:1973"
            >
              <p className="block leading-[normal] whitespace-pre">{language === 'ar' ? 'لا يوجد سجل محادثات' : 'No chat history available'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chatSessions
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .map((session) => (
                  <div
                    key={session.id}
                    className={`group relative w-full ${currentSessionId === session.id ? 'bg-[rgba(49,68,94,0.05)] rounded-[5px]' : ''
                      }`}
                  >
                    <button
                      onClick={() => handleSelectChatSession(session.id)}
                      className="w-full text-left px-3 py-2 transition-colors hover:opacity-70"
                    >
                      <div className="font-['Source_Sans_Pro:Regular',_sans-serif] text-[#17365f] text-[20px] truncate" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        {session.title}
                      </div>
                    </button>
                    {/* Delete icon button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSessionToDelete(session); setDeleteError(null); setShowDeleteModal(true); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      title={language === 'ar' ? 'حذف المحادثة' : 'Delete chat'}
                      aria-label={language === 'ar' ? 'حذف المحادثة' : 'Delete chat'}
                    >
                      {/* Inline trash SVG */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v11a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9zm2 2h2v1h-2V5zM8 7h8v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7zm2 2a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0V10a1 1 0 0 1 1-1zm4 0a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0V10a1 1 0 0 1 1-1z" />
                      </svg>
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Header */}
        <div
          className="absolute box-border content-stretch flex gap-3.5 items-center justify-end right-12 p-0 top-10"
          data-node-id="1489:462"
        >
          {/* Language Toggle */}
          <div
            className="box-border content-stretch flex items-center justify-start p-0 relative shrink-0"
            data-node-id="1489:1963"
          >
            <button
              onClick={() => setLanguage('ar')}
              className={`box-border content-stretch flex gap-2.5 items-center justify-center px-4 py-2.5 relative rounded-bl-[7px] rounded-tl-[7px] shrink-0 border-2 ${language === 'ar' ? 'bg-[#ffffff] border-[#721f23]' : 'border-[#b1b5c2]'
                }`}
              data-node-id="1489:1964"
              data-testid="language-toggle"
            >
              <div className="font-['Source_Sans_Pro:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[20px] text-center text-nowrap font-arabic" data-node-id="1489:1965">
                <p className="block leading-none whitespace-pre" dir="rtl" lang="ar">
                  عربي
                </p>
              </div>
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`box-border content-stretch flex gap-2.5 items-center justify-center px-4 py-2.5 relative rounded-br-[7px] rounded-tr-[7px] shrink-0 border-2 ${language === 'en' ? 'bg-[#ffffff] border-[#721f23]' : 'border-[#b1b5c2]'
                }`}
              data-node-id="1489:1966"
            >
              <div className="font-['Source_Sans_Pro:SemiBold',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#000000] text-[20px] text-center text-nowrap" data-node-id="1489:1967">
                <p className="block leading-[normal] whitespace-pre">ENG</p>
              </div>
            </button>
          </div>


          {/* User Avatar */}
          <div className="relative">
            <button
              onClick={handleLogout}
              className="bg-[#17365f] box-border content-stretch flex flex-col gap-2.5 items-center justify-center p-[10px] relative rounded-[30px] shrink-0 size-10 hover:bg-[#1a3a68] transition-colors"
              data-node-id="1489:472"
              title="Logout"
            >
              <div className="font-['Source_Sans_Pro:SemiBold',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[20px] text-center text-nowrap" data-node-id="1489:473">
                <p className="block leading-[normal] whitespace-pre">{userInfo?.username?.substring(0, 2).toUpperCase() || 'AS'}</p>
              </div>
            </button>
          </div>
        </div>

        {/* Main Chat Container */}
        <div
          className={`absolute bg-[#ffffff] box-border content-stretch flex flex-col items-center justify-start left-[309px] top-[109px] bottom-6 overflow-hidden pb-4 pt-0 px-0 rounded-3xl ${showSummary ? 'w-[1048px]' : 'right-12'
            }`}
          data-node-id="1496:2125"
        >
          {/* Chat Title Header */}
          <div className="bg-[#ffffff] box-border content-stretch flex items-center justify-between p-[24px] relative shrink-0 w-full" data-name="top" data-node-id="1496:2126">
            <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-[rgba(114,114,114,0.25)] border-solid inset-0 pointer-events-none" />
            <div className="font-['Source_Sans_Pro:SemiBold',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#15182f] text-[28px] text-nowrap" data-node-id="1496:2127">
              <p className="leading-[30px] whitespace-pre">
                {currentSessionId && chatSessions.find(s => s.id === currentSessionId)
                  ? chatSessions.find(s => s.id === currentSessionId)?.title
                  : (language === 'ar' ? 'محادثة جديدة' : 'New Chat')}
              </p>
            </div>
            <button
              onClick={handleSummarizeChat}
              className="content-stretch flex gap-1 items-center justify-start relative shrink-0 hover:opacity-70 transition-opacity"
              disabled={messages.length === 0}
              data-node-id="1496:2128"
              data-testid="summarize-button"
            >
              <div className="relative shrink-0 size-5" data-name="file-text" data-node-id="1496:2129">
                <img alt="" className="block max-w-none size-full" src={imgFileText} />
              </div>
              <div className="font-['Source_Sans_Pro:SemiBold',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#721f23] text-[18px] text-nowrap" data-node-id="1496:2135">
                <p className="leading-[26px] whitespace-pre">
                  {language === 'ar' ? 'تلخيص هذه المحادثة' : 'Summarize this chat'}
                </p>
              </div>
            </button>
          </div>
          {/* Messages Display */}
          <div className="bg-[#ffffff] box-border content-stretch flex flex-col gap-10 flex-1 min-h-0 items-center justify-start pb-24 pt-8 px-12 relative rounded-3xl w-full overflow-y-auto scrollbar-cbo stable-gutter" data-node-id="1496:2136" data-testid="chat-messages">
            {messages.length > 0 ? (
              <div className={`content-stretch flex flex-col items-end justify-start relative ${showSummary ? 'w-[809px]' : 'w-full max-w-4xl'
                }`} data-node-id="1496:2137">
                {messages
                  .filter(m => !(m.sender === 'ai' && isInlineSummary(m.text)))
                  .map((message, index) => (
                  <div key={message.id} className={`content-stretch flex flex-col gap-2.5 items-${message.sender === 'user' ? 'end' : 'start'} justify-start relative shrink-0 w-full ${index > 0 ? 'pt-16' : 'pt-4'}`} data-node-id={`1496:${2138 + index}`}>
                    {message.sender === 'user' && (
                      <>
                        <div className="content-stretch flex flex-col gap-2.5 items-end justify-start relative shrink-0 w-full" data-node-id="1496:2139">
                          <div className="bg-[rgba(49,68,94,0.08)] box-border content-stretch flex gap-2.5 items-center justify-center px-4 py-3 relative rounded-[25px] shrink-0" data-name="Component 2" data-node-id="1496:2140">
                            <div className="font-['Source_Sans_Pro:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#15182f] text-[18px] text-nowrap" data-node-id="1496:2141" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                              <p className="leading-[26px] whitespace-pre">{message.text}</p>
                            </div>
                          </div>
                        </div>
                        <div className="box-border content-stretch flex gap-1.5 items-center justify-end pl-[383px] pr-0 py-0 relative shrink-0 w-full" data-node-id="1496:2142">
                          <div className="relative shrink-0 size-[14.333px]" data-node-id="1496:2143">
                            <img alt="" className="block max-w-none size-full" src={imgGroup6} />
                          </div>
                          <div className="font-['Source_Sans_Pro:Italic',_sans-serif] italic leading-[0] relative shrink-0 text-[#17365f] text-[14px] text-nowrap" data-node-id="1496:2146">
                            <p className="leading-[26px] whitespace-pre">
                              {language === 'ar' ? 'تم تصحيح بعض الأخطاء الإملائية والإدخال تلقائياً بواسطة الذكاء الاصطناعي.' : 'Some spelling and input errors were automatically corrected by the AI.'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {message.sender === 'ai' && (
                      <div className="content-stretch flex flex-col gap-2.5 items-start justify-start relative shrink-0 w-full" data-node-id="1496:2147">
                        <div className="content-stretch flex gap-2.5 items-start justify-start relative shrink-0 w-full" data-node-id="1496:2148">
                          <div className="bg-[#17365f] box-border content-stretch flex gap-2.5 items-center justify-center p-1.5 relative rounded-[30px] shrink-0 size-8" data-node-id="1496:2149">
                            <div className="relative shrink-0 size-5" data-node-id="1496:2149-logo">
                              <img alt="CBO" className="block max-w-none size-full" src={imgGroup5} />
                            </div>
                          </div>
                          <div className="content-stretch flex flex-col gap-2 items-start justify-start relative shrink-0 w-full pr-6" data-node-id="1496:2151">
                            <div className="bg-white rounded-[18px] px-5 py-3 shadow w-fit max-w-[640px] md:max-w-[700px] lg:max-w-[760px] font-['Source_Sans_Pro:Regular',_sans-serif] leading-[28px] text-[#15182f] text-[18px]" data-node-id="1496:2152" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                              <p className="whitespace-pre-wrap">
                                {message.text}
                              </p>
                            </div>
                            <div className="content-stretch flex gap-[13px] items-center justify-start relative shrink-0 mt-1" data-node-id="1496:2153">
                              <button
                                onClick={() => handleCopyMessage(message.id, message.text)}
                                className={`relative shrink-0 size-[20px] transition-opacity ${copiedMessageId === message.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                title="Copy to clipboard"
                                data-node-id="1496:2154"
                              >
                                <img alt="Copy" className="block max-w-none size-full" src={imgCopyIcon} />
                              </button>
                              <button
                                onClick={() => handleLikeMessage(message.id)}
                                className={`relative shrink-0 size-[20px] transition-opacity ${message.liked ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                title="Like message"
                                data-node-id="1496:2155"
                              >
                                <img alt="Like" className="block max-w-none size-full" src={imgLikeIcon} />
                              </button>
                              <button
                                onClick={() => handleDislikeMessage(message.id)}
                                className={`relative shrink-0 size-[20px] transition-opacity ${message.disliked ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                title="Dislike message"
                                data-node-id="1496:2156"
                              >
                                <div className="flex items-center justify-center relative shrink-0 size-[20px]">
                                  <div className="flex-none rotate-180 size-[20px]">
                                    <img alt="Dislike" className="block max-w-none size-full" src={imgLikeIcon} />
                                  </div>
                                </div>
                              </button>
                              <button
                                onClick={() => handleRefreshMessage(message.id, message.text)}
                                className={`relative shrink-0 size-[20px] transition-opacity ${refreshingMessageId === message.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                title="Refresh message"
                                data-node-id="1496:2157"
                              >
                                {refreshingMessageId === message.id ? (
                                  <div className="block max-w-none size-full animate-spin border-2 border-[#17365f] border-t-transparent rounded-full" />
                                ) : (
                                  <img alt="Refresh" className="block max-w-none size-full" src={imgTablerRefresh} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}


                {/* Loading indicator */}
                {isLoading && (
                  <div className="content-stretch flex gap-2.5 items-start justify-start relative shrink-0 w-full">
                    <div className="bg-[#17365f] box-border content-stretch flex gap-2.5 items-center justify-center p-1.5 relative rounded-[30px] shrink-0 size-8">
                      <div className="relative shrink-0 size-5">
                        <img alt="CBO" className="block max-w-none size-full" src={imgGroup5} />
                      </div>
                    </div>
                    <div className="font-['Source_Sans_Pro:Italic',_sans-serif] italic text-[#63667d] text-[18px] leading-[28px]">
                      {language === 'ar' ? 'لحظة من فضلك... أفكر في الأمر!' : 'Just a moment... Thinking it through!'}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-6" />
              </div>
            ) : (
              <>
                {/* Welcome Section */}
                <div className="content-stretch flex flex-col gap-8 items-center justify-start relative shrink-0 mt-8" data-node-id="1489:475">
                  <div className="relative shrink-0 size-20" data-node-id="1493:687">
                    <img alt="" className="block max-w-none size-full" src={imgGroup5} />
                  </div>
                  <div className="content-stretch flex flex-col gap-3 items-center justify-start leading-[0] not-italic relative shrink-0 text-nowrap w-full" data-node-id="1489:482">
                    <div className="font-['Source_Sans_Pro:SemiBold',_sans-serif] relative shrink-0 text-[#15182f] text-[48px] text-center" data-node-id="1489:483">
                      <p className="leading-[normal] text-nowrap whitespace-pre">
                        {language === 'ar' ? 'مرحباً، أنا مساعد البنك المركزي العماني الذكي' : 'Hi, I\'m CBO AI Chatbot'}
                      </p>
                    </div>
                    <div className="font-['Source_Sans_Pro:Regular',_sans-serif] relative shrink-0 text-[#63667d] text-[20px]" data-node-id="1489:484">
                      <p className="leading-[normal] text-nowrap whitespace-pre">
                        {language === 'ar' ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I help you today?'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Suggestion Pills */}
                <div className="content-stretch flex flex-col gap-4 items-center justify-center relative shrink-0 w-[600px]" data-node-id="1489:485">
                  <div className="content-stretch flex flex-col gap-4 items-start justify-start relative shrink-0 w-full" data-node-id="1489:486">
                    <div
                      className="box-border content-stretch flex gap-2.5 items-center justify-center px-4 py-3 relative rounded-[10px] shrink-0 w-full cursor-pointer hover:bg-gray-50"
                      data-node-id="1489:487"
                      onClick={() => handleQuestionClick(language === 'ar' ? 'ما هو الحد الأدنى لدرجة الائتمان المطلوبة للحصول على قرض؟' : 'What is the minimum credit score required for a loan?')}
                    >
                      <div aria-hidden="true" className="absolute border border-[#cbcbcb] border-solid inset-0 pointer-events-none rounded-[10px]" />
                      <div className="basis-0 font-['Source_Sans_Pro:Regular',_sans-serif] grow leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[#15182f] text-[18px]" data-node-id="1489:488">
                        <p className="leading-[normal]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                          {language === 'ar' ? 'ما هو الحد الأدنى لدرجة الائتمان المطلوبة للحصول على قرض؟' : 'What is the minimum credit score required for a loan?'}
                        </p>
                      </div>
                    </div>
                    <div
                      className="box-border content-stretch flex gap-2.5 items-center justify-center px-4 py-3 relative rounded-[10px] shrink-0 w-full cursor-pointer hover:bg-gray-50"
                      data-node-id="1489:489"
                      onClick={() => handleQuestionClick(language === 'ar' ? 'ما هي أسعار الفائدة للقروض التجارية؟' : 'What are the interest rates for business loans?')}
                    >
                      <div aria-hidden="true" className="absolute border border-[#cbcbcb] border-solid inset-0 pointer-events-none rounded-[10px]" />
                      <div className="basis-0 font-['Source_Sans_Pro:Regular',_sans-serif] grow leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[#15182f] text-[18px]" data-node-id="1489:490">
                        <p className="leading-[normal]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                          {language === 'ar' ? 'ما هي أسعار الفائدة للقروض التجارية؟' : 'What are the interest rates for business loans?'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="content-stretch flex flex-col gap-4 items-center justify-center relative shrink-0 w-full" data-node-id="1489:491">
                    <div
                      className="box-border content-stretch flex gap-2.5 items-center justify-center px-4 py-3 relative rounded-[10px] shrink-0 w-full cursor-pointer hover:bg-gray-50"
                      data-node-id="1489:492"
                      onClick={() => handleQuestionClick(language === 'ar' ? 'ما هي أنواع القروض التجارية المتاحة؟' : 'What types of business loans are available?')}
                    >
                      <div aria-hidden="true" className="absolute border border-[#cbcbcb] border-solid inset-0 pointer-events-none rounded-[10px]" />
                      <div className="basis-0 font-['Source_Sans_Pro:Regular',_sans-serif] grow leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[#15182f] text-[18px]" data-node-id="1489:493">
                        <p className="leading-[normal]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                          {language === 'ar' ? 'ما هي أنواع القروض التجارية المتاحة؟' : 'What types of business loans are available?'}
                        </p>
                      </div>
                    </div>
                    <div
                      className="box-border content-stretch flex gap-2.5 items-center justify-center px-4 py-3 relative rounded-[10px] shrink-0 w-full cursor-pointer hover:bg-gray-50"
                      data-node-id="1489:494"
                      onClick={() => handleQuestionClick(language === 'ar' ? 'ما هي المستندات المطلوبة للحصول على قرض سكني؟' : 'What documents are required for a home loan?')}
                    >
                      <div aria-hidden="true" className="absolute border border-[#cbcbcb] border-solid inset-0 pointer-events-none rounded-[10px]" />
                      <div className="basis-0 font-['Source_Sans_Pro:Regular',_sans-serif] grow leading-[0] min-h-px min-w-px not-italic relative shrink-0 text-[#15182f] text-[18px]" data-node-id="1489:495">
                        <p className="leading-[normal]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                          {language === 'ar' ? 'ما هي المستندات المطلوبة للحصول على قرض سكني؟' : 'What documents are required for a home loan?'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Input Form - Figma Design (below messages) */}
          <div className="bg-neutral-50 box-border content-stretch flex flex-col gap-6 items-start justify-center px-3.5 py-[15px] relative rounded-[10px] shrink-0 w-full max-w-[809px] mx-auto mt-2" data-node-id="1496:2035">
            <div aria-hidden="true" className="absolute border border-[#e2e2e2] border-solid inset-0 pointer-events-none rounded-[10px]" />
            <form onSubmit={handleSendMessage} className="content-stretch flex flex-col gap-6 items-start justify-start relative shrink-0 w-full" data-node-id="1496:2036">
              {selectedFile && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <span className="text-blue-600 text-sm">📎</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeSelectedFile}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title={language === 'ar' ? 'إزالة الملف' : 'Remove file'}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
              <div className="font-['Source_Sans_Pro:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#5b5b5f] text-[20px] text-nowrap w-full" data-node-id="1496:2037">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full h-12 input-stable bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[20px] text-[#5b5b5f] font-['Source_Sans_Pro:Regular',_sans-serif] placeholder-[#5b5b5f] disabled:opacity-50 disabled:cursor-not-allowed leading-[normal]"
                  placeholder={language === 'ar' ? 'اسألني أي شيء' : 'Ask me anything'}
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                  disabled={isLoading}
                  data-testid="chat-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                      e.preventDefault()
                      handleSendMessage(e as any)
                    }
                  }}
                />
              </div>
              <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="1496:2038">
                <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0" data-node-id="1496:2039">
                  <button
                    type="button"
                    disabled
                    className="h-[21px] relative shrink-0 w-5 opacity-60 cursor-not-allowed"
                    data-name="paperclip"
                    data-node-id="1496:2040"
                    title={language === 'ar' ? 'قريباً' : 'Coming soon'}
                    aria-label={language === 'ar' ? 'إرفاق ملف - قريباً' : 'Attach file - Coming soon'}
                  >
                    <img alt="" className="block max-w-none size-full" src={imgPaperclip} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                    className="hidden"
                    disabled
                  />
                  <div className="flex h-[0px] items-center justify-center relative shrink-0 w-[0px]">
                    <div className="flex-none rotate-[90deg]">
                      <div className="h-0 relative w-[18px]" data-node-id="1496:2042">
                        <div className="absolute bottom-0 left-0 right-0 top-[-1px]">
                          <img alt="" className="block max-w-none size-full" src={imgLine17} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[rgba(114,31,35,0.08)] box-border flex items-center justify-start gap-2 pl-4 pr-3 py-2 relative rounded-full shrink-0" data-node-id="1496:2043">
                    <div className="font-['Source_Sans_Pro:SemiBold',_sans-serif] not-italic relative shrink-0 text-[#721f23] text-[18px] leading-[22px] text-nowrap" data-node-id="1496:2044">
                      <p className="leading-[normal] whitespace-pre">{language === 'ar' ? 'سؤال/جواب' : 'Question/Answer'}</p>
                    </div>
                    <div className="flex items-center justify-center relative shrink-0">
                      <div className="flex-none rotate-[45deg]">
                        <div className="overflow-clip relative size-[19px]" data-name="fi_2997933" data-node-id="1496:2045">
                          <img alt="" className="block max-w-none size-full" src={imgFi2997933} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="content-stretch flex gap-4 items-center justify-end relative shrink-0" data-node-id="1496:2049">
                  <div
          className="overflow-clip relative shrink-0 size-[21px] opacity-60 cursor-not-allowed"
          data-name="fi_709682"
          data-node-id="1496:2050"
          title={language === 'ar' ? 'قريباً' : 'Coming soon'}
          aria-label={language === 'ar' ? 'المايكروفون - قريباً' : 'Microphone - Coming soon'}
          role="img"
        >
                    <div className="absolute bottom-0 left-[18%] right-[18%] top-[48.12%]" data-name="Group" data-node-id="1496:2052">
                      <img alt="" className="block max-w-none size-full" src={imgGroup} />
                    </div>
                    <div className="absolute bottom-[28.71%] left-[30.35%] right-[30.35%] top-0" data-name="Group" data-node-id="1496:2055">
                      <img alt="" className="block max-w-none size-full" src={imgGroup1} />
                    </div>
                  </div>
                  <div className="flex h-[0px] items-center justify-center relative shrink-0 w-[0px]">
                    <div className="flex-none rotate-[90deg]">
                      <div className="h-0 relative w-[30px]" data-node-id="1496:2057">
                        <div className="absolute bottom-0 left-0 right-0 top-[-1px]">
                          <img alt="" className="block max-w-none size-full" src={imgLine18} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    className={`bg-[#17365f] box-border content-stretch flex gap-2.5 items-center justify-center transition-opacity p-[16px] relative rounded-lg shrink-0 size-12 ${
                      (isLoading || !inputValue.trim()) ? 'opacity-40 cursor-not-allowed' : 'opacity-100 hover:opacity-90'
                    }`}
                    data-node-id="1496:2058"
                    data-testid="send-button"
                  >
                    <div className="overflow-clip relative shrink-0 size-6" data-name="mingcute:send-line" data-node-id="1496:2059">
                      <div className="absolute inset-[15.3%_15.3%_0.78%_11.33%]" data-name="Group" data-node-id="1496:2060">
                        <img alt="" className="block max-w-none size-full" src={imgGroup3} />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Filters Section removed as per request */}
      </div>
      
      {/* Chat Summary Modal */}
      {showSummary && (
        <div className="absolute bg-[#ffffff] right-12 rounded-3xl top-[109px] w-[494px] z-10 shadow-lg flex flex-col h-[calc(100vh-140px)]" data-node-id="1496:2374" data-testid="summary-panel">
          {/* Summary Header */}
          <div className="content-stretch flex items-center justify-between p-[26px]" data-node-id="1496:2388">
            <div className="font-['Source_Sans_Pro:SemiBold',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#15182f] text-[28px] text-nowrap" data-node-id="1496:2386">
              <p className="leading-[30px] whitespace-pre">
                {language === 'ar' ? 'ملخص المحادثة' : 'Chat Summary'}
              </p>
            </div>
            <button
              onClick={handleCloseSummary}
              className="relative shrink-0 size-6 hover:opacity-70 transition-opacity"
              data-testid="summary-close"
              aria-label={language === 'ar' ? 'إغلاق الملخص' : 'Close summary'}
            >
              <span className="block w-full h-full">×</span>
            </button>
          </div>

          {/* Separator Line */}
          <div className="h-0 w-full" data-node-id="1496:2389">
            <div className="h-px bg-[rgba(114,114,114,0.25)] w-full"></div>
          </div>

          {/* Summary Content */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-cbo stable-gutter p-[26px] pt-[27px]" data-node-id="1496:2397">
            {isGeneratingSummary ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#17365f] mx-auto mb-4"></div>
                  <p className="font-['Source_Sans_Pro:Regular',_sans-serif] text-[#15182f] text-[16px]">
                    {language === 'ar' ? 'جاري إنشاء الملخص...' : 'Generating summary...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="font-['Source_Sans_Pro:Regular',_sans-serif] leading-[28px] not-italic text-[#15182f] text-[18px]" data-node-id="1496:2390" dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="summary-text">
                {summaryText ? (
                  <div className="whitespace-pre-wrap">
                    {summaryText}
                  </div>
                ) : (
                  <p className="text-center text-[#999] italic">
                    {language === 'ar' ? 'لا يوجد ملخص متاح' : 'No summary available'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleCancelDelete} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-[#15182f]">
                {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}
              </h3>
              <p className="mt-2 text-[#63667d]">
                {language === 'ar'
                  ? `هل أنت متأكد أنك تريد حذف هذه المحادثة${sessionToDelete ? `: "${sessionToDelete.title}"` : ''}؟ لا يمكن التراجع عن هذا الإجراء.`
                  : `Are you sure you want to delete this chat${sessionToDelete ? `: "${sessionToDelete.title}"` : ''}? This action cannot be undone.`}
              </p>
              {deleteError && (
                <p className="mt-3 text-red-600 text-sm">{deleteError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-md border border-gray-300 text-[#15182f] hover:bg-gray-50 disabled:opacity-50"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (language === 'ar' ? 'جارٍ الحذف...' : 'Deleting...') : (language === 'ar' ? 'حذف' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

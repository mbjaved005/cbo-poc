"""
CBO Banking App PoC - FastAPI Backend
Main application entry point with Vectara integration
"""

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from datetime import datetime, timedelta
import jwt
import hashlib
import logging
from dotenv import load_dotenv
from vectara_client import vectara_client
from database import init_database, get_user_by_username, Session, ChatSession, ChatMessage, create_chat_session, save_chat_message
from sqlalchemy import desc

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="CBO Banking App PoC",
    description="AI-powered Document Analyzer and Conversational Chatbot for Central Bank of Oman",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_info: Dict[str, Any]

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    language: Optional[str] = "en"
    filters: Optional[List[str]] = None
    conversation_history: Optional[List[Dict[str, str]]] = None

class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    sources: List[Dict[str, Any]] = []

class ChatSessionCreate(BaseModel):
    title: str

class DocumentUpload(BaseModel):
    filename: str
    content: str
    classification: str = "public"  # public, confidential, secret, top_secret

# Mock user database (replace with real database in production)
MOCK_USERS = {
    "admin": {
        "password_hash": hashlib.sha256("admin123".encode()).hexdigest(),
        "role": "admin",
        "name": "Administrator",
        "email": "admin@cbo.om"
    },
    "user1": {
        "password_hash": hashlib.sha256("user123".encode()).hexdigest(),
        "role": "user",
        "name": "Bank Officer",
        "email": "officer@cbo.om"
    }
}

# Vectara configuration
VECTARA_CONFIG = {
    "customer_id": os.getenv("VECTARA_CUSTOMER_ID"),
    "corpus_id": os.getenv("VECTARA_CORPUS_ID"),
    "api_key": os.getenv("VECTARA_API_KEY"),
    "base_url": "https://api.vectara.io"
}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return username
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "CBO Banking App PoC API",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.post("/auth/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    """
    Authenticate user and return JWT token
    For PoC: Using mock authentication (replace with AD/LDAP in production)
    """
    username = login_request.username
    password_hash = hashlib.sha256(login_request.password.encode()).hexdigest()
    
    # Check mock user database
    if username not in MOCK_USERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    user = MOCK_USERS[username]
    if user["password_hash"] != password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Create access token
    access_token_expires = timedelta(hours=24)
    access_token = create_access_token(
        data={"sub": username}, expires_delta=access_token_expires
    )
    
    logger.info(f"User {username} logged in successfully")
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_info={
            "username": username,
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    )

@app.get("/auth/me")
async def get_current_user(current_user: str = Depends(verify_token)):
    """Get current user information"""
    if current_user not in MOCK_USERS:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = MOCK_USERS[current_user]
    return {
        "username": current_user,
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    chat_request: ChatRequest,
    current_user: str = Depends(verify_token)
):
    """
    Chat with AI using Vectara RAG
    This is the core chatbot functionality
    """
    try:
        # For first message in conversation, don't use conversation_id to let Vectara create one
        conversation_id = chat_request.conversation_id if chat_request.conversation_id else None
        
        # Build metadata filter based on selected filters
        metadata_filter = ""
        if chat_request.filters:
            filter_conditions = []
            for filter_type in chat_request.filters:
                filter_conditions.append(f"doc.category = '{filter_type}'")
            metadata_filter = " OR ".join(filter_conditions) if filter_conditions else ""
        
        # Check if this is a conversational/greeting query that doesn't need corpus search
        conversational_patterns = [
            "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
            "how are you", "what's up", "greetings", "salaam", "marhaba", "ahlan",
            "كيف حالك", "مرحبا", "أهلا", "السلام عليكم", "صباح الخير", "مساء الخير"
        ]
        
        is_conversational = any(pattern in chat_request.message.lower() for pattern in conversational_patterns)
        
        # For conversational queries, provide direct response without corpus search
        if is_conversational and len(chat_request.message.split()) <= 5:
            conversational_responses = {
                "en": "Hello! I'm the CBO AI Assistant. I'm here to help you with banking regulations, policies, and general banking information. How can I assist you today?",
                "ar": "مرحباً! أنا مساعد البنك المركزي العماني الذكي. أنا هنا لمساعدتك في اللوائح المصرفية والسياسات والمعلومات المصرفية العامة. كيف يمكنني مساعدتك اليوم؟"
            }
            
            return JSONResponse(content={
                "message": conversational_responses.get(chat_request.language, conversational_responses["en"]),
                "conversation_id": conversation_id or "",
                "sources": []
            })
        
        # For Vectara chat mode, use simple query without manual context
        # Vectara will handle conversation context automatically
        context_query = chat_request.message
        
        logger.info(f"Final query sent to Vectara: {context_query[:100]}...")

        # Use proper Vectara Chat API or fallback to legacy
        if conversation_id:
            # Continue existing conversation
            vectara_response = await vectara_client.add_chat_turn(
                chat_id=conversation_id,
                query_text=context_query,
                language=chat_request.language or "en"
            )
        else:
            # Start new conversation
            vectara_response = await vectara_client.create_chat(
                query_text=context_query,
                language=chat_request.language or "en",
                metadata_filter=metadata_filter
            )
        
        # Extract response text and sources from Vectara response
        response_text = "I'm here to help with your banking queries."
        sources = []
        
        logger.info(f"Vectara response: {vectara_response}")
        
        # Handle new Chat API response format
        if vectara_response and "id" in vectara_response:
            # New Chat API response format
            conversation_id = vectara_response["id"]
            logger.info(f"Vectara chat ID: {conversation_id}")
            
            if "turns" in vectara_response and vectara_response["turns"]:
                latest_turn = vectara_response["turns"][-1]
                if "answer" in latest_turn:
                    response_text = latest_turn["answer"]
                    logger.info(f"Chat response: {response_text[:100]}...")
                else:
                    logger.warning("No answer found in chat turn")
            else:
                logger.warning("No turns found in chat response")
                
        elif vectara_response and "responseSet" in vectara_response:
            # Legacy API response format (fallback)
            response_set = vectara_response["responseSet"][0]
            logger.info(f"Response set: {response_set}")
            
            if "summary" in response_set and response_set["summary"]:
                summary_item = response_set["summary"][0]
                if summary_item.get("text") and summary_item.get("text") != "I do not have enough information.":
                    response_text = summary_item["text"]
                    logger.info(f"Summary found: {response_text[:100]}...")
                else:
                    # Handle empty corpus case or insufficient information
                    status = summary_item.get("status", [])
                    if status and status[0].get("code") == "QRY__SMRY__NO_QUERY_RESULTS":
                        response_text = (
                            "I apologize, but I don't have any documents in my knowledge base yet to answer your question. "
                            "Please upload some documents first, or contact your administrator to populate the system with relevant banking documents."
                        )
                        logger.warning("Empty corpus - no documents available for search")
                    else:
                        # Check if this is a conversation history question
                        if any(word in chat_request.message.lower() for word in ["remember", "what did i", "previous", "earlier", "before", "what was the question", "what was my question", "last question"]):
                            # Build context from conversation history
                            if chat_request.conversation_history and len(chat_request.conversation_history) >= 2:
                                # Find the most recent user question (excluding current one)
                                user_questions = []
                                for turn in reversed(chat_request.conversation_history):
                                    if turn.get('role') == 'user' and turn.get('content', '').strip():
                                        # Skip the current question if it matches
                                        if turn.get('content', '').lower().strip() != chat_request.message.lower().strip():
                                            user_questions.append(turn.get('content', ''))
                                        if len(user_questions) >= 3:  # Get last 3 questions
                                            break
                                
                                if user_questions:
                                    if len(user_questions) == 1:
                                        response_text = f"Your most recent question was: \"{user_questions[0]}\""
                                    else:
                                        questions_list = "\n".join([f"- \"{q}\"" for q in user_questions[:3]])
                                        response_text = f"Your recent questions were:\n{questions_list}"
                                    
                                    response_text += "\n\nWould you like me to elaborate on any of these topics?"
                                else:
                                    response_text = "I can see our conversation history, but I don't have specific information about that topic in my current knowledge base. Could you please provide more context or ask about banking regulations, policies, or services?"
                            else:
                                response_text = "This appears to be the beginning of our conversation. What would you like to know about Central Bank of Oman services, banking regulations, or financial policies?"
                        else:
                            # For non-conversation history questions, try Vectara first, then fallback
                            # If we reach here, Vectara already returned insufficient info
                            # Check if we can provide any contextual help based on conversation
                            contextual_response = None
                            
                            # Look for banking-related keywords in current question
                            banking_keywords = ["loan", "bank", "regulation", "policy", "interest", "credit", "finance", "money", "currency", "payment"]
                            if any(keyword in chat_request.message.lower() for keyword in banking_keywords):
                                contextual_response = f"I understand you're asking about banking topics, but I don't have specific information about '{chat_request.message}' in my current knowledge base."
                            
                            # Check if user mentioned something from conversation history
                            if chat_request.conversation_history:
                                recent_topics = []
                                for turn in chat_request.conversation_history[-6:]:  # Last 3 exchanges
                                    if turn.get('role') == 'user':
                                        content = turn.get('content', '').lower()
                                        # Extract potential topics (simple keyword extraction)
                                        for keyword in banking_keywords:
                                            if keyword in content and keyword not in recent_topics:
                                                recent_topics.append(keyword)
                                
                                if recent_topics and any(topic in chat_request.message.lower() for topic in recent_topics):
                                    contextual_response = f"I see you're following up on topics we discussed earlier. While I don't have specific information about '{chat_request.message}', we were talking about {', '.join(recent_topics[:3])}. Could you be more specific about what aspect you'd like to know?"
                            
                            if contextual_response:
                                response_text = contextual_response + "\n\nI'm here to help with Central Bank of Oman services, banking regulations, policies, and loan information. Could you rephrase your question or provide more context?"
                            else:
                                response_text = "I don't have specific information about that topic in my current knowledge base. However, I'm here to help with banking regulations, policies, loan information, and other Central Bank of Oman services. Could you please rephrase your question or ask about a banking-related topic?"
                        logger.warning("No summary text found in response")
            else:
                logger.warning("No summary found in response")
            
            # Extract sources from response documents
            if "response" in response_set and response_set["response"]:
                for doc in response_set["response"][:3]:  # Limit to top 3 sources
                    source_info = {
                        "text": doc.get("text", "")[:200] + "...",  # Truncate for display
                        "score": doc.get("score", 0),
                        "metadata": {}
                    }
                    
                    # Extract metadata
                    if "metadata" in doc:
                        for meta in doc["metadata"]:
                            source_info["metadata"][meta.get("name", "")] = meta.get("value", "")
                    
                    sources.append(source_info)
        else:
            logger.info(f"Vectara conversation ID: {conversation_id}")
        # Save to database if user is authenticated
        try:
            user = get_user_by_username(current_user)
            if user and conversation_id:
                # Create chat session if it doesn't exist
                if not chat_request.conversation_id:
                    create_chat_session(conversation_id, user['id'])
                
                # Save the message exchange
                save_chat_message(
                    conversation_id,
                    chat_request.message,
                    response_text,
                    chat_request.language or "en",
                    sources
                )
                logger.info(f"Chat saved to database for user {current_user}")
        except Exception as e:
            logger.error(f"Error saving chat to database: {str(e)}")
            # Continue without database - don't break the chat flow
        
        logger.info(f"Chat request from {current_user}: {chat_request.message}")
        
        return ChatResponse(
            message=response_text,
            conversation_id=conversation_id or "",
            sources=sources
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing chat request"
        )

@app.post("/chat-summary")
async def generate_chat_summary(
    request: dict,
    current_user: str = Depends(verify_token)
):
    """Generate AI summary of a chat conversation using OpenAI"""
    try:
        import openai
        import os
        
        conversation_history = request.get('conversation_history', '')
        language = request.get('language', 'en')
        
        if not conversation_history:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No conversation history provided"
            )
        
        # Check if OpenAI API key is available
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if not openai_api_key:
            # Fallback to simple rule-based summarization
            return await generate_simple_summary(conversation_history, language)
        
        # Create summary prompt
        if language == 'ar':
            system_prompt = "أنت مساعد ذكي متخصص في تلخيص المحادثات المصرفية. قدم ملخصاً شاملاً ومفيداً."
            user_prompt = f"يرجى تقديم ملخص شامل ومختصر لهذه المحادثة المصرفية. ركز على:\n1. النقاط الرئيسية المناقشة\n2. الأسئلة المهمة المطروحة\n3. المعلومات والنصائح المقدمة\n4. أي قرارات أو خطوات تالية\n\nالمحادثة:\n{conversation_history}"
        else:
            system_prompt = "You are an AI assistant specialized in summarizing banking conversations. Provide comprehensive and helpful summaries."
            user_prompt = f"Please provide a comprehensive and concise summary of this banking conversation. Focus on:\n1. Key topics discussed\n2. Important questions asked\n3. Information and advice provided\n4. Any decisions or next steps\n\nConversation:\n{conversation_history}"
        
        try:
            # Use OpenAI API (v1.0+ syntax)
            from openai import OpenAI
            client = OpenAI(api_key=openai_api_key)
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            summary_text = response.choices[0].message.content.strip()
            
        except Exception as openai_error:
            logger.warning(f"OpenAI API error: {str(openai_error)}")
            # Fallback to simple summarization
            return await generate_simple_summary(conversation_history, language)
        
        return {
            "summary": summary_text,
            "language": language
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating chat summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating chat summary"
        )

async def generate_simple_summary(conversation_history: str, language: str):
    """Fallback simple rule-based summarization"""
    try:
        lines = conversation_history.split('\n')
        user_messages = [line for line in lines if line.startswith('User:')]
        ai_messages = [line for line in lines if line.startswith('Assistant:')]
        
        # Extract key topics (simple keyword extraction)
        banking_keywords = ['loan', 'credit', 'bank', 'account', 'payment', 'interest', 'mortgage', 'finance']
        found_topics = []
        
        for line in lines:
            for keyword in banking_keywords:
                if keyword.lower() in line.lower() and keyword not in found_topics:
                    found_topics.append(keyword)
        
        if language == 'ar':
            summary = f"ملخص المحادثة:\n\n"
            summary += f"• عدد الأسئلة المطروحة: {len(user_messages)}\n"
            summary += f"• عدد الردود المقدمة: {len(ai_messages)}\n"
            if found_topics:
                summary += f"• المواضيع المناقشة: {', '.join(found_topics[:5])}\n"
            summary += f"\nهذا ملخص أساسي للمحادثة. للحصول على ملخص أكثر تفصيلاً، يرجى إعداد مفتاح OpenAI API."
        else:
            summary = f"Conversation Summary:\n\n"
            summary += f"• Questions asked: {len(user_messages)}\n"
            summary += f"• Responses provided: {len(ai_messages)}\n"
            if found_topics:
                summary += f"• Topics discussed: {', '.join(found_topics[:5])}\n"
            summary += f"\nThis is a basic summary. For more detailed summaries, please configure OpenAI API key."
        
        return {
            "summary": summary,
            "language": language
        }
        
    except Exception as e:
        logger.error(f"Error in simple summarization: {str(e)}")
        return {
            "summary": "Unable to generate summary at this time.",
            "language": language
        }

@app.post("/documents/upload")
async def upload_document(
    document: DocumentUpload,
    current_user: str = Depends(verify_token)
):
    """
    Upload and process document for AI analysis using Vectara
    """
    try:
        # Generate unique document ID
        document_id = f"doc_{datetime.utcnow().timestamp()}_{current_user}"
        
        # Prepare metadata
        metadata = {
            "filename": document.filename,
            "classification": document.classification,
            "uploaded_by": current_user,
            "uploaded_at": datetime.utcnow().isoformat(),
            "source": "cbo_upload",
            "category": "general"  # Default category
        }
        
        # Ingest document into Vectara
        vectara_response = await vectara_client.ingest_document(
            document_id=document_id,
            title=document.filename,
            content=document.content,
            metadata=metadata
        )
        
        logger.info(f"Document upload from {current_user}: {document.filename}")
        
        return {
            "message": "Document uploaded and processed successfully",
            "document_id": document_id,
            "filename": document.filename,
            "classification": document.classification,
            "status": "processed",
            "vectara_response": vectara_response
        }
        
    except Exception as e:
        logger.error(f"Document upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error uploading document"
        )

@app.get("/documents")
async def list_documents(current_user: str = Depends(verify_token)):
    """List available documents for the user"""
    # Mock document list
    return {
        "documents": [
            {
                "id": "doc_1",
                "filename": "banking_regulations.pdf",
                "classification": "public",
                "uploaded_at": "2025-08-14T10:00:00Z"
            },
            {
                "id": "doc_2", 
                "filename": "internal_policy.docx",
                "classification": "confidential",
                "uploaded_at": "2025-08-14T09:30:00Z"
            }
        ]
    }

async def upload_conversational_knowledge_base():
    """Upload the conversational FAQ document to Vectara corpus"""
    try:
        import os
        knowledge_base_path = os.path.join(os.path.dirname(__file__), "..", "docs", "conversational-knowledge-base.md")
        
        if os.path.exists(knowledge_base_path):
            with open(knowledge_base_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Prepare metadata for conversational knowledge base
            metadata = {
                "filename": "conversational-knowledge-base.md",
                "classification": "public",
                "uploaded_by": "system",
                "uploaded_at": datetime.utcnow().isoformat(),
                "source": "cbo_system",
                "category": "conversational",
                "type": "knowledge-base",
                "language": "en,ar"
            }
            
            # Upload to Vectara
            document_id = "cbo_conversational_kb_v1"
            vectara_response = await vectara_client.ingest_document(
                document_id=document_id,
                title="CBO AI Assistant - Conversational Knowledge Base",
                content=content,
                metadata=metadata
            )
            
            logger.info("Conversational knowledge base uploaded to Vectara successfully")
        else:
            logger.warning(f"Conversational knowledge base file not found at: {knowledge_base_path}")
            
    except Exception as e:
        logger.error(f"Error uploading conversational knowledge base: {str(e)}")

@app.get("/admin/upload-knowledge-base")
async def upload_knowledge_base_endpoint():
    """Manual endpoint to upload conversational knowledge base - no auth required for admin setup"""
    await upload_conversational_knowledge_base()
    return {"message": "Conversational knowledge base upload initiated"}

# Chat Session Management Endpoints
@app.get("/chat-sessions")
async def get_chat_sessions(current_user: str = Depends(verify_token)):
    """Get all chat sessions for the authenticated user"""
    try:
        user = get_user_by_username(current_user)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        session = Session()
        try:
            chat_sessions = session.query(ChatSession).filter_by(
                user_id=user['id']
            ).order_by(desc(ChatSession.last_activity)).all()
            
            result = []
            for chat_session in chat_sessions:
                # Get messages for this session
                messages = session.query(ChatMessage).filter_by(
                    conversation_id=chat_session.conversation_id
                ).order_by(ChatMessage.created_at).all()
                
                # Generate title from first message or use default
                title = "New Chat"
                if messages:
                    first_msg = messages[0].user_message
                    title = first_msg[:50] + "..." if len(first_msg) > 50 else first_msg
                
                # Convert to frontend format
                session_data = {
                    "id": chat_session.conversation_id,
                    "title": title,
                    "messages": [],
                    "createdAt": chat_session.created_at.isoformat(),
                    "updatedAt": chat_session.last_activity.isoformat()
                }
                
                # Add messages in chat format
                for msg in messages:
                    # Add user message
                    session_data["messages"].append({
                        "id": f"{msg.id}_user",
                        "text": msg.user_message,
                        "sender": "user",
                        "timestamp": msg.created_at.isoformat(),
                        "originalQuery": msg.user_message
                    })
                    
                    # Add AI response
                    session_data["messages"].append({
                        "id": f"{msg.id}_ai",
                        "text": msg.ai_response,
                        "sender": "ai",
                        "timestamp": msg.created_at.isoformat(),
                        "sources": eval(msg.sources) if msg.sources else [],
                        "originalQuery": msg.user_message
                    })
                
                result.append(session_data)
            
            return {"sessions": result}
            
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Error getting chat sessions: {str(e)}")
        # Return empty sessions if database fails - don't break the app
        return {"sessions": []}

@app.post("/chat-sessions")
async def create_chat_session_endpoint(
    session_data: ChatSessionCreate,
    current_user: str = Depends(verify_token)
):
    """Create a new chat session"""
    try:
        user = get_user_by_username(current_user)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Generate conversation ID
        conversation_id = f"chat_{user['id']}_{int(datetime.now().timestamp())}"
        
        # Create chat session in database
        create_chat_session(conversation_id, user['id'])
        
        return {
            "id": conversation_id,
            "title": session_data.title,
            "messages": [],
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error creating chat session: {str(e)}")
        # Fallback to generating ID without database
        conversation_id = f"chat_{int(datetime.now().timestamp())}"
        return {
            "id": conversation_id,
            "title": session_data.title,
            "messages": [],
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }

@app.delete("/chat-sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: str = Depends(verify_token)
):
    """Delete a chat session"""
    try:
        user = get_user_by_username(current_user)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        session = Session()
        try:
            # Delete messages first
            session.query(ChatMessage).filter_by(conversation_id=session_id).delete()
            
            # Delete session
            deleted = session.query(ChatSession).filter_by(
                conversation_id=session_id,
                user_id=user['id']
            ).delete()
            
            session.commit()
            
            if deleted == 0:
                raise HTTPException(status_code=404, detail="Chat session not found")
            
            return {"message": "Chat session deleted successfully"}
            
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Error deleting chat session: {str(e)}")
        return {"message": "Chat session deletion failed, but continuing"}

@app.get("/health")
async def health_check():
    """Detailed health check for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "api": "up",
            "vectara": "pending_integration",
            "database": "mock_mode"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

"""
CBO Banking App PoC - Database Configuration
Database setup for user management and session tracking with PostgreSQL support
"""

import os
import logging
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv
import hashlib

load_dotenv()

logger = logging.getLogger(__name__)

# Database configuration with PostgreSQL support
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cbo_poc.db")

# Create engine with proper configuration for both SQLite and PostgreSQL
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=False  # Set to True for SQL debugging
    )
else:
    # SQLite configuration (fallback)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, nullable=False, default='user')
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    is_active = Column(Boolean, default=True)

class ChatSession(Base):
    __tablename__ = 'chat_sessions'
    id = Column(Integer, primary_key=True)
    conversation_id = Column(String, unique=True, nullable=False)
    user_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    id = Column(Integer, primary_key=True)
    conversation_id = Column(String, nullable=False)
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    language = Column(String, default='en')
    sources = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True)
    document_id = Column(String, unique=True, nullable=False)
    filename = Column(String, nullable=False)
    classification = Column(String, nullable=False, default='public')
    uploaded_by = Column(Integer, nullable=False)
    vectara_doc_id = Column(String)
    status = Column(String, default='processing')
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(engine)

# Session factory
Session = sessionmaker(bind=engine)

def init_database():
    """Initialize the database with required tables"""
    try:
        # Tables are already created by SQLAlchemy
        Base.metadata.create_all(engine)
        logger.info("Database tables created successfully")
        
        # Insert default users if they don't exist
        insert_default_users()
        
        return True
        
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        return False

def insert_default_users():
    """Insert default users for PoC testing"""
    default_users = [
        {
            'username': 'admin',
            'password': 'admin123',
            'name': 'Administrator',
            'email': 'admin@cbo.gov.om',
            'role': 'admin'
        },
        {
            'username': 'user1',
            'password': 'user123',
            'name': 'Test User',
            'email': 'user1@cbo.gov.om',
            'role': 'user'
        },
        {
            'username': 'analyst',
            'password': 'analyst123',
            'name': 'Data Analyst',
            'email': 'analyst@cbo.gov.om',
            'role': 'analyst'
        }
    ]
    
    session = Session()
    
    for user in default_users:
        try:
            # Check if user already exists
            existing_user = session.query(User).filter_by(username=user['username']).first()
            if existing_user is None:
                # Hash password
                password_hash = hashlib.sha256(user['password'].encode()).hexdigest()
                
                new_user = User(
                    username=user['username'],
                    password_hash=password_hash,
                    name=user['name'],
                    email=user['email'],
                    role=user['role']
                )
                
                session.add(new_user)
                session.commit()
                
                logger.info(f"Created default user: {user['username']}")
        
        except Exception as e:
            logger.error(f"Error creating user {user['username']}: {str(e)}")
    
    session.close()

def get_user_by_username(username):
    """Get user by username"""
    try:
        session = Session()
        
        user = session.query(User).filter_by(username=username, is_active=True).first()
        
        session.close()
        
        if user:
            return {
                'id': user.id,
                'username': user.username,
                'password_hash': user.password_hash,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'is_active': user.is_active
            }
        return None
        
    except Exception as e:
        logger.error(f"Error getting user {username}: {str(e)}")
        return None

def update_last_login(username):
    """Update user's last login timestamp"""
    try:
        session = Session()
        
        user = session.query(User).filter_by(username=username).first()
        
        if user:
            user.last_login = datetime.utcnow()
            session.commit()
        
        session.close()
        
    except Exception as e:
        logger.error(f"Error updating last login for {username}: {str(e)}")

def create_chat_session(conversation_id, user_id):
    """Create a new chat session"""
    try:
        session = Session()
        
        existing_session = session.query(ChatSession).filter_by(conversation_id=conversation_id).first()
        
        if existing_session is None:
            new_session = ChatSession(
                conversation_id=conversation_id,
                user_id=user_id
            )
            
            session.add(new_session)
            session.commit()
        
        session.close()
        
    except Exception as e:
        logger.error(f"Error creating chat session: {str(e)}")

def save_chat_message(conversation_id, user_message, ai_response, language='en', sources=None):
    """Save chat message to database"""
    try:
        session = Session()
        
        new_message = ChatMessage(
            conversation_id=conversation_id,
            user_message=user_message,
            ai_response=ai_response,
            language=language,
            sources=str(sources) if sources else None
        )
        
        session.add(new_message)
        session.commit()
        
        # Update session last activity
        session.query(ChatSession).filter_by(conversation_id=conversation_id).update({'last_activity': datetime.utcnow()})
        session.commit()
        
        session.close()
        
    except Exception as e:
        logger.error(f"Error saving chat message: {str(e)}")

def save_document(document_id, filename, classification, uploaded_by, vectara_doc_id=None):
    """Save document metadata to database"""
    try:
        session = Session()
        
        new_document = Document(
            document_id=document_id,
            filename=filename,
            classification=classification,
            uploaded_by=uploaded_by,
            vectara_doc_id=vectara_doc_id,
            status='processed'
        )
        
        session.add(new_document)
        session.commit()
        
        session.close()
        
    except Exception as e:
        logger.error(f"Error saving document: {str(e)}")

def get_user_documents(user_id):
    """Get documents uploaded by user"""
    try:
        session = Session()
        
        documents = session.query(Document).filter_by(uploaded_by=user_id).order_by(Document.created_at.desc()).all()
        
        session.close()
        
        return [{
            'document_id': doc.document_id,
            'filename': doc.filename,
            'classification': doc.classification,
            'status': doc.status,
            'created_at': doc.created_at
        } for doc in documents]
        
    except Exception as e:
        logger.error(f"Error getting user documents: {str(e)}")
        return []

if __name__ == "__main__":
    # Initialize database when run directly
    logging.basicConfig(level=logging.INFO)
    if init_database():
        print("✅ Database initialized successfully!")
        print("Default users created:")
        print("- admin / admin123 (Administrator)")
        print("- user1 / user123 (Bank Officer)")
        print("- analyst / analyst123 (Data Analyst)")
    else:
        print("❌ Database initialization failed!")

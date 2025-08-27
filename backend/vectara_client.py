"""
Vectara API Client for CBO Banking App PoC
Handles document ingestion and RAG queries
"""

import httpx
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class VectaraClient:
    """Client for interacting with Vectara API"""
    
    def __init__(self):
        self.customer_id = os.getenv("VECTARA_CUSTOMER_ID")
        self.corpus_id = os.getenv("VECTARA_CORPUS_ID") 
        self.api_key = os.getenv("VECTARA_API_KEY")
        self.base_url = "https://api.vectara.io"
        
        if not all([self.customer_id, self.corpus_id, self.api_key]):
            logger.warning("Vectara credentials not fully configured. Running in mock mode.")
            logger.warning(f"Missing: customer_id={bool(self.customer_id)}, corpus_id={bool(self.corpus_id)}, api_key={bool(self.api_key)}")
            self.mock_mode = True
        else:
            logger.info(f"Vectara client initialized successfully with customer_id={self.customer_id}, corpus_id={self.corpus_id}")
            self.mock_mode = False
            
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "customer-id": self.customer_id or "",
            "x-api-key": self.api_key or ""
        }
    
    async def ingest_document(
        self, 
        document_id: str,
        title: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Ingest a document into Vectara corpus
        """
        if self.mock_mode:
            return self._mock_ingest_response(document_id, title)
        
        try:
            url = f"{self.base_url}/v1/index"
            
            payload = {
                "customer_id": self.customer_id,
                "corpus_id": self.corpus_id,
                "document": {
                    "document_id": document_id,
                    "title": title,
                    "metadata_json": json.dumps(metadata or {}),
                    "section": [
                        {
                            "text": content,
                            "metadata_json": json.dumps({
                                "source": "cbo_document",
                                "ingested_at": datetime.utcnow().isoformat()
                            })
                        }
                    ]
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                
                logger.info(f"Document {document_id} ingested successfully")
                return response.json()
                
        except Exception as e:
            logger.error(f"Error ingesting document {document_id}: {str(e)}")
            raise
    
    async def query(
        self,
        query_text: str,
        num_results: int = 10,
        metadata_filter: Optional[str] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Query Vectara for relevant documents and generate response
        """
        if self.mock_mode:
            return self._mock_query_response(query_text, language)
        
        try:
            url = f"{self.base_url}/v1/query"
            
            payload = {
                "query": [
                    {
                        "query": query_text,
                        "num_results": num_results,
                        "corpus_key": [
                            {
                                "customer_id": self.customer_id,
                                "corpus_id": self.corpus_id,
                                "metadata_filter": metadata_filter or ""
                            }
                        ]
                    }
                ]
            }
            
            async with httpx.AsyncClient() as client:
                logger.info(f"Making Vectara API call to: {url}")
                logger.info(f"Customer ID: {self.customer_id} (type: {type(self.customer_id)})")
                logger.info(f"Corpus ID: {self.corpus_id} (type: {type(self.corpus_id)})")
                logger.info(f"Payload: {json.dumps(payload, indent=2)}")
                
                response = await client.post(url, json=payload, headers=self.headers)
                
                logger.info(f"Vectara API response status: {response.status_code}")
                
                if response.status_code != 200:
                    logger.error(f"Vectara API error: {response.status_code} - {response.text}")
                    response.raise_for_status()
                
                result = response.json()
                logger.info(f"Vectara API response: {json.dumps(result, indent=2)}")
                
                # Check if we got actual search results
                if result.get("responseSet") and result["responseSet"][0].get("response"):
                    logger.info(f"Found {len(result['responseSet'][0]['response'])} search results")
                else:
                    logger.warning("No search results returned from Vectara")
                
                return result
                
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            raise
    
    async def create_chat(
        self,
        query_text: str,
        language: str = "en",
        max_summarized_results: int = 5,
        metadata_filter: str = ""
    ) -> Dict[str, Any]:
        """
        Create a new chat session using Vectara's Chat API
        """
        if self.mock_mode:
            return self._mock_chat_response(query_text, language)
        
        try:
            url = f"{self.base_url}/v2/chats"
            
            payload = {
                "query": query_text,
                "search": {
                    "corpora": [
                        {
                            "customer_id": int(self.customer_id),
                            "corpus_id": int(self.corpus_id),
                            "metadata_filter": metadata_filter or ""
                        }
                    ],
                    "limit": 10
                },
                "generation": {
                    "max_used_search_results": max_summarized_results,
                    "response_language": language,
                    "prompt_name": "vectara-summary-ext-24-05-sml"
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                
                result = response.json()
                logger.info(f"Chat created successfully for: {query_text[:50]}...")
                return result
                
        except Exception as e:
            logger.error(f"Error creating chat: {str(e)}")
            # Fallback to legacy query API
            return await self.generate_summary_legacy(query_text, language, max_summarized_results, metadata_filter)
    
    async def add_chat_turn(
        self,
        chat_id: str,
        query_text: str,
        language: str = "en",
        max_summarized_results: int = 5
    ) -> Dict[str, Any]:
        """
        Add a turn to existing chat session
        """
        if self.mock_mode:
            return self._mock_chat_response(query_text, language)
        
        try:
            url = f"{self.base_url}/v2/chats/{chat_id}/turns"
            
            payload = {
                "query": query_text,
                "generation": {
                    "max_used_search_results": max_summarized_results,
                    "response_language": language,
                    "prompt_name": "vectara-summary-ext-24-05-sml"
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                
                result = response.json()
                logger.info(f"Chat turn added successfully for: {query_text[:50]}...")
                return result
                
        except Exception as e:
            logger.error(f"Error adding chat turn: {str(e)}")
            # Fallback to creating new chat
            return await self.create_chat(query_text, language, max_summarized_results)

    async def generate_summary_legacy(
        self,
        query_text: str,
        language: str = "en",
        max_summarized_results: int = 5,
        metadata_filter: str = ""
    ) -> Dict[str, Any]:
        """
        Legacy summary generation using v1/query API (fallback)
        """
        if self.mock_mode:
            return self._mock_summary_response(query_text, language)
        
        try:
            url = f"{self.base_url}/v1/query"
            
            payload = {
                "query": [
                    {
                        "query": query_text,
                        "num_results": 10,
                        "corpus_key": [
                            {
                                "customer_id": int(self.customer_id),
                                "corpus_id": int(self.corpus_id),
                                "metadata_filter": metadata_filter or ""
                            }
                        ],
                        "summary": [
                            {
                                "max_summarized_results": max_summarized_results,
                                "response_lang": language,
                                "summarizerPromptName": "vectara-summary-ext-24-05-sml"
                            }
                        ]
                    }
                ]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                
                result = response.json()
                logger.info(f"Summary generated successfully for: {query_text[:50]}...")
                return result
                
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            raise
    
    def _mock_ingest_response(self, document_id: str, title: str) -> Dict[str, Any]:
        """Mock response for document ingestion"""
        return {
            "status": "success",
            "document_id": document_id,
            "title": title,
            "message": "Document ingested successfully (mock mode)",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _mock_query_response(self, query_text: str, language: str) -> Dict[str, Any]:
        """Mock response for queries"""
        if language == "ar":
            mock_response = f"هذا رد تجريبي على سؤالك: '{query_text}'. في الوضع الحقيقي، سيتم البحث في قاعدة البيانات وإرجاع النتائج ذات الصلة."
        else:
            mock_response = f"This is a mock response to your query: '{query_text}'. In production, this would search through the document corpus and return relevant results."
        
        return {
            "responseSet": [
                {
                    "response": [
                        {
                            "text": mock_response,
                            "score": 0.95,
                            "metadata": [
                                {
                                    "name": "source",
                                    "value": "mock_document.pdf"
                                },
                                {
                                    "name": "page",
                                    "value": "1"
                                }
                            ]
                        }
                    ],
                    "status": [
                        {
                            "chat": status,
                            "statusDetail": "Mock response generated successfully"
                        }
                    ]
                }
            ]
        }
    
    def _mock_chat_response(self, query_text: str, language: str) -> Dict[str, Any]:
        """Mock response for chat creation"""
        return {
            "id": f"chat_{datetime.utcnow().timestamp()}",
            "turns": [
                {
                    "id": f"turn_{datetime.utcnow().timestamp()}",
                    "query": query_text,
                    "answer": f"Mock response for: {query_text}",
                    "enabled": True,
                    "search_results": []
                }
            ],
            "enabled": True,
            "created_at": datetime.utcnow().isoformat()
        }

    def _mock_summary_response(self, query_text: str, language: str) -> Dict[str, Any]:
        """Mock response for summary generation"""
        if self.mock_mode:
            logger.info("Running in mock mode - returning sample response")
            # Return mock response for testing
            return {
                "responseSet": [
                    {
                        "summary": [
                            {
                                "text": f"This is a mock response to your query: '{query_text}'. In a real implementation, this would be generated by Vectara's AI based on your document corpus. The system is currently running in mock mode because Vectara credentials are not properly configured."
                            }
                        ],
                        "response": [
                            {
                                "text": "Sample document content that would be relevant to the query.",
                                "score": 0.85,
                                "metadata": [
                                    {"name": "title", "value": "Sample Document"},
                                    {"name": "source", "value": "Mock Data"}
                                ]
                            }
                        ]
                    }
                ]
            }
        else:
            if language == "ar":
                summary_text = f"ملخص: بناءً على سؤالك '{query_text}', هذا ملخص تجريبي للمعلومات ذات الصلة من الوثائق المتاحة."
            else:
                summary_text = f"Summary: Based on your query '{query_text}', this is a mock summary of relevant information from available documents."
            
            return {
                "responseSet": [
                    {
                        "summary": [
                            {
                                "text": summary_text,
                                "lang": language,
                                "prompt": "Mock summary prompt"
                            }
                        ],
                        "response": [
                            {
                                "text": "Supporting document excerpt...",
                                "score": 0.9,
                                "metadata": [
                                    {
                                        "name": "source",
                                        "value": "banking_policy.pdf"
                                    }
                                ]
                            }
                        ],
                        "status": [
                            {
                                "code": "OK",
                                "statusDetail": "Mock summary generated successfully"
                            }
                        ]
                    }
                ]
            }

# Global Vectara client instance
vectara_client = VectaraClient()

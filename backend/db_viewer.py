#!/usr/bin/env python3
"""
Simple SQLite Database Viewer for CBO PoC
Run this script to view and manage database entries via web interface
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path

def view_database():
    """View all tables and data in the database"""
    db_path = Path("cbo_poc.db")
    
    if not db_path.exists():
        print("❌ Database file not found. Run the backend first to create it.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print("🗄️  CBO PoC Database Contents")
        print("=" * 50)
        
        for table in tables:
            table_name = table[0]
            print(f"\n📋 Table: {table_name}")
            print("-" * 30)
            
            # Get table schema
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            
            # Get all data
            cursor.execute(f"SELECT * FROM {table_name};")
            rows = cursor.fetchall()
            
            if rows:
                # Print column headers
                headers = [col[1] for col in columns]
                print(" | ".join(headers))
                print("-" * (len(" | ".join(headers))))
                
                # Print data rows
                for row in rows:
                    formatted_row = []
                    for item in row:
                        if isinstance(item, str) and len(item) > 30:
                            formatted_row.append(item[:27] + "...")
                        else:
                            formatted_row.append(str(item))
                    print(" | ".join(formatted_row))
            else:
                print("(No data)")
        
    except Exception as e:
        print(f"❌ Error reading database: {e}")
    finally:
        conn.close()

def add_test_data():
    """Add some test data to the database"""
    db_path = Path("cbo_poc.db")
    
    if not db_path.exists():
        print("❌ Database file not found. Run the backend first to create it.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add test chat messages
        test_messages = [
            ("admin", "What are the latest banking regulations?", "Based on the documents, here are the key banking regulations...", datetime.now().isoformat()),
            ("user1", "How do I apply for a business loan?", "To apply for a business loan, you need to...", datetime.now().isoformat()),
            ("analyst", "Show me the compliance requirements", "The compliance requirements include...", datetime.now().isoformat())
        ]
        
        for username, question, response, timestamp in test_messages:
            cursor.execute("""
                INSERT OR IGNORE INTO chat_history (username, message, response, timestamp)
                VALUES (?, ?, ?, ?)
            """, (username, question, response, timestamp))
        
        conn.commit()
        print("✅ Test data added successfully")
        
    except Exception as e:
        print(f"❌ Error adding test data: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("CBO PoC Database Manager")
    print("1. View Database Contents")
    print("2. Add Test Data")
    print("3. Exit")
    
    choice = input("\nSelect option (1-3): ").strip()
    
    if choice == "1":
        view_database()
    elif choice == "2":
        add_test_data()
        print("\nUpdated database contents:")
        view_database()
    elif choice == "3":
        print("Goodbye!")
    else:
        print("Invalid choice")

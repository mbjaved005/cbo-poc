#!/usr/bin/env python3
"""
Unified Development Server for CBO PoC
Runs both FastAPI backend and Next.js frontend from a single command
"""

import subprocess
import threading
import time
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

def run_backend():
    """Run FastAPI backend server"""
    print("🔧 Starting FastAPI Backend...")
    # Get absolute paths to avoid directory conflicts
    script_dir = Path(__file__).parent.absolute()
    backend_dir = script_dir / "backend"
    
    # Set up environment for subprocess
    env = os.environ.copy()
    
    try:
        os.chdir(backend_dir)
        subprocess.run([sys.executable, "main.py"], check=True, env=env)
    except KeyboardInterrupt:
        print("\n🛑 Backend server stopped")
    except Exception as e:
        print(f"❌ Backend error: {e}")

def run_frontend():
    """Run Next.js frontend server"""
    print("🌐 Starting Next.js Frontend...")
    # Get absolute paths to avoid directory conflicts
    script_dir = Path(__file__).parent.absolute()
    frontend_dir = script_dir / "frontend"
    
    try:
        if not frontend_dir.exists():
            print(f"❌ Frontend directory not found: {frontend_dir}")
            return
            
        os.chdir(frontend_dir)
        # Use powershell to run npm on Windows
        subprocess.run(["powershell", "-Command", "npm run dev"], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Frontend server stopped")
    except Exception as e:
        print(f"❌ Frontend error: {e}")

def main():
    """Main function to start both servers"""
    print("🚀 CBO PoC Unified Development Server")
    print("=" * 50)
    
    # Load environment variables from root .env file
    script_dir = Path(__file__).parent.absolute()
    env_file = script_dir / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        print(f"📄 Loaded environment variables from {env_file}")
    
    # Also load from backend .env file
    backend_env = script_dir / "backend" / ".env"
    if backend_env.exists():
        load_dotenv(backend_env)
        print(f"📄 Loaded backend environment variables from {backend_env}")
    
    # Start backend in separate thread
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    backend_thread.start()
    
    # Wait a moment for backend to start
    time.sleep(3)
    
    # Start frontend in separate thread
    frontend_thread = threading.Thread(target=run_frontend, daemon=True)
    frontend_thread.start()
    
    print("\n✅ Development servers started!")
    print("📡 Backend: http://localhost:8000")
    print("🌐 Frontend: http://localhost:3000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop all servers")
    
    try:
        # Keep main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down development servers...")
        sys.exit(0)

if __name__ == "__main__":
    main()

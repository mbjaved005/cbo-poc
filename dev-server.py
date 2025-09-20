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
        subprocess.run([sys.executable, "main.py"], check=True, env=env, cwd=str(backend_dir))
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
            
        # Ensure dependencies are installed
        node_modules = frontend_dir / "node_modules"
        lockfile = frontend_dir / "package-lock.json"
        if not node_modules.exists():
            print("📦 Installing frontend dependencies (this may take a minute)...")
            install_cmd = "npm ci" if lockfile.exists() else "npm install"
            subprocess.run(["powershell", "-Command", install_cmd], check=True, cwd=str(frontend_dir))

        # Verify 'next' binary exists in local node_modules after install
        next_bin_unix = frontend_dir / "node_modules" / ".bin" / "next"
        next_bin_win = frontend_dir / "node_modules" / ".bin" / "next.cmd"
        if not next_bin_unix.exists() and not next_bin_win.exists():
            print("ℹ️ 'next' not found locally. Ensuring dependencies are installed...")
            subprocess.run(["powershell", "-Command", "npm install"], check=True, cwd=str(frontend_dir))

        # Use powershell to run npm on Windows
        subprocess.run(["powershell", "-Command", "npm run dev"], check=True, cwd=str(frontend_dir))
    except KeyboardInterrupt:
        print("\n🛑 Frontend server stopped")
    except FileNotFoundError:
        print("❌ Frontend error: npm was not found on your PATH. Please install Node.js from https://nodejs.org and restart.")
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

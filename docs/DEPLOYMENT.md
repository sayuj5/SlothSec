# Deployment & Setup Guide — SlothSec

## 1. System Requirements
- **Operating System:** Windows 10/11, macOS, or Linux.
- **Python:** 3.11+ (tested on Python 3.13.1).
- **Node.js:** v18+ (tested on Node.js v24.13.1, npm 11.8.0).
- **Git:** 2.30+.
- **Ollama:** Installed locally with model `qwen3:4b`.
- **Hardware:**
  - Minimum: 8 GB RAM, 4 CPU cores.
  - Recommended: 16 GB RAM, 6+ CPU cores (e.g. Intel Core i5-12400F).

---

## 2. Windows Quick Start (PowerShell)

### Step 1: Clone or Navigate to the Workspace
```powershell
cd C:\Users\Sayuj\Desktop\SlothSec
```

### Step 2: Verify Installed Tools
```powershell
.\scripts\check-tools.ps1
```

### Step 3: Automated Setup & Dependency Installation
```powershell
.\scripts\setup.ps1
```
This script automatically:
1. Installs Python dependencies into `.venv`.
2. Installs frontend npm packages and compiles the TypeScript bundle.
3. Initializes the SQLite schema (`slothsec.db`).

### Step 4: Ensure Ollama is Running with Qwen3
```powershell
ollama list
# If qwen3:4b is not installed:
ollama pull qwen3:4b
```

### Step 5: Launch SlothSec Development Servers
```powershell
.\scripts\dev.ps1
```
The application will launch on:
- **Frontend Dashboard:** `http://localhost:5173`
- **Backend API & Swagger:** `http://127.0.0.1:8000/docs`

---

## 3. Environment Variables (.env)
Copy `.env.example` to `.env` to customize settings:
```ini
HOST=127.0.0.1
PORT=8000
DATABASE_URL=sqlite:///./slothsec.db
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_TIMEOUT_SECONDS=180
SCAN_TIMEOUT_SECONDS=300
OTEL_ENABLED=true
SENTRY_ENABLED=false
```

#!/bin/bash
#
# AI Enterprise - Stop Servers
# Ferma il server Python Orchestrator e il Dashboard React
#
# Uso: ./stop-servers.sh [--orchestrator-only] [--dashboard-only]
#

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           AI Enterprise - Stop Servers                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Parse arguments
STOP_ORCHESTRATOR=true
STOP_DASHBOARD=true

for arg in "$@"; do
    case $arg in
        --orchestrator-only)
            STOP_DASHBOARD=false
            shift
            ;;
        --dashboard-only)
            STOP_ORCHESTRATOR=false
            shift
            ;;
        --help|-h)
            echo "Usage: ./stop-servers.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --orchestrator-only    Stop only the Python orchestrator server"
            echo "  --dashboard-only       Stop only the React dashboard"
            echo "  --help, -h             Show this help message"
            echo ""
            echo "Ports:"
            echo "  Orchestrator: 8080"
            echo "  Dashboard:    3000"
            exit 0
            ;;
    esac
done

# Stop orchestrator (port 8080)
if $STOP_ORCHESTRATOR; then
    echo -e "${YELLOW}Stopping Orchestrator (port 8080)...${NC}"

    # Find and kill processes on port 8080
    PIDS=$(lsof -ti:8080 2>/dev/null)
    if [ -n "$PIDS" ]; then
        echo "$PIDS" | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✓ Orchestrator stopped${NC}"
    else
        echo -e "${YELLOW}  No process found on port 8080${NC}"
    fi

    # Also try to find python processes running run_server.py
    PYTHON_PIDS=$(pgrep -f "run_server.py" 2>/dev/null)
    if [ -n "$PYTHON_PIDS" ]; then
        echo "$PYTHON_PIDS" | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✓ Python server processes stopped${NC}"
    fi
fi

# Stop dashboard (port 3000)
if $STOP_DASHBOARD; then
    echo -e "${YELLOW}Stopping Dashboard (port 3000)...${NC}"

    # Find and kill processes on port 3000
    PIDS=$(lsof -ti:3000 2>/dev/null)
    if [ -n "$PIDS" ]; then
        echo "$PIDS" | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✓ Dashboard stopped${NC}"
    else
        echo -e "${YELLOW}  No process found on port 3000${NC}"
    fi

    # Also try to find node processes running vite
    NODE_PIDS=$(pgrep -f "vite" 2>/dev/null)
    if [ -n "$NODE_PIDS" ]; then
        echo "$NODE_PIDS" | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✓ Vite dev server processes stopped${NC}"
    fi
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Servers stopped!                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

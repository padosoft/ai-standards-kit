#!/bin/bash
#
# AI Enterprise - Start Servers
# Avvia il server Python Orchestrator e il Dashboard React
#
# Uso: ./start-servers.sh [--orchestrator-only] [--dashboard-only]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCHESTRATOR_DIR="$SCRIPT_DIR/packages/orchestrator"
DASHBOARD_DIR="$SCRIPT_DIR/packages/dashboard"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           AI Enterprise - Server Startup                      ║"
echo "║           Orchestrator + Dashboard                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Parse arguments
START_ORCHESTRATOR=true
START_DASHBOARD=true

for arg in "$@"; do
    case $arg in
        --orchestrator-only)
            START_DASHBOARD=false
            shift
            ;;
        --dashboard-only)
            START_ORCHESTRATOR=false
            shift
            ;;
        --help|-h)
            echo "Usage: ./start-servers.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --orchestrator-only    Start only the Python orchestrator server"
            echo "  --dashboard-only       Start only the React dashboard"
            echo "  --help, -h             Show this help message"
            echo ""
            echo "Servers:"
            echo "  Orchestrator API: http://localhost:8080"
            echo "  Dashboard:        http://localhost:3000"
            exit 0
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    if $START_ORCHESTRATOR; then
        if ! command -v python &> /dev/null; then
            echo -e "${RED}Error: Python is not installed${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Python found${NC}"

        # Check if venv exists
        if [ ! -d "$ORCHESTRATOR_DIR/.venv" ]; then
            echo -e "${YELLOW}Creating Python virtual environment...${NC}"
            cd "$ORCHESTRATOR_DIR"
            python -m venv .venv
        fi
    fi

    if $START_DASHBOARD; then
        if ! command -v node &> /dev/null; then
            echo -e "${RED}Error: Node.js is not installed${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓ Node.js found${NC}"

        # Check if node_modules exists
        if [ ! -d "$DASHBOARD_DIR/node_modules" ]; then
            echo -e "${YELLOW}Installing dashboard dependencies...${NC}"
            cd "$DASHBOARD_DIR"
            npm install
        fi
    fi

    echo ""
}

# Start orchestrator
start_orchestrator() {
    echo -e "${BLUE}Starting Python Orchestrator on port 8080...${NC}"
    cd "$ORCHESTRATOR_DIR"

    # Activate venv and start server
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    elif [ -f ".venv/Scripts/activate" ]; then
        source .venv/Scripts/activate
    fi

    # Install dependencies if needed
    pip install -e . -q 2>/dev/null || pip install -e .

    # Start server in background
    python run_server.py 8080 &
    ORCHESTRATOR_PID=$!
    echo -e "${GREEN}✓ Orchestrator started (PID: $ORCHESTRATOR_PID)${NC}"
    echo "  API: http://localhost:8080"
    echo "  Health: http://localhost:8080/api/health"
    echo ""
}

# Start dashboard
start_dashboard() {
    echo -e "${BLUE}Starting React Dashboard on port 3000...${NC}"
    cd "$DASHBOARD_DIR"

    # Start dashboard in background
    npm run dev &
    DASHBOARD_PID=$!
    echo -e "${GREEN}✓ Dashboard started (PID: $DASHBOARD_PID)${NC}"
    echo "  URL: http://localhost:3000"
    echo ""
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"

    if [ ! -z "$ORCHESTRATOR_PID" ]; then
        kill $ORCHESTRATOR_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Orchestrator stopped${NC}"
    fi

    if [ ! -z "$DASHBOARD_PID" ]; then
        kill $DASHBOARD_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Dashboard stopped${NC}"
    fi

    # Kill any remaining processes on ports
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true

    echo -e "${GREEN}Servers stopped successfully${NC}"
    exit 0
}

# Set trap for cleanup on exit
trap cleanup SIGINT SIGTERM

# Main execution
check_prerequisites

if $START_ORCHESTRATOR; then
    start_orchestrator
    sleep 2
fi

if $START_DASHBOARD; then
    start_dashboard
    sleep 2
fi

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    All servers running!                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for processes
wait

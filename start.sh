#!/bin/bash

# EZ Health - Быстрый запуск приложения
# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🏥 EZ Health - Health Tracking Telegram Mini App${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}📦 Установка зависимостей frontend...${NC}"
    cd frontend
    npm install
    cd ..
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${BLUE}📦 Установка зависимостей backend...${NC}"
    cd backend
    npm install
    cd ..
fi

echo ""
echo -e "${GREEN}✅ Зависимости установлены${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Запуск приложения...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}Frontend будет доступен на: http://localhost:3000${NC}"
echo -e "${GREEN}Backend API будет доступен на: http://localhost:3001${NC}"
echo ""
echo -e "${BLUE}Открывая 2 терминала...${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}[Backend]${NC} Запуск сервера..."
cd backend && npm start &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
echo -e "${BLUE}[Frontend]${NC} Запуск приложения..."
cd ../frontend && npm start &
FRONTEND_PID=$!

# Wait for processes
echo ""
echo -e "${GREEN}✅ Приложение запущено!${NC}"
echo ""
echo "Нажмите Ctrl+C чтобы остановить приложение"
echo ""

# Keep script running
wait

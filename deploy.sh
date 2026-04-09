#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🚀 Деплой Phonebook на порт 8989${NC}"
echo -e "${GREEN}🕐 Часовой пояс: Asia/Yekaterinburg${NC}"
echo -e "${GREEN}========================================${NC}"

# Останавливаем старые контейнеры
echo -e "${YELLOW}📦 Останавливаем старые контейнеры...${NC}"
docker-compose down

# Удаляем старые образы
echo -e "${YELLOW}🗑️ Удаляем старые образы...${NC}"
docker rmi phonebook-backend phonebook-frontend 2>/dev/null || true

# Собираем новые образы
echo -e "${YELLOW}🏗️ Собираем Docker образы...${NC}"
docker-compose build --no-cache

# Запускаем контейнеры
echo -e "${YELLOW}▶️ Запускаем контейнеры...${NC}"
docker-compose up -d

# Ждём запуска
echo -e "${YELLOW}⏳ Ждём запуска контейнеров...${NC}"
sleep 10

# Проверяем статус
echo -e "${GREEN}✅ Статус контейнеров:${NC}"
docker-compose ps

# Проверяем логи backend
echo -e "${GREEN}📋 Логи backend:${NC}"
docker-compose logs --tail=20 backend

# Проверяем доступность
echo -e "${GREEN}🌐 Проверяем доступность:${NC}"
curl -s http://localhost:8989/health || echo -e "${RED}❌ Frontend не отвечает${NC}"
curl -s http://localhost:8989/api/health || echo -e "${RED}❌ Backend не отвечает${NC}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Деплой завершён!${NC}"
echo -e "${GREEN}🌐 Приложение доступно по адресу: http://10.87.0.59:8989${NC}"
echo -e "${GREEN}========================================${NC}"
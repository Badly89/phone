# Этап 1: Сборка frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Копирование package.json и установка зависимостей
COPY package*.json ./
# Устанавливаем ВСЕ зависимости (включая devDependencies, т.к. нужен Vite)
RUN npm ci

# Копирование исходников и сборка
COPY . .
RUN npm run build

# Этап 2: Production сервер
FROM nginx:alpine

# Устанавливаем часовой пояс Екатеринбург
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Yekaterinburg /etc/localtime && \
    echo "Asia/Yekaterinburg" > /etc/timezone && \
    apk del tzdata

# Копирование собранного приложения (Vite собирает в dist, не в build!)
COPY --from=builder /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создание скрипта для замены переменных окружения
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-env.sh && \
    echo 'echo "🔧 Настройка переменных окружения..."' >> /docker-entrypoint.d/40-env.sh && \
    echo 'for file in /usr/share/nginx/html/assets/*.js; do' >> /docker-entrypoint.d/40-env.sh && \
    echo '    if [ -f "$file" ]; then' >> /docker-entrypoint.d/40-env.sh && \
    echo '        echo "  Processing: $file"' >> /docker-entrypoint.d/40-env.sh && \
    echo '        sed -i "s|VITE_API_URL_PLACEHOLDER|${VITE_API_URL:-http://10.87.0.59:8989/api}|g" $file' >> /docker-entrypoint.d/40-env.sh && \
    echo '    fi' >> /docker-entrypoint.d/40-env.sh && \
    echo 'done' >> /docker-entrypoint.d/40-env.sh && \
    echo 'echo "✅ Переменные окружения настроены"' >> /docker-entrypoint.d/40-env.sh && \
    chmod +x /docker-entrypoint.d/40-env.sh

# Проверяем конфигурацию nginx
RUN nginx -t

EXPOSE 8989

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8989/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
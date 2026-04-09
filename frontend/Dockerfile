FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем исходники и собираем
COPY . .
RUN npm run build

# Этап production с nginx
FROM nginx:alpine

# Устанавливаем часовой пояс Екатеринбург
RUN apk add --no-cache tzdata curl && \
    cp /usr/share/zoneinfo/Asia/Yekaterinburg /etc/localtime && \
    echo "Asia/Yekaterinburg" > /etc/timezone && \
    apk del tzdata

# Копируем собранные файлы
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем конфиг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Проверяем конфигурацию
RUN nginx -t

EXPOSE 8989

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8989/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
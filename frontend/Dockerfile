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
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Yekaterinburg /etc/localtime && \
    echo "Asia/Yekaterinburg" > /etc/timezone && \
    apk del tzdata

# Копируем собранные файлы
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем конфиг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8989

CMD ["nginx", "-g", "daemon off;"]
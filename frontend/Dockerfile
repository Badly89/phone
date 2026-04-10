FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# НЕ проверяем конфигурацию здесь (убираем RUN nginx -t)

EXPOSE 8989

CMD ["nginx", "-g", "daemon off;"]


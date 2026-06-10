FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Финальный образ — копируем файлы в volume при старте
FROM alpine:3.19

COPY --from=builder /app/build /build

CMD ["sh", "-c", "cp -r /build/. /app/frontend/"]
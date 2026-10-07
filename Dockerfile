FROM node:20-alpine

WORKDIR /app

# Зависимости ставятся из package.json / package-lock.json
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Код приложения: сервер, маршруты, шаблоны EJS, демо-данные, стили
COPY server.js ./
COPY routes ./routes
COPY views ./views
COPY data ./data
COPY public ./public

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]

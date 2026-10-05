FROM node:20-alpine

WORKDIR /app

# Зависимости ставятся из package.json
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]

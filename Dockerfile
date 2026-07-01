FROM node:22-bookworm-slim

# Puppeteer necesita un Chromium real para generar los PDF. En vez de dejar
# que descargue el suyo (pesado y con dependencias de sistema que no vienen
# en esta imagen), se usa el Chromium de Debian vía apt, que ya trae todo lo
# necesario para correr en modo headless.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

# Copiar solo los package.json primero para aprovechar la cache de capas de
# Docker: si el código cambia pero no las dependencias, npm ci no se repite.
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json

RUN npm ci

COPY . .

RUN npm run build -w server
RUN npm run build -w client

EXPOSE 4000

CMD ["node", "server/dist/index.js"]

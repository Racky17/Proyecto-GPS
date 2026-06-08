FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . ./

ENV NODE_ENV=production
ENV PORT=8064
EXPOSE 8064

CMD ["node", "server.js"]
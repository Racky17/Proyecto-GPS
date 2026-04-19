FROM node:lts-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 2200

CMD ["npm", "run", "start"]
FROM node:lts-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 4000

CMD ["node", "server.js"]
CMD ["npm", "run", "start"]
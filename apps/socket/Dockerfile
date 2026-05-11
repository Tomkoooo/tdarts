FROM node:20-alpine3.20
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js monitor-server.js ./
EXPOSE 8080/tcp
ENV NODE_ENV=production
CMD ["node", "server.js"]

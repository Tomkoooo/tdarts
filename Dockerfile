FROM node:20-alpine3.20
EXPOSE 3000/tcp
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache curl
COPY package.json ./
COPY package-lock.json ./
RUN npm install
ENV MONGODB_URI=mongodb://admin:admin@sironicsrv:27017/
COPY . .
RUN npm run build
HEALTHCHECK CMD curl -I --fail http://localhost:3000 || exit 1
ENTRYPOINT npm start
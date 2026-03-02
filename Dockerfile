FROM node:20-alpine3.20
EXPOSE 3000/tcp
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache curl
COPY package.json ./
COPY package-lock.json ./
RUN npm install --f
ENV MONGODB_URI=mongodb://admin:admin@sironicsrv:27017/
ENV OAC_STRIPE_SECRET_KEY=sk_test
ENV NEXT_PUBLIC_OAC_STRIPE_PUBLISHABLE_KEY=pk_test
ENV OAC_SZAMLAZZ_KEY=asd
COPY . .
RUN npm run build
HEALTHCHECK CMD curl -I --fail http://localhost:3000 || exit 1
ENTRYPOINT npm start
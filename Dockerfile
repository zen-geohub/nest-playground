# syntax=docker/dockerfile:1

# Dependencies
FROM node:22-alpine as deps

WORKDIR /app

COPY package*.json ./

RUN npm ci


# Build
FROM node:22-alpine as builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


# Production
FROM node:22-alpine as prod

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD [ "node", "dist/main.js" ]
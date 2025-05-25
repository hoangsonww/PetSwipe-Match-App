# backend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY . .
# Compile TypeScript
RUN npm run build

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
# Copy only production assets
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Copy migrations if any
COPY --from=builder /app/src/data-source ./src/data-source
EXPOSE 5001
CMD ["node", "dist/index.js"]

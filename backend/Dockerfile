# 1) Install deps
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 2) Build TS
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Runtime image
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5001

# Copy compiled output & deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
RUN chown -R node:node /app
USER node

EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 CMD wget -qO- http://127.0.0.1:5001/health >/dev/null 2>&1 || exit 1
CMD ["node", "dist/index.js"]

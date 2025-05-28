# 1) Install deps
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
RUN npm ci --legacy-peer-deps

# 2) Build the Next.js app
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Runtime image
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY next.config.ts ./

# Bring in node_modules & package.json
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000
CMD ["npm", "run", "start"]

# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /usr/src/app

# Copy package manifests and install production deps
COPY package.json package-lock.json ./
RUN npm ci --production

# Stage 2: Build the final image
FROM node:18-alpine
WORKDIR /usr/src/app

# Bring in installed modules
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy the CLI source (assumes bin/ and Makefile at the root)
COPY bin ./bin
COPY Makefile ./

# Link the CLI globally
RUN npm link /usr/src/app

# Set the entrypoint to your CLI
ENTRYPOINT ["petswipe"]
CMD ["--help"]

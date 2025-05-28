# Use Node.js 18 (alpine) so we have npm for the frontend build
FROM node:18-alpine

# Install bash, Python3 & pip, Docker CLI, and dependencies for AWS CLI v2
RUN apk add --no-cache \
      bash \
      python3 \
      py3-pip \
      docker-cli \
    && pip3 install --no-cache-dir awscli

# Set working dir
WORKDIR /aws

# Copy in your deploy script and make it executable
COPY deploy.sh .
RUN chmod +x deploy.sh

# (Optional) Copy everything if you want to mount less at runtime
# COPY backend ./backend
# COPY frontend ./frontend

# Default entrypoint runs the deploy script
ENTRYPOINT ["./deploy.sh"]

FROM node:20-alpine AS builder
WORKDIR /app

# Install production dependencies only (build context: backend/)
COPY package*.json ./
RUN npm install -g npm@11.14.1 && npm ci --omit=dev

# Copy source files
COPY . .

# Runtime image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .
EXPOSE 5001
CMD ["node", "index.js"]

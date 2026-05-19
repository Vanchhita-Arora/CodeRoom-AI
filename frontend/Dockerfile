FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (build context: frontend/)
COPY package*.json ./
RUN npm ci

# Copy source and build React app
COPY . .
ARG REACT_APP_BACKEND_URL=http://backend:5001
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN npm run build

# Serve the static build with Caddy (automatic HTTPS if exposed)
FROM caddy:2-alpine
WORKDIR /srv
COPY --from=builder /app/build .
EXPOSE 80

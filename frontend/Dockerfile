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

# Serve the static build with Nginx (flawless on Render and supports SPA routing)
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

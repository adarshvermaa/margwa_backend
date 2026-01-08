FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY services/notification-service/package.json ./services/notification-service/

# Install dependencies
RUN npm install

# Copy shared modules
COPY shared ./shared

# Copy notification service
COPY services/notification-service ./services/notification-service

# Build
WORKDIR /app/services/notification-service
RUN npm run build

EXPOSE 3006

CMD ["npm", "start"]

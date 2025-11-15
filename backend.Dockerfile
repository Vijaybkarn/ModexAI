FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./

RUN npm ci --only=production

COPY backend/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]

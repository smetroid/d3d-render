FROM node:22-slim AS build

WORKDIR /app
COPY package*.json ./
ENV HUSKY=0
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts

COPY . .

FROM node:22-slim

WORKDIR /app
COPY --from=build /app /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/server.js"]

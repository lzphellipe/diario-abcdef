FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --no-audit --no-fund
COPY src ./src
COPY scripts ./scripts
COPY model ./model
RUN mkdir -p data && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]

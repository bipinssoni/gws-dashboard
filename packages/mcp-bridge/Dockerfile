FROM node:20-slim

# Install gws CLI
RUN npm install -g @googleworkspace/cli tsx

WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY src/ ./src/
COPY tsconfig.json ./

EXPOSE 3100
CMD ["tsx", "src/index.ts"]

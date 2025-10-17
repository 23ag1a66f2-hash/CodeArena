FROM node:18-bullseye

# Install toolchains
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    openjdk-17-jdk-headless \
    gcc g++ \
    bash curl ca-certificates time \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App code
COPY server.js ./

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

CMD ["node", "server.js"] 
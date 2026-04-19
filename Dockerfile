FROM node:18-slim

# 1. Install system dependencies (Chromium and Python for FlareSolverr source)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    python3 \
    python3-pip \
    python3-venv \
    chromium \
    chromium-driver \
    xvfb \
    xauth \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Setup FlareSolverr from source (the most stable way for ARM64)
RUN git clone https://github.com/FlareSolverr/FlareSolverr.git /app/flaresolverr-src && \
    cd /app/flaresolverr-src && \
    pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# 3. Environment Settings
ENV NODE_ENV=production
ENV IN_DOCKER=true
ENV DISPLAY=:99
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver

# 4. Copy Node.js files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy the rest of the application
COPY . .

EXPOSE 7000

# Start Xvfb and then the addon
CMD Xvfb :99 -screen 0 1024x768x16 & node stremio_addon.js

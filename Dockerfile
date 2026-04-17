FROM node:18-slim

# Install system dependencies: git, python, uv and browser libs
RUN apt-get update && apt-get install -y \
    ca-certificates \
    git \
    python3 \
    python3-pip \
    curl \
    # Playwright/Browsers dependencies
    libgbm-dev \
    libnss3 \
    libasound2 \
    libxshmfence1 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrender1 \
    libxtst6 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libstdc++6 \
    libx11-6 \
    libxcb1 \
    libxrandr2 \
    && curl -LsSf https://astral.sh/uv/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

# Add uv to PATH
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# Enable productions optimizations
ENV NODE_ENV=production
ENV IN_DOCKER=true

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy the rest of the application
COPY . .

EXPOSE 7000

# Start the addon directly
CMD ["node", "stremio_addon.js"]

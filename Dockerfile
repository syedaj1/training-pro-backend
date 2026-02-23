FROM node:18-alpine

WORKDIR /app

# Install system deps
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy rest of source
COPY . .

# BUILD TYPESCRIPT (ye missing tha)
RUN npm run build

# Create folders
RUN mkdir -p data uploads

EXPOSE 3001

CMD ["node", "dist/index.js"]

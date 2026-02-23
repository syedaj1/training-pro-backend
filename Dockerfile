FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p data uploads

EXPOSE 3001

CMD ["npx", "ts-node", "src/index.ts"]

FROM node:22-trixie-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 80
EXPOSE 6061

CMD ["npm", "start"]
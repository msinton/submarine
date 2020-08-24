FROM node:12.18.3-alpine3.12

WORKDIR /usr/app
COPY package*.json ./
COPY tsconfig.json ./
COPY packages ./packages
RUN npm install
RUN npm run build
EXPOSE 3001
CMD [ "npm", "start" ]

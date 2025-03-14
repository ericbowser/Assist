# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=20.17.0

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV=production

WORKDIR /app
COPY package*.json ./app/

ENV NODE_ENV production

COPY . .
RUN npm install
RUN npm install dotenv -g
RUN npm install nodemon -g
RUN npx dotenv-vault@latest pull

EXPOSE 32636

# Run the application.
CMD npm run dev

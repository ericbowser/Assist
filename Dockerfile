# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=20.17.0

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV=production

WORKDIR /app
COPY package*.json ./

ENV NODE_ENV production

RUN npm install
RUN npm install dotenv 
#RUN npm install nodemon -g
COPY . .

#RUN npx dotenv-vault@latest new
RUN npx dotenv-vault@latest pull

EXPOSE 32636

# Run the application.
CMD npm run dev

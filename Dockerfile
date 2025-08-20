# syntax=docker/dockerfile:1

# Use the official Node.js image as the base image
ARG NODE_VERSION=22.14.0
FROM node:${NODE_VERSION}-slim AS base

# Set the working directory
WORKDIR /

# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install dependencies using npm ci for a clean and deterministic install
RUN --mount=type=cache,target=/root/.npm npm ci --production

# Copy the application source code
COPY . .
RUN npm install nodemon -g

# Expose the application port
EXPOSE 32636

# Set the environment variable for production
ENV NODE_ENV=production

# Define the command to run the application
CMD ["npm", "run", "dev"]
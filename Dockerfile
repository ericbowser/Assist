# Use a base image
FROM node:alpine

# Set working directory
WORKDIR .

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy the rest of your application code
COPY . .
EXPOSE 32636

# Start the app
CMD ["node", "index.js"]


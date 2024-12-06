# Use Node.js LTS image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Increase memory limit
ENV NODE_OPTIONS=--max_old_space_size=4096

# Install global dependencies
RUN npm install -g npm@latest

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application with verbose output and debugging
RUN npm run build || (echo "Build failed. Showing .next directory contents:" && ls -la .next && cat .next/build-manifest.json)

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]

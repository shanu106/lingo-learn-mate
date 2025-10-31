FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

# Set environment variables for build
ENV VITE_SUPABASE_URL="https://aqusqqxxbtabnjulzqvg.supabase.co"
ENV VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdXNxcXh4YnRhYm5qdWx6cXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1ODksImV4cCI6MjA3NzI0ODU4OX0.hgOViNIqGB8LZqacAgh_29ktSdGEWuZv9RDrUfpVCjA"
ENV VITE_SUPABASE_PROJECT_ID="aqusqqxxbtabnjulzqvg"

# Build the app
RUN npm run build

# Remove dev dependencies and install only production dependencies
RUN npm ci --only=production

# Expose port (Cloud Run will set PORT env variable)
EXPOSE 8080

# Start the Express server
CMD ["node", "server.js"]

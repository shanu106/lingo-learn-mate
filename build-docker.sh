#!/bin/bash

# Load environment variables
export VITE_SUPABASE_URL="https://aqusqqxxbtabnjulzqvg.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdXNxcXh4YnRhYm5qdWx6cXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1ODksImV4cCI6MjA3NzI0ODU4OX0.hgOViNIqGB8LZqacAgh_29ktSdGEWuZv9RDrUfpVCjA"
export VITE_SUPABASE_PROJECT_ID="aqusqqxxbtabnjulzqvg"

# Build Docker image
docker build \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
  --build-arg VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
  -t learning-app:latest .

echo "Docker image built successfully!"
echo "Run with: docker run -d -p 8080:80 learning-app:latest"

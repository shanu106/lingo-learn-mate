# Docker Deployment Guide

This guide covers Docker commands for local development and production deployment of the Vidhya learning app.

## Prerequisites

- Docker installed on your machine
- Docker account (for pushing to registry)
- Google Cloud account (for Cloud Run deployment)

## Environment Variables

The application requires these environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

These are included in the build script for your convenience.

---

## Local Development

### 1. Build Docker Image Locally

```bash
# Make the build script executable
chmod +x build-docker.sh

# Build the image using the script (includes all env variables)
./build-docker.sh
```

Or build manually:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL="https://aqusqqxxbtabnjulzqvg.supabase.co" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdXNxcXh4YnRhYm5qdWx6cXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzI1ODksImV4cCI6MjA3NzI0ODU4OX0.hgOViNIqGB8LZqacAgh_29ktSdGEWuZv9RDrUfpVCjA" \
  --build-arg VITE_SUPABASE_PROJECT_ID="aqusqqxxbtabnjulzqvg" \
  -t learning-app:latest .
```

### 2. Run Container Locally

```bash
# Run the container
docker run -d -p 8080:8080 --name vidhya-app learning-app:latest

# Access the app at: http://localhost:8080
```

### 3. Check Container Status

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Check container logs
docker logs vidhya-app

# Follow logs in real-time
docker logs -f vidhya-app
```

### 4. Test Health Endpoint

```bash
# Check if server is healthy
curl http://localhost:8080/health
```

### 5. Stop and Clean Up

```bash
# Stop the container
docker stop vidhya-app

# Remove the container
docker rm vidhya-app

# Remove the image
docker rmi learning-app:latest

# Complete cleanup (remove all stopped containers and unused images)
docker system prune -a
```

---

## Production Deployment

### Option 1: Deploy to Google Cloud Run

#### Step 1: Install Google Cloud SDK

```bash
# Install gcloud CLI (if not already installed)
# Visit: https://cloud.google.com/sdk/docs/install
```

#### Step 2: Authenticate and Configure

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

#### Step 3: Build and Push to Google Container Registry

```bash
# Tag the image for Google Container Registry
docker tag learning-app:latest gcr.io/YOUR_PROJECT_ID/vidhya-app:latest

# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker

# Push the image to GCR
docker push gcr.io/YOUR_PROJECT_ID/vidhya-app:latest
```

#### Step 4: Deploy to Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy vidhya-app \
  --image gcr.io/YOUR_PROJECT_ID/vidhya-app:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10

# Your app will be deployed and you'll receive a URL like:
# https://vidhya-app-xxxxx-uc.a.run.app
```

#### Update Deployment

```bash
# Rebuild and push new image
./build-docker.sh
docker tag learning-app:latest gcr.io/YOUR_PROJECT_ID/vidhya-app:latest
docker push gcr.io/YOUR_PROJECT_ID/vidhya-app:latest

# Deploy updated version
gcloud run deploy vidhya-app \
  --image gcr.io/YOUR_PROJECT_ID/vidhya-app:latest \
  --platform managed \
  --region us-central1
```

### Option 2: Deploy to Docker Hub + Any Cloud Provider

#### Step 1: Push to Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag the image
docker tag learning-app:latest YOUR_DOCKERHUB_USERNAME/vidhya-app:latest

# Push to Docker Hub
docker push YOUR_DOCKERHUB_USERNAME/vidhya-app:latest
```

#### Step 2: Pull and Run on Server

```bash
# On your server, pull the image
docker pull YOUR_DOCKERHUB_USERNAME/vidhya-app:latest

# Run the container
docker run -d -p 80:8080 --name vidhya-app \
  --restart unless-stopped \
  YOUR_DOCKERHUB_USERNAME/vidhya-app:latest
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker logs vidhya-app

# Inspect container
docker inspect vidhya-app

# Check if port is already in use
lsof -i :8080
```

### Build Fails

```bash
# Clean Docker cache and rebuild
docker builder prune
./build-docker.sh
```

### App Not Accessible

```bash
# Verify container is running
docker ps

# Check port mapping
docker port vidhya-app

# Test from inside container
docker exec -it vidhya-app sh
curl localhost:8080/health
```

### Cloud Run Deployment Issues

```bash
# View Cloud Run logs
gcloud run logs read vidhya-app --region us-central1

# Check service status
gcloud run services describe vidhya-app --region us-central1
```

---

## Useful Commands

### Container Management

```bash
# Start a stopped container
docker start vidhya-app

# Restart container
docker restart vidhya-app

# Execute command in running container
docker exec -it vidhya-app sh

# Copy files from container
docker cp vidhya-app:/app/dist ./local-dist
```

### Image Management

```bash
# List all images
docker images

# Remove specific image
docker rmi learning-app:latest

# Remove unused images
docker image prune -a
```

### Resource Monitoring

```bash
# View resource usage
docker stats vidhya-app

# View container processes
docker top vidhya-app
```

---

## CI/CD Integration (GitHub Actions Example)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          service_account_key: ${{ secrets.GCP_SA_KEY }}
      
      - name: Build and Push
        run: |
          docker build \
            --build-arg VITE_SUPABASE_URL="${{ secrets.VITE_SUPABASE_URL }}" \
            --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}" \
            --build-arg VITE_SUPABASE_PROJECT_ID="${{ secrets.VITE_SUPABASE_PROJECT_ID }}" \
            -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/vidhya-app:${{ github.sha }} .
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/vidhya-app:${{ github.sha }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy vidhya-app \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/vidhya-app:${{ github.sha }} \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated
```

---

## Team - AI Alliance

Made with ❤️ by:
- **Shahnawaj Rangrej** - Project Leader
- **Mohammad Shadab Khan** - ML workflows
- **Aqsa Mansuri** - Backend Developer
- **Shagufta Behlim** - Frontend Developer

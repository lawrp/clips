
#Building with alpine
FROM node:20-alpine AS build

# Setting work directory
WORKDIR /app

# Copy the package file over
COPY package*.json ./

# Install the dependencies
RUN npm ci

# Copy source code over
COPY . .

# Build for prod
RUN npm run build -- --configuration production

#Serve with NGINX
FROM nginx:alpine

# Copy built app from build stage
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposing port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
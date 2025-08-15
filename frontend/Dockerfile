# Use node:lts as the base image
FROM docker.io/node:lts-alpine AS build

# Install development dependencies
RUN apk update
RUN apk add --no-cache git openssh

# Set the environment variables for vite
ARG VITE_QUERY_URL="/api/"

# Copy the frontend code into the container
COPY . /app
WORKDIR /app

# Install the dependencies
RUN set -ex; \
      yarn install --frozen-lockfile; \
      yarn cache clean; \
      yarn build

# Use nginx:stable as the base image
FROM docker.io/nginx:stable-alpine
# Copy the build files from the build stage to the nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html
# Copy the custom nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf
# Expose port 8080
EXPOSE 8080
# Start nginx
CMD ["nginx", "-g", "daemon off;"]

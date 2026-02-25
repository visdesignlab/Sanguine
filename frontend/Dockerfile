# Build the frontend assets
FROM docker.io/node:lts-alpine AS build

WORKDIR /app

# Set the environment variables for vite
ARG VITE_VERSION="development"
ENV VITE_VERSION=${VITE_VERSION}

# Copy only dependency files first for better caching
COPY package.json yarn.lock ./

# Install the dependencies (cached unless these files change)
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy the rest of the frontend code
COPY . .

# Build the app
RUN yarn run build


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

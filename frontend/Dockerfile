# Use node:lts as the base image
FROM node:lts AS build
# Set the working directory
WORKDIR /app
# Copy the frontend directory to the working directory
COPY . /app
# Set the environment variables for vite
ARG VITE_QUERY_URL
ARG VITE_REQUIRE_LOGIN
# Install the dependencies
RUN yarn install
# Build the application
RUN yarn build

# Use nginx:stable as the base image
FROM nginx:stable-alpine-slim
# Copy the build files from the build stage to the nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html
# Copy the custom nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf
# Expose port 8080
EXPOSE 8080
# Start nginx
CMD ["nginx", "-g", "daemon off;"]

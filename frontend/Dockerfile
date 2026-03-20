# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Runtime stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copia como template para que envsubst substitua ${PORT} em runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf.template
ENV PORT=80
EXPOSE 80
# Railway injeta PORT dinamicamente; envsubst substitui ${PORT} antes de iniciar o nginx
CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

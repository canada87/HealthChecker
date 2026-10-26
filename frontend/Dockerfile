FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps
COPY . .
# Shown in Settings so you can tell which release is running (passed by the publish workflow)
ARG APP_VERSION=dev
ARG APP_COMMIT=
ENV VITE_APP_VERSION=$APP_VERSION VITE_APP_COMMIT=$APP_COMMIT
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

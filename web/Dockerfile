FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_GOOGLE_SCRIPT_URL
ENV VITE_GOOGLE_SCRIPT_URL=$VITE_GOOGLE_SCRIPT_URL
ARG VITE_WAQI_MAP_KEY
ENV VITE_WAQI_MAP_KEY=$VITE_WAQI_MAP_KEY
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

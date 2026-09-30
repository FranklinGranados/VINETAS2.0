# ─── Etapa 1: compilar la app React ───────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Vite "hornea" las variables VITE_* dentro del JS al compilar. "/api" es
# una ruta relativa: el navegador llama a la misma dirección donde abrió la
# app, y nginx reenvía /api al backend (ver nginx.conf).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─── Etapa 2: servir con nginx ────────────────────────────────────────────
# El resultado de `vite build` son archivos estáticos (HTML, JS, CSS):
# no necesitan Node para ejecutarse, alcanza con un servidor web.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

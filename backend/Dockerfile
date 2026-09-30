# ─── Etapa 1: compilar ────────────────────────────────────────────────────
# Imagen con TODAS las dependencias (incluidas las de desarrollo: TypeScript,
# Nest CLI, Prisma CLI), necesarias solo para construir.
FROM node:22-slim AS build
WORKDIR /app

# Primero solo package*.json: Docker cachea esta capa, y mientras las
# dependencias no cambien, `npm ci` no se vuelve a ejecutar en cada build.
COPY package*.json ./
RUN npm ci

COPY . .
# prisma generate: crea el cliente de Prisma a partir de prisma/schema.prisma
# build: compila TypeScript → dist/ (main queda en dist/src/main.js)
# prune:  borra las dependencias de desarrollo, ya no hacen falta
RUN npx prisma generate \
 && npm run build \
 && npm prune --omit=dev

# ─── Etapa 2: ejecutar ────────────────────────────────────────────────────
# Imagen final liviana: solo el código compilado y las dependencias de
# producción. Nada del código fuente ni de las herramientas de compilación.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000
# No correr como root dentro del contenedor (buena práctica de seguridad):
# la imagen oficial de Node ya trae el usuario "node".
USER node
CMD ["node", "dist/src/main"]

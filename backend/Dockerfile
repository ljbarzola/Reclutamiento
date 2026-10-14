FROM node:20-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# La imagen final no necesita las dependencias de desarrollo.
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./
# La app crea dist/uploads al arrancar (archivos temporales de las postulaciones);
# se deja lista y con dueño "node" para poder correr sin ser root.
RUN mkdir -p dist/uploads && chown -R node:node dist/uploads
USER node
EXPOSE 8080
CMD ["node", "dist/main"]

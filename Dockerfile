# Single container: Express API + built PWA served from the same origin.
# ffmpeg-static ships glibc-compatible native binaries; Alpine's musl runtime
# cannot run them reliably, so use Debian slim for video-frame extraction.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace=apps/server && npm cache clean --force
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/web/dist apps/web/dist
COPY prompts prompts
COPY data data
EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]

# Fly.io Dockerfile — WebSocket server only. Next.js ships via Vercel.
FROM node:20-alpine

WORKDIR /app

RUN corepack enable

# Install deps (tsx is in dependencies so --prod would work too,
# but we include everything so @types are available at runtime parse)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Only the server + files it transitively needs
COPY tsconfig.json ./
COPY server ./server
COPY src/lib ./src/lib
COPY src/types ./src/types

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["pnpm", "exec", "tsx", "server/index.ts"]

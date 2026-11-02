FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --workspace @tpservicos/api --include-workspace-root=false
COPY apps/api apps/api
ENV DATABASE_URL=postgresql://tpservicos:build-only@localhost:5432/tpservicos?schema=public
RUN npm run db:generate --workspace @tpservicos/api
RUN npm run build --workspace @tpservicos/api

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev --legacy-peer-deps --workspace @tpservicos/api --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist
EXPOSE 3100
CMD ["npm", "run", "start", "--workspace", "@tpservicos/api"]

FROM node:18-alpine AS builder

WORKDIR /app

ARG APP_ENV=production
ARG PNPM_VERSION=10.33.0

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm@${PNPM_VERSION}
RUN pnpm install --frozen-lockfile

COPY . .

ENV APP_ENV=${APP_ENV}
ENV mode=${APP_ENV}

RUN if [ "$APP_ENV" = "uat" ]; then \
      pnpm run build:uat; \
    elif [ "$APP_ENV" = "production" ]; then \
      pnpm run build:prod; \
    else \
      echo "Unsupported APP_ENV=$APP_ENV" >&2; \
      exit 1; \
    fi
RUN pnpm prune --prod

FROM node:18-alpine AS runner

WORKDIR /app

ARG APP_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY docusaurus.config.ts .env.production .env.uat ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

ENV APP_ENV=${APP_ENV}
ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "mode=$APP_ENV ./node_modules/.bin/docusaurus serve --host 0.0.0.0 --port 3000"]

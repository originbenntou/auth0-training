FROM node:18.16.0-alpine AS build

WORKDIR /srv

RUN apk update --no-cache && \
    npm i -g pnpm

COPY package.json pnpm-lock.yaml .npmrc ./
COPY nuxt.config.ts tailwind.config.js postcss.config.js tsconfig.json ./
COPY .eslintrc .prettierrc ./
COPY src ./src

RUN pnpm i && \
    pnpm build


FROM node:18.16.0-alpine
COPY --from=build /srv/.output /srv/

EXPOSE 3000

ENTRYPOINT [ "node", "/srv/server/index.mjs" ]
# Meta Earth Docs

The Meta Earth documentation site is built with [Docusaurus](https://docusaurus.io/) and uses `pnpm` as its package manager.

## Requirements

- Node.js `18+`
- `pnpm 10.33.0` installed manually

## Install Dependencies

```bash
pnpm install
```

## Local Development

```bash
pnpm start
```

The development server starts on port `3001` by default.

## Production Build

```bash
pnpm run build:prod
```

The build output is generated in the `build` directory.

## UAT Build

```bash
pnpm run build:uat
```

This command reads `.env.uat` and generates the `build` output for the UAT environment.

## Preview the Production Build Locally

```bash
pnpm run serve:prod --host 0.0.0.0 --port 3000
```

This command reads `.env.production` and serves the static output with Docusaurus' built-in `serve` command.

## Preview the UAT Build Locally

```bash
pnpm run serve:uat --host 0.0.0.0 --port 3000
```

This command reads `.env.uat` and serves the static output with Docusaurus' built-in `serve` command.

## Docker Deployment

The `APP_ENV` build argument in the current [Dockerfile](Dockerfile) defaults to `production`.
If you do not explicitly pass `--build-arg APP_ENV=...` when building the image, the production configuration is used.

During the Docker build stage, the following commands are executed:

```bash
pnpm install
pnpm run build:prod
```

At runtime, the container starts Docusaurus with the local project binary:

```bash
./node_modules/.bin/docusaurus serve --host 0.0.0.0 --port 3000
```

The environment file used by the container is determined by `APP_ENV`:

- `APP_ENV=production` -> `.env.production`
- `APP_ENV=uat` -> `.env.uat`

If `docker run` does not explicitly pass `-e APP_ENV=...`,
the container inherits the `APP_ENV` value baked into the image, which is the value used at build time.

It is recommended to keep the build environment and runtime environment aligned rather than mixing them.

### Production

Build the production image:

```bash
docker build -t me-docs:prod --build-arg APP_ENV=production .
```

Start the production container:

```bash
docker rm -f me-docs-prod
docker run -d --name me-docs-prod -e APP_ENV=production -p 3000:3000 me-docs:prod
```

View the production container logs:

```bash
docker logs -f me-docs-prod
```

### UAT

Build the UAT image:

```bash
docker build -t me-docs:uat --build-arg APP_ENV=uat .
```

Start the UAT container:

```bash
docker rm -f me-docs-uat
docker run -d --name me-docs-uat -e APP_ENV=uat -p 3001:3000 me-docs:uat
```

View the UAT container logs:

```bash
docker logs -f me-docs-uat
```

### Common Operations Commands

Stop the containers:

```bash
docker stop me-docs-prod
docker stop me-docs-uat
```

Remove the containers:

```bash
docker rm -f me-docs-prod
docker rm -f me-docs-uat
```

Check container status:

```bash
docker ps --filter "name=me-docs"
```

## Production Environment Variables

The Docker image uses `.env.production` from the repository by default.

Current key settings:

```env
gitPath=https://github.com/openmetaearth/me-docs
siteUrl=https://docs.mec.me
```

## UAT Environment Variables

Running `build:uat` or `serve:uat` locally reads `.env.uat`.

If `APP_ENV=uat` is passed during Docker build or runtime, `.env.uat` is also used.

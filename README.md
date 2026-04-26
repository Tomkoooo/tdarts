# CC BY-NC-SA 4.0 License

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International**

### You are free to:

- **Share** — copy and redistribute the material in any medium or format  
- **Adapt** — remix, transform, and build upon the material

### Under the following terms:

- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
- **NonCommercial** — You may not use the material for commercial purposes.
- **ShareAlike** — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

### No additional restrictions

You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.

### Notices:

- You do not have to comply with the license for elements of the material in the public domain or where your use is permitted by an applicable exception or limitation.
- No warranties are given. The license may not give you all of the permissions necessary for your intended use. For example, other rights such as publicity, privacy, or moral rights may limit how you use the material.

### Official full text:
- English: https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode  
- Human-readable summary: https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en

### Short identifiers:
- **BY** — Attribution  
- **NC** — NonCommercial  
- **SA** — ShareAlike

**Important note**:  
This is **not** an approved Open Source license according to the Open Source Initiative (OSI), because it prohibits commercial use.

---

## Monorepo (Turborepo + pnpm)

This repository is a [Turborepo](https://turbo.build/) monorepo using [pnpm workspaces](https://pnpm.io/workspaces).

### Layout

- `apps/web` — Next.js 16 application (production Docker image builds from here via root `Dockerfile`)
- `apps/api` — standalone tRPC API server (`@tdarts/api`; Docker: root `Dockerfile.api`; docs: [OpenAPI](docs/api/openapi.md), [Portainer / GHCR](docs/api/portainer-ghcr.md))
- `packages/core`, `packages/services`, `packages/schemas`, `packages/ui` — shared libraries consumed by web and API

### Commands (from repository root)

| Command | Description |
|--------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev:web` | Start Next.js dev server (`turbo dev --filter=web`) |
| `pnpm build:web` | Production build for the web app only |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` / `pnpm test` | Run via Turborepo across workspaces |

### Environment files

Keep `.env` / `.env.local` at the **repository root** (next to `apps/`). `apps/web/next.config.ts` loads them automatically for local builds.

**Live Socket.IO (tournament / match streaming):** `pnpm dev` for the web app sets `NEXT_PUBLIC_ENABLE_SOCKET=true` in [`apps/web/package.json`](apps/web/package.json). Production images and hosts must define **`NEXT_PUBLIC_ENABLE_SOCKET=true`** (and rebuild) or the client will not open a socket; optionally set **`NEXT_PUBLIC_SOCKET_SERVER_URL`** if the default in [`apps/web/src/lib/socket.ts`](apps/web/src/lib/socket.ts) is wrong for your deployment.

### Docker / CI

- **Web**: `.github/workflows/ci.yml` builds the root `Dockerfile` (Next.js `standalone`; entry `node apps/web/server.js`). Pushes to `main` / `new_ui` only run when relevant paths change (see workflow `paths:`). **Portainer / GHCR:** [docs/api/portainer-ghcr.md](docs/api/portainer-ghcr.md).
- **API**: `.github/workflows/docker-api.yml` builds `Dockerfile.api` and pushes to `ghcr.io/<owner>/tdarts-api` (not the same image as the web app).
- **Regression**: `.github/workflows/web-regression.yml` — on `to_release`, lint + tests + QA coverage + API tests (no `next build`); on `main` / `feature/api` and PRs to `main`, includes `next build`. Lint failures fail the job.
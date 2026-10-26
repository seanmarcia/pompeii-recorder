# pompeii-recorder

Rails backend (`backend/`) + React/Vite field app (`frontend/`), deployed as a
single Kamal container. See `backend/README.md` and `frontend/README.md` for
app specifics, and `backend/config/deploy.yml` for deployment.

## Toolchain

This project uses [mise](https://mise.jdx.dev/) to manage Ruby and Node
versions — install it before running anything locally.

- Ruby and Node versions live in `backend/.ruby-version` and
  `frontend/.node-version`; the `mise.toml` file in each directory enables
  mise reading them (idiomatic version files are off by default).
- With mise installed, plain `ruby`, `node`, `npm`, and `bundle` resolve
  correctly per directory via its shims (system Ruby is too old and fails).

```bash
# backend
cd backend && mise exec -- bin/rails server -p 3000

# frontend
cd frontend && npm run dev   # Vite dev server
```
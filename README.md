<div align="center">

# d3d-render

**Headless SVG/PNG renderer for [d3dweb](https://github.com/smetroid/d3dweb) diagrams.**

[![Node](https://img.shields.io/badge/node-22%2B-3fb950?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/fastify-5-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://fastify.dev/)
[![License](https://img.shields.io/badge/license-MIT-a78bfa?style=for-the-badge)](LICENSE)

</div>

---

## What it does

Turns a d3dweb diagram (referenced by public ID or encoded inline) into a static SVG or PNG suitable for embedding in a README, wiki, or any markdown surface.

```markdown
![architecture](https://d3d-render.fly.dev/svg?id=abc123)
![portable](https://d3d-render.fly.dev/svg?src=eJxlk...)
```

Clicking the rendered image opens the diagram in a live d3dweb editor.

## Endpoints (planned)

| Method | Path                                  | Description                                    |
| ------ | ------------------------------------- | ---------------------------------------------- |
| `GET`  | `/svg?src=<encoded>&layout=…&theme=…` | Render inline diagram to SVG                   |
| `GET`  | `/svg?id=<pubId>&layout=…&theme=…`    | Fetch public diagram from `d3d-api` and render |
| `GET`  | `/png?…`                              | SVG → PNG via resvg-js                         |
| `GET`  | `/health`                             | Liveness probe                                 |

## Architecture

- **Runtime**: Node 22 + Fastify.
- **Layout**: `cytoscape` under `jsdom` with `cytoscape-svg` (Puppeteer fallback for layouts the SVG exporter mangles).
- **Encoding**: `@d3dweb/embed` (shared with the d3dweb SPA) for pako-deflate + base64url.
- **Cache**: content-addressed on disk, keyed on `hash(input + layout + theme + renderer-version)`.
- **Guards**: rate limits + max input size to keep the service cheap on Fly.io.

## Development

```bash
npm install
npm run dev     # Fastify with hot reload
npm run test    # Vitest
npm run lint    # ESLint (auto-fix)
npm run format  # Prettier
```

## Deployment

CI runs lint + tests on every push. Fly.io deploys are gated on CI passing.
`release-please` cuts semver releases from Conventional Commits.

## Contributing

PRs welcome. Uses [Conventional Commits](https://www.conventionalcommits.org/) — release-please depends on them.

## Related

- [d3dweb](https://github.com/smetroid/d3dweb) — the editor
- [d3d-api](https://github.com/smetroid/d3d-api) — the backend
- Tracking: [d3dweb GitHub embed + agent data (Project #4)](https://github.com/users/smetroid/projects/4)

## License

MIT

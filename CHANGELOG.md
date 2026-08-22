# Changelog

## [0.3.1](https://github.com/smetroid/d3d-render/compare/d3d-render-v0.3.0...d3d-render-v0.3.1) (2026-08-22)


### Bug Fixes

* **png:** bundle Noto Sans font for resvg text rendering ([b762327](https://github.com/smetroid/d3d-render/commit/b762327ab161422ea51d9efc93541942e71cfa30))
* **png:** bundle Noto Sans font for resvg text rendering ([db1bb5a](https://github.com/smetroid/d3d-render/commit/db1bb5ac1ea60704ac75ed8b3c8f6c8c28d14be7))

## [0.3.0](https://github.com/smetroid/d3d-render/compare/d3d-render-v0.2.1...d3d-render-v0.3.0) (2026-08-22)


### Features

* add HEAD method support to withGuards middleware ([90f7348](https://github.com/smetroid/d3d-render/commit/90f7348a4b912f84c99f4842c61d93b05dbeca25))
* add HEAD method support to withGuards middleware ([33b20cc](https://github.com/smetroid/d3d-render/commit/33b20cc84cb7f2e2aa7be7b957dcd1a2e5c4d4df))
* add X-Embed-Revision and X-Rendered-At response headers ([fb8febf](https://github.com/smetroid/d3d-render/commit/fb8febfc8477a29638d9479980ddac5974a9ab35))
* add X-Embed-Revision and X-Rendered-At response headers ([c0074d0](https://github.com/smetroid/d3d-render/commit/c0074d065e41abce179c25660b97cdc480b1f2be))


### Bug Fixes

* **cache:** use 24h max-age with swr instead of immutable to allow re-fetch after fixes ([2bd9a50](https://github.com/smetroid/d3d-render/commit/2bd9a50c1c76fe3ce8634dca6581eac121d82ba6))
* use must-revalidate cache for live ?id= embeds ([5186bd8](https://github.com/smetroid/d3d-render/commit/5186bd85f5a1662e5c5d633ef28c79c7c1be9668))
* use must-revalidate for ?id= embeds, immutable cache for ?src= ([1de4943](https://github.com/smetroid/d3d-render/commit/1de494381aa332b79af7ddbb1210cdb1b3fcb463))

## [0.2.1](https://github.com/smetroid/d3d-render/compare/d3d-render-v0.2.0...d3d-render-v0.2.1) (2026-08-19)


### Bug Fixes

* **cache:** bump renderer version to invalidate cached bad svgs ([bc3e207](https://github.com/smetroid/d3d-render/commit/bc3e2074a927a02640051352c8b7c5fd3c7ed669))
* **render:** use nodes boundingBox to avoid bogus edge extents in headless mode ([74a7042](https://github.com/smetroid/d3d-render/commit/74a7042bcdda9b4d4032b56cbc8e316aea87c690))
* **svg:** remove xlink anchor wrapper, github sanitizer strips it causing black box ([9b9b219](https://github.com/smetroid/d3d-render/commit/9b9b21993ff3d130898f454a7bfe701ef48784e7))

## [0.2.0](https://github.com/smetroid/d3d-render/compare/d3d-render-v0.1.0...d3d-render-v0.2.0) (2026-08-19)


### Features

* **guards:** per-ip rate limit, non-get rejection, render timeout, request logging ([3de5198](https://github.com/smetroid/d3d-render/commit/3de51989f7bb69b5951fdec9123230ef99e05ae4))
* initial scaffold ([5ee86d6](https://github.com/smetroid/d3d-render/commit/5ee86d62eba5e895a957ad519cfd1834411ded31))
* **render:** add cola layout support (headless, no puppeteer needed) ([e212678](https://github.com/smetroid/d3d-render/commit/e21267800a20f95024ea4f6dc1bfb20e7b486f50))
* **render:** core SVG render pipeline + rate limiting ([167b3a3](https://github.com/smetroid/d3d-render/commit/167b3a3f37878128577e96a300b24ab3b3e7877f))
* **render:** png endpoint + content-addressed cache + /metrics ([110615c](https://github.com/smetroid/d3d-render/commit/110615c7a920612274d793e9f027c8bf1aee3b45))
* **vercel:** migrate from Fly.io/Fastify to Vercel serverless functions ([cd941d4](https://github.com/smetroid/d3d-render/commit/cd941d4076d53e437254a0c1e25badbe7f7436ab))


### Bug Fixes

* **deploy:** use dfw region + skip husky in prod install ([3db7d96](https://github.com/smetroid/d3d-render/commit/3db7d966975f0275fe98871e285f8b13543119df))
* update lint script for ESLint 9 flat config ([2122a08](https://github.com/smetroid/d3d-render/commit/2122a08a77eec5e9d9d9d52ac0163efccd7cf8b0))
* **vercel:** disable framework detection so api/ functions are used directly ([d5a8e2d](https://github.com/smetroid/d3d-render/commit/d5a8e2d7fcb8b16c2bd7b71820ef5ea0bb706e98))
* **vercel:** remove invalid runtime field, node version comes from engines.node ([3a0e63d](https://github.com/smetroid/d3d-render/commit/3a0e63de9a9905c86aa5a1269b30704b8494b26c))
* **vercel:** rename server.test.js to avoid entrypoint detection, add .vercelignore ([2a5bb3b](https://github.com/smetroid/d3d-render/commit/2a5bb3b3667829668b36d1102db4bd778d068504))

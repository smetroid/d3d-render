import Fastify from 'fastify'

export function build(opts = {}) {
  const app = Fastify(opts)

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = build({ logger: true })
  const port = Number(process.env.PORT) || 3000
  app.listen({ port, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
}

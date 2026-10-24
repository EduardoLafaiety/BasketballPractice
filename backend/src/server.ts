import { createApp } from './app.js'
import { config } from './config.js'
import { openDatabase } from './db/index.js'

const db = await openDatabase(config.databaseUrl)
const server = createApp(db).listen(config.port, () => {
  console.log(`API rodando em http://localhost:${config.port}/api`)
})

function shutdown() {
  server.close(async () => {
    await db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

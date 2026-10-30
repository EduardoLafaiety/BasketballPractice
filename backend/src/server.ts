import { createApp } from './app.js'
import { config } from './config.js'
import { openDatabase } from './db/index.js'
import { startNewsSync } from './lib/news.js'

const db = await openDatabase(config.databaseUrl)
const server = createApp(db).listen(config.port, () => {
  console.log(`API rodando em http://localhost:${config.port}/api`)
})
const stopNewsSync = startNewsSync(db, { apiKey: config.gnewsApiKey, intervalMinutes: config.newsIntervalMinutes })

function shutdown() {
  stopNewsSync()
  server.close(async () => {
    await db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

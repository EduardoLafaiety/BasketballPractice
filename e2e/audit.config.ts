import { defineConfig } from '@playwright/test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import config from './playwright.config'

export default defineConfig(config, {
  testDir: './audits',
  outputDir: join(tmpdir(), 'basketball-practice-audit'),
  reporter: 'list',
  workers: 1,
  use: { ...config.use, reducedMotion: 'reduce' },
})

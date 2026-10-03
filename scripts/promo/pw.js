// Playwright ставится глобально (`npm i -g playwright`), а не в зависимости
// воркспейсов: общий лок и Docker-сборка веба о нём знать не должны.
const path = require('path')
const { execSync } = require('child_process')

function playwright() {
  try {
    return require('playwright')
  } catch {
    const root = execSync('npm root -g').toString().trim()
    return require(path.join(root, 'playwright'))
  }
}

module.exports = { playwright }

/**
 * PM2 config for production (AWS/server).
 * cwd uses project root so it works with any deploy path.
 * Set PUPPETEER_EXECUTABLE_PATH / NEXT_APP_URL on server if different from default.
 */
const path = require('path')
const projectRoot = path.resolve(__dirname)

module.exports = {
  apps: [
    {
      name: 'meras-node',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: projectRoot,
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'meras-whatsapp',
      script: './whatsapp-service/server-multi.js',
      cwd: projectRoot,
      env: {
        NODE_ENV: 'production',
        PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH || '/home/ec2-user/.cache/puppeteer/chrome/linux-145.0.7632.46/chrome-linux64/chrome',
        PORT: '3001',
        NEXT_APP_URL: process.env.NEXT_APP_URL || 'http://localhost:3000'
      }
    }
  ]
}

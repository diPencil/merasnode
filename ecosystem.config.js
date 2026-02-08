module.exports = {
  apps: [
    {
      name: 'meras-node',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/ec2-user/MerasNode',
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'meras-whatsapp',
      script: './whatsapp-service/server-multi.js',
      cwd: '/home/ec2-user/MerasNode',
      env: {
        NODE_ENV: 'production',
        PUPPETEER_EXECUTABLE_PATH: '/home/ec2-user/.cache/puppeteer/chrome/linux-145.0.7632.46/chrome-linux64/chrome',
        PORT: '3001',
        NEXT_APP_URL: 'http://localhost:3000'
      }
    }
  ]
}

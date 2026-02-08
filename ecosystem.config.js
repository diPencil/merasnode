// PM2 Process Manager Configuration
// For Production Deployment

module.exports = {
  apps: [
    {
      name: 'meras-nextjs',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: 'logs/nextjs-error.log',
      out_file: 'logs/nextjs-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'meras-whatsapp',
      script: './whatsapp-service/server-multi.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NEXT_APP_URL: 'http://localhost:3000'
      },
      error_file: 'logs/whatsapp-error.log',
      out_file: 'logs/whatsapp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};


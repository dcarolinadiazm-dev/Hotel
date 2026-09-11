const path = require('path');

module.exports = {
  apps: [
    {
      name: 'hotel-app',
      script: path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      args: 'server.ts',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      },
      restart_delay: 3000,
      max_restarts: 10,
      autorestart: true
    }
  ]
};


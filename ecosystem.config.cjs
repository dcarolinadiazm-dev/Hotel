module.exports = {
  apps: [
    {
      name: 'hotel-app',
      script: 'cmd.exe',
      args: '/c npm run server',
      cwd: 'C:\\SYSplus\\Hotel',
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


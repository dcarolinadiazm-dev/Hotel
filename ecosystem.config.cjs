module.exports = {
  apps: [
    {
      name: 'hotel-app',
      script: 'npm',
      args: 'run server',
      shell: true,
      cwd: 'C:\\SYSplus\\Hotel',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: '3000'
      },
      restart_delay: 3000,
      max_restarts: 10
    }
  ]
};

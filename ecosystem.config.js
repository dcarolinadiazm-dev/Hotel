module.exports = {
  apps: [
    {
      name: 'hotel-app',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'server.ts',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

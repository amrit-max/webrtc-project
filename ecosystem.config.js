module.exports = {
  apps: [
    {
      name: 'remotedesk-backend',
      script: 'npm',
      args: 'run start',
      cwd: './backend',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};

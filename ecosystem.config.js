module.exports = {
  apps: [
    {
      name: "wood-erp",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      cwd: "/var/www/wood-erp",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};

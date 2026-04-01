module.exports = {
  apps: [
    {
      name: "wood-erp",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      cwd: "/var/www/wood-erp",
      instances: 2,           // Cluster mode — 2 ta instance
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",  // 512MB → 1GB
      // Health check
      // PM2 Plus bilan ishlatiladi, lekin oddiy holda ham foydalanish mumkin
      // Health endpoint: /api/health
      // Logs
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      // Kunlik restart (har kuni soat 03:00 da)
      cron_restart: "0 3 * * *",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};

module.exports = {
  apps: [
    {
      name: "nextn",
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3000",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000
      },
      watch: false,
      max_memory_restart: "500M"
    },
    {
      name: "monitor-service",
      script: "scripts/monitor-service.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      env: {
        NODE_ENV: "production"
      },
      watch: false,
      autorestart: true
    }
  ]
};

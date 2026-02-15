module.exports = {
  apps: [
    {
      name: "nextn",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "500M"
    }
  ]
};

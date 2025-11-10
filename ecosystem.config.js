module.exports = {
  apps: [{
    name: 'intranet-api',
    script: 'index.js',
    instances: 'max', // This will launch one instance per CPU core
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
    }
  },
  {
    name: 'virus-scan-worker',
    script: 'workers/virusScan.worker.js',
    instances: 1, // One worker is usually sufficient
    env_production: {
      NODE_ENV: 'production',
    }
  }
  ]
};
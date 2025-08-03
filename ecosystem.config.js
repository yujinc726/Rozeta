module.exports = {
  apps: [{
    name: 'slide-scribe',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu/Slide-Scribe',
    instances: 1, // 작은 인스턴스에서는 1개로 시작
    exec_mode: 'fork', // cluster 대신 fork 모드로 변경
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/Slide-Scribe/logs/pm2-error.log',
    out_file: '/home/ubuntu/Slide-Scribe/logs/pm2-out.log',
    log_file: '/home/ubuntu/Slide-Scribe/logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    
    // 건강 체크
    min_uptime: '10s',
    max_restarts: 10,
    
    // 환경별 설정
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      watch: ['server', 'app'],
      ignore_watch: ['node_modules', '.next', 'logs'],
      watch_delay: 1000
    }
  }]
}; 
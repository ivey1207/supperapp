const { Client } = require('ssh2');

const config = {
    host: '161.97.118.117',
    port: 22,
    username: 'root',
    password: 'mE4B6w9sTtc6'
};

const conn = new Client();

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec('cd /root/uz-superapp && echo "=== DOCKER PS ALL ===" && docker ps -a && echo "=== REPLICA INSPECT ===" && docker inspect uz-superapp-postgres-replica-1 && echo "=== BACKUP LOGS ===" && docker compose logs backup', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            conn.end();
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
        });
    });
}).connect(config);

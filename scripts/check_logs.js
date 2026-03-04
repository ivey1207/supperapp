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
    conn.exec('cd /root/uz-superapp && echo "=== CONTAINER STATUS ===" && docker compose ps && echo "=== RECENT BACKEND LOGS ===" && docker compose logs --tail 20 backend-1', (err, stream) => {
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

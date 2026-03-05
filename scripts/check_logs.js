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
    conn.exec('cd /root/uz-superapp && echo "=== FORCING WAL SWITCH ===" && docker exec uz-superapp-postgres-master-1 psql -U user -d superapp -c "SELECT pg_switch_wal();" && sleep 2 && echo "=== WAL ARCHIVE CHECK ===" && docker exec uz-superapp-postgres-master-1 ls -lh /archives/', (err, stream) => {
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

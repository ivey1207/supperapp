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
    conn.exec('cd /root/uz-superapp && mkdir -p backups/wal_archives && chmod 777 backups/wal_archives && echo "=== WAL PERMISSIONS CHECK ===" && docker exec uz-superapp-postgres-master-1 ls -la /archives && echo "=== FORCING WAL SWITCH AGAIN ===" && docker exec uz-superapp-postgres-master-1 psql -U user -d superapp -c "SELECT pg_switch_wal();" && sleep 5 && echo "=== WAL ARCHIVE FINAL CHECK ===" && ls -lh backups/wal_archives', (err, stream) => {
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

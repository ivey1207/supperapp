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
    conn.exec('cd /root/uz-superapp && echo "=== BACKUP SERVICE LOGS ===" && docker logs uz-superapp-backup-1 --tail 20 && echo "=== WAL ARCHIVE FINAL CHECK ===" && ls -lh backups/wal_archives && echo "=== REPLICATION STATUS ===" && docker exec uz-superapp-postgres-master-1 psql -U user -d superapp -c "select * from pg_stat_replication;"', (err, stream) => {
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

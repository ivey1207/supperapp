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
    // Wipe all relevant collections to allow clean re-seed
    const wipeCmd = `docker exec uz-superapp-mongodb-1 mongosh superapp --eval "db.branches.deleteMany({}); db.organizations.deleteMany({}); db.hardware_kiosks.deleteMany({}); db.services.deleteMany({}); db.devices.deleteMany({}); db.accounts.deleteMany({role: { \\$ne: 'SUPER_ADMIN' } });"`;

    conn.exec(wipeCmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Wipe complete. code: ' + code);
            conn.end();
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
        });
    });
}).connect(config);

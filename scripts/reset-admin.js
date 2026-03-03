const { Client } = require('ssh2');

const config = {
    host: '161.97.118.117',
    port: 22,
    username: 'root',
    password: 'mE4B6w9sTtc6'
};

const conn = new Client();

function executeRemoteCommand(cmd) {
    return new Promise((resolve, reject) => {
        console.log(`[SSH] Executing:\n${cmd}`);
        conn.exec(cmd, (err, stream) => {
            if (err) return reject(err);
            let output = '';
            stream.on('close', (code) => {
                if (code === 0) resolve(output);
                else {
                    console.error(`Command failed with code ${code}`);
                    // Resolve anyway to gracefully end connection
                    resolve(output);
                }
            }).on('data', (data) => {
                process.stdout.write(data);
                output += data;
            }).stderr.on('data', (data) => {
                process.stderr.write(data);
            });
        });
    });
}

conn.on('ready', async () => {
    console.log('[SSH] Connected successfully');
    try {
        const cmd = `
            cd /root/uz-superapp &&
            git pull origin main &&
            sed -i '/JWT_SECRET/a\\      FORCE_RESET_ADMIN: "true"' docker-compose.yml &&
            docker compose down backend-1 backend-2 admin-super || docker-compose down backend-1 backend-2 admin-super &&
            docker compose up -d --build backend-1 backend-2 admin-super || docker-compose up -d --build backend-1 backend-2 admin-super &&
            sed -i '/FORCE_RESET_ADMIN/d' docker-compose.yml &&
            echo "Admin password reset successfully."
        `;
        await executeRemoteCommand(cmd);
    } catch (err) {
        console.error(err);
    } finally {
        conn.end();
    }
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect(config);

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const config = {
    host: '161.97.118.117',
    port: 22,
    username: 'root',
    password: 'root1234', // Hardcoded for immediate manual run
    remoteDir: '/root/uz-superapp',
    tarName: 'deploy.tar.gz'
};

const conn = new Client();

function executeLocalCommand(cmd) {
    return new Promise((resolve, reject) => {
        console.log(`[Local] Executing: ${cmd}`);
        exec(cmd, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
            // Ignore tar warnings like "file changed as we read it" (often exit code 1 on mac)
            if (error && error.code !== 1) {
                console.error(`[Local] Error: ${error.message}`);
                return reject(error);
            }
            if (stderr) console.error(`[Local] Stderr: ${stderr}`);
            console.log(`[Local] Stdout: ${stdout}`);
            resolve(stdout);
        });
    });
}


function connect() {
    return new Promise((resolve, reject) => {
        conn.on('ready', () => {
            console.log('[SSH] Client :: ready');
            resolve();
        }).on('error', (err) => {
            console.error('[SSH] Connection Error:', err);
            reject(err);
        }).connect(config);
    });
}

function uploadFile(localPath, remotePath) {
    return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
            if (err) return reject(err);
            console.log(`[SFTP] Uploading ${localPath} to ${remotePath}...`);
            const readStream = fs.createReadStream(localPath);
            const writeStream = sftp.createWriteStream(remotePath);

            writeStream.on('close', () => {
                console.log('[SFTP] Upload successful');
                sftp.end();
                resolve();
            }).on('error', (e) => reject(e));

            readStream.pipe(writeStream);
        });
    });
}

function executeRemoteCommand(cmd) {
    return new Promise((resolve, reject) => {
        console.log(`[SSH] Executing: ${cmd}`);
        conn.exec(cmd, (err, stream) => {
            if (err) return reject(err);
            let output = '';
            stream.on('close', (code, signal) => {
                console.log(`[SSH] Stream :: close :: code: ${code}, signal: ${signal}`);
                if (code === 0) resolve(output);
                else reject(new Error(`Remote command failed with code ${code}`));
            }).on('data', (data) => {
                process.stdout.write('[SSH] ' + data);
                output += data;
            }).stderr.on('data', (data) => {
                process.stderr.write('[SSH] ERR: ' + data);
            });
        });
    });
}

async function deploy() {
    try {
        console.log('--- Starting Deployment ---');

        console.log('[Local] Archiving project...');
        // Exclude node_modules, .git, etc to keep size small
        await executeLocalCommand(`tar --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='target' --exclude='.DS_Store' -czf ${config.tarName} .`);

        await connect();

        console.log('[SSH] Creating remote directory...');
        await executeRemoteCommand(`mkdir -p ${config.remoteDir}`);

        console.log('[SSH] Uploading archive...');
        await uploadFile(path.join(__dirname, '..', config.tarName), `${config.remoteDir}/${config.tarName}`);

        console.log('[SSH] Extracting and building...');
        // Install docker if missing, install docker-compose-plugin if missing, then build
        const deployCmd = `
      cd ${config.remoteDir} &&
      tar -xzf ${config.tarName} &&
      rm ${config.tarName} &&
      if ! command -v docker &> /dev/null; then
          echo "Installing Docker..."
          curl -fsSL https://get.docker.com -o get-docker.sh
          sh get-docker.sh
      fi &&
      docker compose down || true &&
      docker compose up -d --build --remove-orphans
    `;
        await executeRemoteCommand(deployCmd); // This might take a while

        console.log('--- Deployment Completed Successfully ---');
        conn.end();

        // Cleanup Local Archive
        await executeLocalCommand(`rm ${config.tarName}`);

    } catch (error) {
        console.error('Deployment Failed:', error);
        conn.end();
    }
}

deploy();

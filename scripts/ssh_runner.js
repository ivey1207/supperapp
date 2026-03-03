const { spawn } = require('child_process');
const fs = require('fs');

const password = 'mE4B6w9sTtc6';
// Reading the updated file and converting to base64
const base64Content = fs.readFileSync('backend/src/main/java/uz/superapp/seed/SeedRunner.java').toString('base64');

// Create the remote command properly
const remoteCmd = `echo '${base64Content}' | base64 -d > /root/uz-superapp/backend/src/main/java/uz/superapp/seed/SeedRunner.java && cd /root/uz-superapp && sed -i '/JWT_SECRET/a\\      FORCE_RESET_ADMIN: "true"' docker-compose.yml && (docker compose down backend-1 backend-2 admin-super || docker-compose down backend-1 backend-2 admin-super) && (docker compose up -d --build backend-1 backend-2 admin-super || docker-compose up -d --build backend-1 backend-2 admin-super) && sed -i '/FORCE_RESET_ADMIN/d' docker-compose.yml && echo 'Admin Reset Done!'`;

// Write the expect script. Notice the curly braces around the string in expect so it doesn't parse quotes inside.
const expectScript = `
set timeout -1
spawn ssh -o StrictHostKeyChecking=no root@161.97.118.117 {${remoteCmd}}

expect {
    "*yes/no*" {
        send "yes\\r"
        exp_continue
    }
    "*assword:*" {
        send "${password}\\r"
    }
}
expect eof
`;

fs.writeFileSync('scripts/run.exp', expectScript);
console.log("Expect script written. Executing...");

const child = spawn('expect', ['scripts/run.exp'], { stdio: 'inherit' });
child.on('close', code => {
    console.log("Process exited with code " + code);
});

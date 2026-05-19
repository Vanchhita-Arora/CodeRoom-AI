const pty = require('node-pty');
const os = require('os');
try {
  const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/sh';
  console.log("Spawning shell:", shell);
  const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: __dirname,
      env: process.env
  });
  console.log("Spawned successfully, pid:", ptyProcess.pid);
  ptyProcess.kill();
} catch(e) {
  console.error("Error:", e);
}

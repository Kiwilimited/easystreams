const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const execAsync = util.promisify(exec);

class ByparrManager {
    constructor() {
        this.process = null;
        this.byparrDir = path.join(__dirname, 'byparr-src');
        this.isStarting = false;
    }

    async execCommand(command, cwd = process.cwd()) {
        try {
            await execAsync(command, { cwd });
        } catch (e) {
            console.error(`[Byparr] Errore comando "${command}":`, e.message);
            throw e;
        }
    }

    async start() {
        if (this.process) return;
        if (this.isStarting) return;
        this.isStarting = true;

        try {
            if (!fs.existsSync(this.byparrDir)) {
                console.log('[Byparr] Download in corso...');
                await this.execCommand(`git clone https://github.com/ThePhaseless/Byparr "${this.byparrDir}"`);
                console.log('[Byparr] Installazione dipendenze...');
                await this.execCommand('uv sync', this.byparrDir);
                console.log('[Byparr] Inizializzazione browser...');
                await this.execCommand('uv run main.py --init', this.byparrDir);
            } else {
                console.log('[Byparr] Aggiornamento in corso...');
                await this.execCommand('git pull', this.byparrDir);
                await this.execCommand('uv sync', this.byparrDir);
            }
        } catch (e) {
            console.error('[Byparr] Errore durante download/aggiornamento:', e.message);
            // Proseguiamo comunque, magari i file ci sono già
        }

        console.log('[Byparr] Avvio servizio interno...');

        return new Promise((resolve, reject) => {
            // Usa 'uv run main.py' per avviare Byparr senza shell: true per evitare warning
            const isWin = process.platform === 'win32';
            this.process = spawn(isWin ? 'uv.exe' : 'uv', ['run', 'main.py'], {
                cwd: this.byparrDir,
                stdio: 'pipe',
                env: { ...process.env, PORT: '8191', HOST: '127.0.0.1' }
            });

            // Se uv.exe fallisce su windows (non comune), fallback a shell
            this.process.on('error', (err) => {
                if (err.code === 'ENOENT' && isWin) {
                    console.log('[Byparr] Fallback a shell mode...');
                    this.process = spawn('uv', ['run', 'main.py'], {
                        cwd: this.byparrDir,
                        shell: true,
                        stdio: 'pipe',
                        env: { ...process.env, PORT: '8191', HOST: '127.0.0.1' }
                    });
                    this.setupListeners(resolve);
                } else {
                    console.error('[Byparr] Errore avvio:', err.message);
                    this.isStarting = false;
                    resolve();
                }
            });

            if (this.process && !this.process.killed) {
                this.setupListeners(resolve);
            }

            // Timeout di sicurezza aumentato a 20s per aggiornamenti pesanti
            setTimeout(() => {
                if (this.isStarting) {
                    console.log('[Byparr] Timeout avvio raggiunto, proseguo...');
                    this.isStarting = false;
                    resolve();
                }
            }, 20000);
        });
    }

    setupListeners(resolve) {
        if (!this.process) return;

        this.process.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Uvicorn running on')) {
                console.log('[Byparr] Servizio avviato con successo!');
                this.isStarting = false;
                resolve();
            }
            if (output.includes('ERROR') || output.includes('Error')) {
                console.error('[Byparr] Log:', output.trim());
            }
        });

        this.process.stderr.on('data', (data) => {
            const output = data.toString();
            // console.error('[Byparr-Error] ', output.trim());
        });

        this.process.on('close', (code) => {
            if (this.isStarting) {
                console.log(`[Byparr] Processo chiuso prematuramente con codice ${code}`);
                this.isStarting = false;
                resolve();
            }
            this.process = null;
        });
    }

    stop() {
        if (this.process) {
            console.log('[Byparr] Arresto servizio...');
            this.process.kill('SIGTERM');
            this.process = null;
        }
    }
}

module.exports = new ByparrManager();

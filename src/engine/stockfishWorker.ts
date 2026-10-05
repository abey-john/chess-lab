export interface WorkerMessageListener {
  (line: string): void;
}

export class StockfishWorker {
  private readonly workerUrl: string;
  private worker: Worker | null = null;
  private isReadyPromise: Promise<void> | null = null;
  private listeners: Set<WorkerMessageListener> = new Set();
  private isDisposed = false;

  constructor(workerUrl: string) {
    this.workerUrl = workerUrl;
  }

  public async init(): Promise<void> {
    if (this.worker || this.isDisposed) {
      return;
    }

    this.worker = new Worker(this.workerUrl);

    this.worker.onmessage = (e: MessageEvent<string>) => {
      const line = typeof e.data === 'string' ? e.data.trim() : '';
      if (line) {
        for (const listener of this.listeners) {
          listener(line);
        }
      }
    };

    this.worker.onerror = (e) => {
      console.error('Stockfish Worker Error:', e);
    };

    this.isReadyPromise = this.performHandshake();
    await this.isReadyPromise;
  }

  private performHandshake(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        return reject(new Error('Worker not initialized'));
      }

      let uciDone = false;

      const timeout = setTimeout(() => {
        this.removeListener(handshakeListener);
        reject(new Error('Stockfish handshake timed out'));
      }, 10000);

      const handshakeListener: WorkerMessageListener = (line) => {
        if (!uciDone && line === 'uciok') {
          uciDone = true;
          this.postMessage('isready');
        } else if (uciDone && line === 'readyok') {
          clearTimeout(timeout);
          this.removeListener(handshakeListener);
          resolve();
        }
      };

      this.addListener(handshakeListener);
      this.postMessage('uci');
    });
  }

  public postMessage(cmd: string): void {
    if (this.worker && !this.isDisposed) {
      this.worker.postMessage(cmd);
    }
  }

  public addListener(listener: WorkerMessageListener): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: WorkerMessageListener): void {
    this.listeners.delete(listener);
  }

  public async executeCommand(
    commands: string[],
    isFinished: (line: string) => boolean,
    timeoutMs = 15000
  ): Promise<string[]> {
    if (!this.worker) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const outputLines: string[] = [];

      const timeout = setTimeout(() => {
        this.removeListener(listener);
        reject(new Error(`Command timed out after ${timeoutMs}ms: ${commands.join('; ')}`));
      }, timeoutMs);

      const listener: WorkerMessageListener = (line) => {
        outputLines.push(line);
        if (isFinished(line)) {
          clearTimeout(timeout);
          this.removeListener(listener);
          resolve(outputLines);
        }
      };

      this.addListener(listener);

      for (const cmd of commands) {
        this.postMessage(cmd);
      }
    });
  }

  public async stop(): Promise<void> {
    if (!this.worker || this.isDisposed) {
      return;
    }
    this.postMessage('stop');
    await this.executeCommand(['isready'], (line) => line === 'readyok', 3000).catch(() => {});
  }

  public terminate(): void {
    this.isDisposed = true;
    this.listeners.clear();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

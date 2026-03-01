'use strict';

const { Worker, isMainThread, parentPort } = require('worker_threads');
const os = require('os');
const path = require('path');

// ── Worker code (isMainThread === false) ──────────────────────
if (!isMainThread) {
  const fs = require('fs');
  const { Packer } = require('./packer');
  const { Unpacker } = require('./unpacker');

  parentPort.on('message', (msg) => {
    try {
      const startTime = Date.now();

      if (msg.type === 'pack') {
        const input = fs.readFileSync(msg.inputPath);
        const packer = new Packer(msg.opts || {});
        const output = packer.pack(input);
        fs.writeFileSync(msg.outputPath, output);
        parentPort.postMessage({
          type: 'result',
          taskId: msg.taskId,
          success: true,
          stats: {
            inputSize: input.length,
            outputSize: output.length,
            elapsed: Date.now() - startTime,
            dictSize: packer.dictChunks.length,
          },
        });
      } else if (msg.type === 'unpack') {
        const input = fs.readFileSync(msg.inputPath);
        const unpacker = new Unpacker();
        const output = unpacker.unpack(input);
        fs.writeFileSync(msg.outputPath, output);
        parentPort.postMessage({
          type: 'result',
          taskId: msg.taskId,
          success: true,
          stats: {
            inputSize: input.length,
            outputSize: output.length,
            elapsed: Date.now() - startTime,
            dictSize: unpacker.dict.length,
          },
        });
      } else {
        parentPort.postMessage({
          type: 'result',
          taskId: msg.taskId,
          success: false,
          error: `Unknown task type: ${msg.type}`,
        });
      }
    } catch (err) {
      parentPort.postMessage({
        type: 'result',
        taskId: msg.taskId || 'unknown',
        success: false,
        error: err.message,
      });
    }
  });

  // Worker ready signal
  parentPort.postMessage({ type: 'ready' });
}

// ── Main process code ──────────────────────────────────────

/**
 * Worker Thread based parallel processing pool
 *
 * Usage:
 *   const pool = new WorkerPool(4);
 *   pool.init();
 *   const results = await pool.runAll(tasks);
 *   await pool.destroy();
 */
class WorkerPool {
  /**
   * @param {number} [size] - Number of workers (default: CPU core count)
   */
  constructor(size) {
    this._size = size || os.cpus().length;
    this._workers = [];
    this._idle = [];         // Idle worker queue
    this._taskQueue = [];    // Pending task queue
    this._taskIdCounter = 0;
    this._pendingTasks = new Map(); // taskId → { resolve, reject }
    this._initialized = false;
  }

  /**
   * Initialize worker pool
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    for (let i = 0; i < this._size; i++) {
      const worker = new Worker(__filename);
      worker.on('message', (msg) => this._onMessage(worker, msg));
      worker.on('error', (err) => this._onError(worker, err));
      this._workers.push(worker);
      this._idle.push(worker);
    }
  }

  /**
   * Handle worker message
   */
  _onMessage(worker, msg) {
    if (msg.type === 'ready') return;

    if (msg.type === 'result') {
      const pending = this._pendingTasks.get(msg.taskId);
      if (pending) {
        this._pendingTasks.delete(msg.taskId);
        if (msg.success) {
          pending.resolve({ success: true, stats: msg.stats });
        } else {
          pending.resolve({ success: false, error: msg.error });
        }
      }

      // Assign pending tasks from queue if available
      if (this._taskQueue.length > 0) {
        const next = this._taskQueue.shift();
        worker.postMessage(next.message);
      } else {
        this._idle.push(worker);
      }
    }
  }

  /**
   * Handle worker error
   */
  _onError(worker, err) {
    // Fail all pending tasks for this worker
    for (const [taskId, pending] of this._pendingTasks) {
      pending.resolve({ success: false, error: err.message });
      this._pendingTasks.delete(taskId);
    }
  }

  /**
   * Execute single task
   * @param {Object} task - { type, inputPath, outputPath, opts }
   * @returns {Promise<Object>} { success, stats } | { success, error }
   */
  runTask(task) {
    const taskId = String(++this._taskIdCounter);
    const message = { ...task, taskId };

    return new Promise((resolve, reject) => {
      this._pendingTasks.set(taskId, { resolve, reject });

      if (this._idle.length > 0) {
        const worker = this._idle.shift();
        worker.postMessage(message);
      } else {
        this._taskQueue.push({ message });
      }
    });
  }

  /**
   * Execute multiple tasks concurrently
   * @param {Array<Object>} tasks
   * @returns {Promise<Array<Object>>}
   */
  async runAll(tasks) {
    const promises = tasks.map(task => this.runTask(task));
    return Promise.all(promises);
  }

  /**
   * Destroy pool
   */
  async destroy() {
    const terminations = this._workers.map(w => w.terminate());
    await Promise.all(terminations);
    this._workers = [];
    this._idle = [];
    this._initialized = false;
  }
}

// Export only from main process
if (isMainThread) {
  module.exports = { WorkerPool };
}

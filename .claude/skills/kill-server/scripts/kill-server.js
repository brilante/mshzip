#!/usr/bin/env node
/**
 * Kill Server Script
 * 프로젝트 웹서버를 찾아 종료하는 스크립트
 *
 * 종료 우선순위:
 *   1단계: HTTP shutdown API (POST /api/admin/shutdown) — 가장 안정적
 *   2단계: PID 파일 기반 process.kill() — Node.js 네이티브 (Git Bash 호환)
 *   3단계: 포트 기반 PID 탐색 → process.kill() — 백업
 */

const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ServerKiller {
  static ALLOWED_PORTS = [5858, 3999];
  static PID_FILE_NAME = '.server.pid';

  constructor(projectRoot) {
    this.projectRoot = projectRoot || process.cwd();
    this.isWindows = os.platform() === 'win32';
    this.pidFilePath = path.join(this.projectRoot, ServerKiller.PID_FILE_NAME);
    this.ports = this.detectPorts();
  }

  // PID 파일에서 프로세스 ID 읽기
  readPidFile() {
    try {
      if (fs.existsSync(this.pidFilePath)) {
        const pid = fs.readFileSync(this.pidFilePath, 'utf8').trim();
        return parseInt(pid, 10);
      }
    } catch (err) {
      console.log(`  PID 파일 읽기 실패: ${err.message}`);
    }
    return null;
  }

  // PID 파일 삭제
  removePidFile() {
    try {
      if (fs.existsSync(this.pidFilePath)) {
        fs.unlinkSync(this.pidFilePath);
      }
    } catch (err) {
      // 무시
    }
  }

  static isAllowedPort(port) {
    return ServerKiller.ALLOWED_PORTS.includes(port);
  }

  // .env에서 포트 감지
  detectPorts() {
    const ports = [];
    const envPath = path.join(this.projectRoot, '.env');
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/^PORT=(\d+)/m);
        if (match) {
          const envPort = parseInt(match[1], 10);
          if (ServerKiller.isAllowedPort(envPort)) {
            ports.push(envPort);
          }
        }
      } catch (e) {
        // 무시
      }
    }
    ports.push(3999);
    return [...new Set(ports)];
  }

  // HTTP shutdown API 호출 (가장 안정적)
  httpShutdown(port) {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/_internal/shutdown',
        method: 'POST',
        timeout: 3000,
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve(res.statusCode === 200);
        });
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    });
  }

  // Node.js 네이티브 프로세스 존재 확인 (크로스플랫폼, 쉘 불필요)
  isProcessRunning(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  // Node.js 네이티브 프로세스 종료 (크로스플랫폼, 쉘 불필요)
  killProcess(pid) {
    try {
      process.kill(pid, 'SIGTERM');
      return true;
    } catch {
      return false;
    }
  }

  // 포트로 PID 찾기 (netstat/lsof)
  findPidByPort(port) {
    try {
      if (this.isWindows) {
        // cmd /c로 감싸서 Git Bash의 경로 변환 방지
        const output = execSync(
          `cmd /c "netstat -ano | findstr :${port} | findstr LISTENING"`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
        const lines = output.trim().split('\n');
        for (const line of lines) {
          const match = line.match(/LISTENING\s+(\d+)/);
          if (match) return parseInt(match[1], 10);
        }
        return null;
      } else {
        const output = execSync(`lsof -i :${port} -t 2>/dev/null`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        const pid = output.trim().split('\n')[0];
        return pid ? parseInt(pid, 10) : null;
      }
    } catch {
      return null;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // PID로 프로세스 종료 (process.kill 사용)
  async killByPid(pid, source = 'PID') {
    console.log(`  ${source}: PID ${pid} 종료 시도`);

    this.killProcess(pid);
    await this.sleep(2000);

    if (!this.isProcessRunning(pid)) {
      console.log(`  PID ${pid} 정상 종료 완료`);
      return true;
    }

    // 강제 종료
    console.log(`  정상 종료 실패, 강제 종료 시도...`);
    try {
      process.kill(pid, 'SIGKILL');
    } catch { /* 무시 */ }
    await this.sleep(1000);

    if (!this.isProcessRunning(pid)) {
      console.log(`  PID ${pid} 강제 종료 완료`);
      return true;
    }

    console.log(`  PID ${pid} 종료 실패`);
    return false;
  }

  // 메인 실행
  async run() {
    console.log('[kill-server] 서버 종료 시작');
    let killed = false;

    // 1단계: HTTP shutdown API (가장 안정적)
    for (const port of this.ports) {
      const ok = await this.httpShutdown(port);
      if (ok) {
        console.log(`  [1단계] HTTP shutdown 성공 (포트 ${port})`);
        await this.sleep(1000);
        this.removePidFile();
        killed = true;
        break;
      }
    }

    if (killed) {
      console.log('[kill-server] 서버 종료 완료');
      return true;
    }

    // 2단계: PID 파일 기반 종료
    const pidFromFile = this.readPidFile();
    if (pidFromFile) {
      if (this.isProcessRunning(pidFromFile)) {
        killed = await this.killByPid(pidFromFile, '[2단계] PID 파일');
      } else {
        killed = true;
      }
      this.removePidFile();
      if (killed) {
        console.log('[kill-server] 서버 종료 완료');
        return true;
      }
    }

    // 3단계: 포트 기반 종료 (백업)
    for (const port of this.ports) {
      const pid = this.findPidByPort(port);
      if (pid) {
        // node 프로세스인지 확인 (svchost 등 시스템 프로세스 보호)
        if (this.isWindows) {
          try {
            const output = execSync(
              `cmd /c "tasklist /fi "PID eq ${pid}" /fo csv /nh"`,
              { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
            );
            if (!output.toLowerCase().includes('node')) {
              console.log(`  [3단계] 포트 ${port}: PID ${pid}은(는) node가 아님, 스킵`);
              continue;
            }
          } catch {
            // tasklist 실패 시 안전하게 스킵
            continue;
          }
        }
        killed = await this.killByPid(pid, `[3단계] 포트 ${port}`);
        if (killed) break;
      }
    }

    if (!killed) {
      console.log('[kill-server] 종료할 서버 없음');
    } else {
      console.log('[kill-server] 서버 종료 완료');
    }
    return killed;
  }
}

// CLI 실행
if (require.main === module) {
  const projectRoot = process.argv[2] || process.cwd();
  const killer = new ServerKiller(projectRoot);
  killer.run().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('[kill-server] 오류:', err.message);
    process.exit(1);
  });
}

module.exports = ServerKiller;

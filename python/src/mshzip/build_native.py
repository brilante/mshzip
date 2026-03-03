'_ecc.c 자동 빌드 스크립트 — MSVC/GCC 자동 감지'
from __future__ import annotations

import os
import sys
import subprocess
import shutil
from pathlib import Path

SRC_DIR = Path(__file__).parent
SRC_FILE = SRC_DIR / '_ecc.c'

# 플랫폼별 출력 파일명
if sys.platform == 'win32':
  LIB_NAME = '_ecc.dll'
elif sys.platform == 'darwin':
  LIB_NAME = '_ecc.dylib'
else:
  LIB_NAME = '_ecc.so'

OUTPUT = SRC_DIR / LIB_NAME


def find_msvc() -> Path | None:
  """vswhere.exe로 MSVC vcvarsall.bat 자동 탐색."""
  vswhere = Path('C:/Program Files (x86)/Microsoft Visual Studio/Installer/vswhere.exe')
  if not vswhere.exists():
    return None

  try:
    result = subprocess.run(
      [str(vswhere), '-latest', '-products', '*', '-property', 'installationPath'],
      capture_output=True, text=True, timeout=10
    )
    install_path = result.stdout.strip()
    if not install_path:
      return None

    vcvarsall = Path(install_path) / 'VC' / 'Auxiliary' / 'Build' / 'vcvarsall.bat'
    if not vcvarsall.exists():
      return None

    return vcvarsall
  except Exception:
    return None


def _build_msvc(vcvarsall: Path) -> bool:
  """bat 파일을 생성하여 MSVC 빌드 실행."""
  arch = 'amd64' if sys.maxsize > 2**32 else 'x86'
  bat = SRC_DIR / '_build_tmp.bat'
  try:
    lines = [
      '@echo off',
      f'call "{vcvarsall}" {arch}',
      f'cd /d "{SRC_DIR}"',
      f'cl /O2 /openmp /LD /Fe:_ecc.dll _ecc.c /link /DLL',
      'exit /b %errorlevel%',
    ]
    bat.write_bytes(('\n'.join(lines) + '\n').encode('ascii'))
    result = subprocess.run(
      [str(bat)], capture_output=True, timeout=120, shell=True
    )
    return OUTPUT.exists()
  finally:
    if bat.exists():
      bat.unlink()


def _has_openmp(compiler: str) -> bool:
  """컴파일러의 OpenMP 지원 여부 확인."""
  if sys.platform == 'darwin':
    # macOS 기본 clang은 OpenMP 미지원
    try:
      result = subprocess.run(
        [compiler, '-fopenmp', '-x', 'c', '-E', '-'],
        input=b'', capture_output=True, timeout=5
      )
      return result.returncode == 0
    except Exception:
      return False
  return True


def find_gcc() -> list[str] | None:
  """gcc 또는 cc 탐색."""
  for compiler in ['gcc', 'cc']:
    if shutil.which(compiler):
      omp_flag = ['-fopenmp'] if _has_openmp(compiler) else []
      fpic = [] if sys.platform == 'win32' else ['-fPIC']
      return [compiler, '-O2'] + omp_flag + fpic + ['-shared', '-o', str(OUTPUT), str(SRC_FILE)]
  return None


def build() -> Path | None:
  """DLL/SO 빌드. 성공 시 경로 반환, 실패 시 None."""
  if not SRC_FILE.exists():
    print(f'[build_native] 소스 파일 없음: {SRC_FILE}')
    return None

  # 기존 빌드 산출물 제거
  if OUTPUT.exists():
    OUTPUT.unlink()

  # MSVC 시도
  vcvarsall = find_msvc()
  if vcvarsall:
    print(f'[build_native] MSVC 감지: {vcvarsall}')
    try:
      if _build_msvc(vcvarsall):
        # 부산물 정리
        for ext in ['.obj', '.exp', '.lib']:
          artifact = SRC_DIR / f'_ecc{ext}'
          if artifact.exists():
            artifact.unlink()
        print(f'[build_native] MSVC 빌드 성공: {OUTPUT}')
        return OUTPUT
      else:
        print('[build_native] MSVC 빌드 실패: DLL 생성 안 됨')
    except Exception as e:
      print(f'[build_native] MSVC 빌드 예외: {e}')

  # GCC 시도
  gcc = find_gcc()
  if gcc:
    print(f'[build_native] GCC 빌드: {" ".join(gcc)}')
    try:
      result = subprocess.run(
        gcc, capture_output=True, text=True,
        timeout=60, cwd=str(SRC_DIR)
      )
      if OUTPUT.exists():
        print(f'[build_native] GCC 빌드 성공: {OUTPUT}')
        return OUTPUT
      else:
        print(f'[build_native] GCC 빌드 실패:\n{result.stderr}')
    except Exception as e:
      print(f'[build_native] GCC 빌드 예외: {e}')

  print('[build_native] 사용 가능한 C 컴파일러 없음')
  return None


if __name__ == '__main__':
  result = build()
  if result:
    print(f'\n빌드 완료: {result} ({result.stat().st_size:,} bytes)')
  else:
    print('\n빌드 실패')
    sys.exit(1)

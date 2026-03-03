'C 네이티브 ECC 라이브러리 ctypes 래퍼'
from __future__ import annotations

import ctypes
import sys
from pathlib import Path

_LIB_NAMES = {'win32': '_ecc.dll', 'linux': '_ecc.so', 'darwin': '_ecc.dylib'}

_lib: ctypes.CDLL | None = None


def _load_lib() -> ctypes.CDLL | None:
  """네이티브 라이브러리 로드 시도."""
  lib_name = _LIB_NAMES.get(sys.platform)
  if not lib_name:
    return None

  lib_path = Path(__file__).parent / lib_name
  if not lib_path.exists():
    return None

  try:
    lib = ctypes.CDLL(str(lib_path))

    # 함수 시그니처 설정
    c_uint8_p = ctypes.POINTER(ctypes.c_uint8)
    c_int_p = ctypes.POINTER(ctypes.c_int)

    # hamming_encode(data, codeword)
    lib.hamming_encode.argtypes = [c_uint8_p, c_uint8_p]
    lib.hamming_encode.restype = None

    # hamming_decode(codeword, data) -> int
    lib.hamming_decode.argtypes = [c_uint8_p, c_uint8_p]
    lib.hamming_decode.restype = ctypes.c_int

    # hamming_encode_batch(data, codewords, count)
    lib.hamming_encode_batch.argtypes = [c_uint8_p, c_uint8_p, ctypes.c_int]
    lib.hamming_encode_batch.restype = None

    # hamming_decode_batch(codewords, data, results, count) -> int
    lib.hamming_decode_batch.argtypes = [c_uint8_p, c_uint8_p, c_int_p, ctypes.c_int]
    lib.hamming_decode_batch.restype = ctypes.c_int

    # rs_xor_parity(axes, count, axis_size, parity)
    lib.rs_xor_parity.argtypes = [c_uint8_p, ctypes.c_int, ctypes.c_int, c_uint8_p]
    lib.rs_xor_parity.restype = None

    return lib
  except (OSError, AttributeError):
    return None


# 모듈 로드 시 DLL 로드
_lib = _load_lib()


def is_available() -> bool:
  """네이티브 라이브러리 사용 가능 여부."""
  return _lib is not None


# --- 단건 API ---

def encode(data: bytes) -> bytes:
  """Hamming 인코딩: 128B → 130B."""
  data_buf = (ctypes.c_uint8 * 128).from_buffer_copy(data)
  cw_buf = (ctypes.c_uint8 * 130)()
  _lib.hamming_encode(data_buf, cw_buf)
  return bytes(cw_buf)


def decode(codeword: bytes) -> tuple[bytes, int]:
  """Hamming 디코딩: 130B → (128B, status). status: 0=정상, 1=수정됨, 2=수정불가."""
  cw_buf = (ctypes.c_uint8 * 130).from_buffer_copy(codeword)
  data_buf = (ctypes.c_uint8 * 128)()
  status = _lib.hamming_decode(cw_buf, data_buf)
  return bytes(data_buf), status


# --- 배치 API ---

def encode_batch(data_list: list[bytes]) -> list[bytes]:
  """배치 Hamming 인코딩: N × 128B → N × 130B."""
  count = len(data_list)
  if count == 0:
    return []

  # 연속 메모리로 결합
  concat = b''.join(data_list)
  data_buf = (ctypes.c_uint8 * (count * 128)).from_buffer_copy(concat)
  cw_buf = (ctypes.c_uint8 * (count * 130))()

  _lib.hamming_encode_batch(data_buf, cw_buf, count)

  # 결과 분할
  result = bytes(cw_buf)
  return [result[i * 130:(i + 1) * 130] for i in range(count)]


def decode_batch(cw_list: list[bytes]) -> list[tuple[bytes, int]]:
  """배치 Hamming 디코딩: N × 130B → N × (128B, status)."""
  count = len(cw_list)
  if count == 0:
    return []

  concat = b''.join(cw_list)
  cw_buf = (ctypes.c_uint8 * (count * 130)).from_buffer_copy(concat)
  data_buf = (ctypes.c_uint8 * (count * 128))()
  results_buf = (ctypes.c_int * count)()

  _lib.hamming_decode_batch(cw_buf, data_buf, results_buf, count)

  data_bytes = bytes(data_buf)
  return [
    (data_bytes[i * 128:(i + 1) * 128], results_buf[i])
    for i in range(count)
  ]


# --- RS XOR ---

def xor_parity(axes_data: bytes, count: int, axis_size: int) -> bytes:
  """RS XOR 패리티: count × axis_size 바이트 → axis_size 바이트."""
  data_buf = (ctypes.c_uint8 * len(axes_data)).from_buffer_copy(axes_data)
  parity_buf = (ctypes.c_uint8 * axis_size)()
  _lib.rs_xor_parity(data_buf, count, axis_size, parity_buf)
  return bytes(parity_buf)

'Hamming(1035, 1024) — 단일 비트 오류 수정 코드 (SEC)'
from __future__ import annotations

# C 네이티브 가속 (투명 교체)
try:
    from . import _ecc_native
    _USE_NATIVE = _ecc_native.is_available()
except ImportError:
    _USE_NATIVE = False

DATA_BITS = 1024
PARITY_BITS = 11
CODEWORD_BITS = 1035  # 1024 + 11
CODEWORD_BYTES = 130  # ceil(1035/8)
DATA_BYTES = 128


def compute_data_positions() -> list[int]:
    """1~1035 중 2의 거듭제곱이 아닌 위치 1024개 (1-based)."""
    return [pos for pos in range(1, CODEWORD_BITS + 1) if pos & (pos - 1) != 0]


DATA_POSITIONS: list[int] = compute_data_positions()

# 바이트 popcount 테이블
_POPCOUNT = bytes(bin(i).count('1') for i in range(256))


def _build_parity_masks() -> list[list[tuple[int, int]]]:
    """패리티 비트별 바이트 마스크 사전 계산."""
    masks: list[list[tuple[int, int]]] = []
    for k in range(PARITY_BITS):
        parity_pos = 1 << k
        byte_map: dict[int, int] = {}
        for pos in range(1, CODEWORD_BITS + 1):
            if pos & parity_pos:
                bit_idx = pos - 1  # 0-based
                byte_idx = bit_idx >> 3
                bit_in_byte = 7 - (bit_idx & 7)  # MSB-first
                byte_map[byte_idx] = byte_map.get(byte_idx, 0) | (1 << bit_in_byte)
        masks.append(list(byte_map.items()))
    return masks


_PARITY_MASKS = _build_parity_masks()


def _get_bit(buf: bytes | bytearray, bit_idx: int) -> int:
    byte_idx = bit_idx >> 3
    bit_in_byte = 7 - (bit_idx & 7)
    return (buf[byte_idx] >> bit_in_byte) & 1


def _set_bit(buf: bytearray, bit_idx: int, val: int) -> None:
    byte_idx = bit_idx >> 3
    bit_in_byte = 7 - (bit_idx & 7)
    if val:
        buf[byte_idx] |= (1 << bit_in_byte)
    else:
        buf[byte_idx] &= ~(1 << bit_in_byte) & 0xFF


def _flip_bit(buf: bytearray, bit_idx: int) -> None:
    byte_idx = bit_idx >> 3
    bit_in_byte = 7 - (bit_idx & 7)
    buf[byte_idx] ^= (1 << bit_in_byte)


def encode(data: bytes | bytearray) -> bytes:
    """Hamming 인코딩: 128바이트 → 130바이트."""
    if len(data) != DATA_BYTES:
        raise ValueError(f'Hamming encode: data must be {DATA_BYTES} bytes, got {len(data)}')

    if _USE_NATIVE:
        return _ecc_native.encode(bytes(data))

    cw = bytearray(CODEWORD_BYTES)

    # 1) 데이터 비트 배치
    for d in range(DATA_BITS):
        bit = _get_bit(data, d)
        if bit:
            _set_bit(cw, DATA_POSITIONS[d] - 1, 1)

    # 2) 패리티 비트 계산
    for k in range(PARITY_BITS):
        parity = 0
        for byte_idx, mask in _PARITY_MASKS[k]:
            parity ^= _POPCOUNT[cw[byte_idx] & mask] & 1
        if parity:
            parity_pos = (1 << k) - 1  # 0-based
            _set_bit(cw, parity_pos, 1)

    return bytes(cw)


def decode(codeword: bytes | bytearray) -> tuple[bytes, bool, bool]:
    """Hamming 디코딩: 130바이트 → (128바이트 데이터, corrected, uncorrectable)."""
    if len(codeword) != CODEWORD_BYTES:
        raise ValueError(
            f'Hamming decode: codeword must be {CODEWORD_BYTES} bytes, got {len(codeword)}'
        )

    if _USE_NATIVE:
        data, status = _ecc_native.decode(bytes(codeword))
        return data, (status == 1), (status == 2)

    cw = bytearray(codeword)

    # 1) 11비트 신드롬 계산
    syndrome = 0
    for k in range(PARITY_BITS):
        parity = 0
        for byte_idx, mask in _PARITY_MASKS[k]:
            parity ^= _POPCOUNT[cw[byte_idx] & mask] & 1
        if parity:
            syndrome |= (1 << k)

    corrected = False
    uncorrectable = False

    # 2) 오류 수정
    if syndrome != 0:
        if 1 <= syndrome <= CODEWORD_BITS:
            _flip_bit(cw, syndrome - 1)
            corrected = True
        else:
            uncorrectable = True

    # 3) 데이터 비트 추출
    data = bytearray(DATA_BYTES)
    for d in range(DATA_BITS):
        bit = _get_bit(cw, DATA_POSITIONS[d] - 1)
        if bit:
            _set_bit(data, d, 1)

    return bytes(data), corrected, uncorrectable


# --- 배치 API (C 가속 시 ctypes 호출 횟수 최소화) ---

def encode_batch(data_axes: list[bytes]) -> list[bytes]:
    """배치 Hamming 인코딩: N × 128B → N × 130B."""
    if _USE_NATIVE:
        return _ecc_native.encode_batch(data_axes)
    return [encode(ax) for ax in data_axes]


def decode_batch(cw_axes: list[bytes]) -> list[tuple[bytes, bool, bool]]:
    """배치 Hamming 디코딩: N × 130B → N × (data, corrected, uncorrectable)."""
    if _USE_NATIVE:
        results = _ecc_native.decode_batch(cw_axes)
        return [(data, status == 1, status == 2) for data, status in results]
    return [decode(ax) for ax in cw_axes]

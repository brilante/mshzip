'Reed-Solomon XOR 패리티 — 축 단위 복구'
from __future__ import annotations

# C 네이티브 가속
try:
    from . import _ecc_native
    _USE_NATIVE = _ecc_native.is_available()
except ImportError:
    _USE_NATIVE = False

DEFAULT_GROUP_SIZE = 8


def xor_bytes(a: bytes | bytearray, b: bytes | bytearray) -> bytes:
    """두 바이트열 XOR."""
    length = max(len(a), len(b))
    result = bytearray(length)
    for i in range(length):
        result[i] = (a[i] if i < len(a) else 0) ^ (b[i] if i < len(b) else 0)
    return bytes(result)


def generate_parity(
    axes: list[bytes], group_size: int = DEFAULT_GROUP_SIZE
) -> list[bytes]:
    """RS 패리티축 생성."""
    parity_axes: list[bytes] = []
    axis_len = len(axes[0]) if axes else 0

    g = 0
    while g * group_size < len(axes):
        start = g * group_size
        end = min(start + group_size, len(axes))
        group_count = end - start

        if _USE_NATIVE and axis_len > 0:
            concat = b''.join(axes[start:end])
            parity = _ecc_native.xor_parity(concat, group_count, axis_len)
        else:
            parity = bytearray(axis_len)
            for i in range(start, end):
                parity = bytearray(xor_bytes(parity, axes[i]))
            parity = bytes(parity)

        parity_axes.append(parity)
        g += 1

    return parity_axes


def recover(
    data_axes: list[bytes],
    parity_axes: list[bytes],
    damaged: list[bool],
    group_size: int = DEFAULT_GROUP_SIZE,
) -> list[bytes]:
    """RS 복구: 손상된 축 복원."""
    recovered = list(data_axes)

    g = 0
    while g * group_size < len(data_axes):
        start = g * group_size
        end = min(start + group_size, len(data_axes))
        failed = [i for i in range(start, end) if damaged[i]]

        if not failed:
            g += 1
            continue
        if len(failed) > 1:
            raise ValueError(
                f'RS 복구 불가: 그룹 {g}에서 {len(failed)}축 동시 손상'
            )

        # 1축 복구: P XOR 나머지 정상축들 = 손상축
        failed_idx = failed[0]
        restored = bytearray(parity_axes[g])
        for i in range(start, end):
            if i != failed_idx:
                restored = bytearray(xor_bytes(restored, data_axes[i]))
        recovered[failed_idx] = bytes(restored)
        g += 1

    return recovered

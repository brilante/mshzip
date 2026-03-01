'mshzip CLI - pack/unpack/info/multi commands'
from __future__ import annotations

import argparse
import os
import struct
import sys
import time
from pathlib import Path

from .constants import (
    MAGIC, CODEC_ID_TO_NAME, Flag, FRAME_HEADER_SIZE,
    DEFAULT_CHUNK_SIZE, DEFAULT_FRAME_LIMIT, DEFAULT_CODEC,
    MIN_CHUNK_SIZE, MAX_CHUNK_SIZE,
)
from .stream import pack_stream, unpack_stream


def main() -> None:
    'CLI entry point.'
    parser = argparse.ArgumentParser(
        prog='mshzip',
        description='Fixed-chunk dedup + entropy compression',
    )
    subparsers = parser.add_subparsers(dest='command')

    # pack
    p_pack = subparsers.add_parser('pack', help='compress')
    p_pack.add_argument('-i', required=True, help='input file (- = stdin)')
    p_pack.add_argument('-o', required=True, help='output file (- = stdout)')
    p_pack.add_argument('--chunk', default=str(DEFAULT_CHUNK_SIZE),
                        help='chunk size in bytes or auto (default: auto)')
    p_pack.add_argument('--frame', type=int, default=DEFAULT_FRAME_LIMIT)
    p_pack.add_argument('--codec', default=DEFAULT_CODEC)
    p_pack.add_argument('--crc', action='store_true')
    p_pack.add_argument('--verbose', action='store_true')

    # unpack
    p_unpack = subparsers.add_parser('unpack', help='decompress')
    p_unpack.add_argument('-i', required=True)
    p_unpack.add_argument('-o', required=True)

    # info
    p_info = subparsers.add_parser('info', help='file info')
    p_info.add_argument('-i', required=True)

    # multi
    p_multi = subparsers.add_parser('multi', help='multi-file parallel')
    p_multi.add_argument('subcmd', choices=['pack', 'unpack'])
    p_multi.add_argument('files', nargs='+')
    p_multi.add_argument('--out-dir', required=True)
    p_multi.add_argument('--workers', type=int, default=os.cpu_count())
    p_multi.add_argument('--chunk', default=str(DEFAULT_CHUNK_SIZE))
    p_multi.add_argument('--frame', type=int, default=DEFAULT_FRAME_LIMIT)
    p_multi.add_argument('--codec', default=DEFAULT_CODEC)
    p_multi.add_argument('--crc', action='store_true')
    p_multi.add_argument('--verbose', action='store_true')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == 'pack':
        _handle_pack(args)
    elif args.command == 'unpack':
        _handle_unpack(args)
    elif args.command == 'info':
        _handle_info(args)
    elif args.command == 'multi':
        _handle_multi(args)


def _handle_pack(args) -> None:
    'Stream-based pack.'
    raw_chunk = args.chunk
    chunk_size = raw_chunk if raw_chunk == 'auto' else int(raw_chunk)

    if chunk_size != 'auto':
        if not (MIN_CHUNK_SIZE <= chunk_size <= MAX_CHUNK_SIZE):
            print(
                f'Error: --chunk range: {MIN_CHUNK_SIZE}~{MAX_CHUNK_SIZE} or auto',
                file=sys.stderr,
            )
            sys.exit(2)

    start_time = time.monotonic()

    inp = sys.stdin.buffer if args.i == '-' else open(args.i, 'rb')
    out = sys.stdout.buffer if args.o == '-' else open(args.o, 'wb')

    try:
        stats = pack_stream(
            inp, out,
            chunk_size=chunk_size,
            frame_limit=args.frame,
            codec=args.codec,
            crc=args.crc,
        )
    finally:
        if args.i != '-':
            inp.close()
        if args.o != '-':
            out.close()

    elapsed = (time.monotonic() - start_time) * 1000
    orig_size = stats['bytes_in']
    comp_size = stats['bytes_out']
    actual_chunk = stats.get('chunk_size', chunk_size)

    if args.verbose or args.o != '-':
        ratio = (
            f'{(1 - comp_size / orig_size) * 100:.1f}'
            if orig_size > 0 else '0.0'
        )
        speed = (
            f'{(orig_size / 1024 / 1024) / (elapsed / 1000):.1f}'
            if orig_size > 0 and elapsed > 0 else '0'
        )
        chunk_label = (
            f'{actual_chunk}B (auto-detected)' if chunk_size == 'auto'
            else f'{actual_chunk}B'
        )
        print('[pack done]', file=sys.stderr)
        print(f'  Original: {_fmt(orig_size)}', file=sys.stderr)
        print(f'  Compressed: {_fmt(comp_size)} ({ratio}% reduction)', file=sys.stderr)
        print(
            f'  Chunk: {chunk_label}, '
            f'Dict: {stats["dict_size"]} unique chunks',
            file=sys.stderr,
        )
        print(f'  Codec: {args.codec}', file=sys.stderr)
        print(f'  Time: {elapsed:.0f}ms ({speed} MB/s)', file=sys.stderr)


def _handle_unpack(args) -> None:
    'Stream-based unpack.'
    start_time = time.monotonic()

    inp = sys.stdin.buffer if args.i == '-' else open(args.i, 'rb')
    out = sys.stdout.buffer if args.o == '-' else open(args.o, 'wb')

    try:
        stats = unpack_stream(inp, out)
    finally:
        if args.i != '-':
            inp.close()
        if args.o != '-':
            out.close()

    elapsed = (time.monotonic() - start_time) * 1000
    comp_size = stats['bytes_in']
    orig_size = stats['bytes_out']

    if args.o != '-':
        speed = (
            f'{(orig_size / 1024 / 1024) / (elapsed / 1000):.1f}'
            if orig_size > 0 and elapsed > 0 else '0'
        )
        print('[unpack done]', file=sys.stderr)
        print(f'  Compressed: {_fmt(comp_size)}', file=sys.stderr)
        print(f'  Restored: {_fmt(orig_size)}', file=sys.stderr)
        print(f'  Time: {elapsed:.0f}ms ({speed} MB/s)', file=sys.stderr)


def _handle_info(args) -> None:
    'Print MSH file frame info.'
    data = Path(args.i).read_bytes()
    offset = 0
    frame_no = 0
    total_orig = 0

    print(f'File: {args.i} ({_fmt(len(data))})')
    print('\u2500' * 60)

    while offset < len(data):
        if offset + FRAME_HEADER_SIZE + 4 > len(data):
            print(f'Frame {frame_no}: insufficient data at offset {offset}')
            break

        magic = data[offset:offset + 4]
        if magic != MAGIC:
            print(f'Frame {frame_no}: invalid magic number at offset {offset}')
            break

        off = offset + 4
        version = struct.unpack_from('<H', data, off)[0]; off += 2
        flags = struct.unpack_from('<H', data, off)[0]; off += 2
        chunk_size = struct.unpack_from('<I', data, off)[0]; off += 4
        codec_id = data[off]; off += 1
        off += 3
        orig_lo = struct.unpack_from('<I', data, off)[0]; off += 4
        orig_hi = struct.unpack_from('<I', data, off)[0]; off += 4
        orig_bytes = orig_hi * 0x100000000 + orig_lo
        dict_entries = struct.unpack_from('<I', data, off)[0]; off += 4
        seq_count = struct.unpack_from('<I', data, off)[0]; off += 4
        payload_size = struct.unpack_from('<I', data, off)[0]; off += 4

        has_crc = (flags & Flag.CRC32) != 0
        frame_size = (
            FRAME_HEADER_SIZE + 4 + payload_size + (4 if has_crc else 0)
        )

        codec_name = CODEC_ID_TO_NAME.get(codec_id, str(codec_id))

        print(f'Frame #{frame_no}:')
        print(f'  Version: {version}, Codec: {codec_name}')
        print(f'  Chunk size: {chunk_size}B')
        print(f'  Original bytes: {_fmt(orig_bytes)}')
        print(f'  New dict entries: {dict_entries}')
        print(f'  Sequence count: {seq_count}')
        print(f'  Payload: {_fmt(payload_size)}')
        print(f'  CRC32: {"yes" if has_crc else "no"}')
        print(f'  Frame size: {_fmt(frame_size)}')

        total_orig += orig_bytes
        offset += frame_size
        frame_no += 1

    print('\u2500' * 60)
    print(f'Total {frame_no} frames, original total: {_fmt(total_orig)}')
    print(f'Compressed file size: {_fmt(len(data))}')
    if total_orig > 0:
        print(f'Compression ratio: {(1 - len(data) / total_orig) * 100:.1f}%')


def _handle_multi(args) -> None:
    'Multi-file parallel processing.'
    from .parallel import WorkerPool, Task

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    tasks = []
    for f in args.files:
        basename = Path(f).name
        if args.subcmd == 'pack':
            out_name = basename + '.msh'
        else:
            out_name = (
                basename.removesuffix('.msh')
                if basename.endswith('.msh')
                else basename + '.bin'
            )
        raw_cs = args.chunk
        cs_val = raw_cs if raw_cs == 'auto' else int(raw_cs)
        tasks.append(Task(
            type=args.subcmd,
            input_path=str(Path(f).resolve()),
            output_path=str(out_dir.resolve() / out_name),
            chunk_size=cs_val,
            frame_limit=args.frame,
            codec=args.codec,
            crc=args.crc,
        ))

    pool = WorkerPool(args.workers)
    pool.init()

    start_time = time.monotonic()
    results = pool.run_all(tasks)
    pool.shutdown()

    elapsed = (time.monotonic() - start_time) * 1000
    total_in = total_out = 0
    pass_count = fail_count = 0

    print(
        f'\n[multi {args.subcmd} done] '
        f'{len(args.files)} files, {args.workers} workers\n',
        file=sys.stderr,
    )

    for i, r in enumerate(results):
        fname = Path(args.files[i]).name
        if r.success:
            pass_count += 1
            total_in += r.input_size
            total_out += r.output_size
            if args.verbose:
                print(
                    f'  OK {fname}: {_fmt(r.input_size)} -> '
                    f'{_fmt(r.output_size)} ({r.elapsed_ms:.0f}ms)',
                    file=sys.stderr,
                )
        else:
            fail_count += 1
            print(f'  FAIL {fname}: {r.error}', file=sys.stderr)

    speed = (
        f'{(total_in / 1024 / 1024) / (elapsed / 1000):.1f}'
        if total_in > 0 and elapsed > 0 else '0'
    )
    print(
        f'\n  Total: {_fmt(total_in)} -> {_fmt(total_out)}',
        file=sys.stderr,
    )
    print(f'  Success: {pass_count}, Failed: {fail_count}', file=sys.stderr)
    print(f'  Time: {elapsed:.0f}ms ({speed} MB/s)', file=sys.stderr)


def _fmt(n: int) -> str:
    'Format byte count for human readability.'
    if n < 1024:
        return f'{n}B'
    if n < 1024 * 1024:
        return f'{n / 1024:.1f}KB'
    if n < 1024 * 1024 * 1024:
        return f'{n / 1024 / 1024:.1f}MB'
    return f'{n / 1024 / 1024 / 1024:.2f}GB'


if __name__ == '__main__':
    main()

'DictStore 기능 테스트 — 영구 딕셔너리, cross-file dedup, fallback'
from __future__ import annotations

import os
import tempfile
import shutil

import pytest
from mshzip import Packer, Unpacker, DictStore
from mshzip.constants import (
    MSHD_HEADER_SIZE, MSHD_MAGIC, MSHD_VERSION, MSHD_HASH_SIZE,
    Flag,
)


@pytest.fixture
def tmp_dir():
    d = tempfile.mkdtemp(prefix='mshzip-test-dict-')
    yield d
    shutil.rmtree(d, ignore_errors=True)


def fresh_store(tmp_dir, max_dict_size=None):
    sub = tempfile.mkdtemp(dir=tmp_dir)
    return DictStore(dict_dir=sub, max_dict_size=max_dict_size or 1024 * 1024 * 1024)


# ═══════════════════════════════════════════════════
# Cat 1: DictStore 단위 테스트
# ═══════════════════════════════════════════════════
class TestDictStoreUnit:
    def test_init_creates_file(self, tmp_dir):
        store = fresh_store(tmp_dir)
        fp = store.init(128)
        assert os.path.exists(fp)
        assert os.path.getsize(fp) == MSHD_HEADER_SIZE

    def test_init_header(self, tmp_dir):
        store = fresh_store(tmp_dir)
        fp = store.init(256)
        with open(fp, 'rb') as f:
            data = f.read()
        assert data[:4] == MSHD_MAGIC
        assert int.from_bytes(data[4:6], 'little') == MSHD_VERSION
        assert int.from_bytes(data[6:10], 'little') == 256
        assert int.from_bytes(data[10:14], 'little') == 0

    def test_load_empty(self, tmp_dir):
        store = fresh_store(tmp_dir)
        store.init(128)
        loaded = store.load(128)
        assert loaded['entry_count'] == 0
        assert len(loaded['dict_chunks']) == 0

    def test_load_nonexistent(self, tmp_dir):
        store = fresh_store(tmp_dir)
        loaded = store.load(512)
        assert loaded['entry_count'] == 0

    def test_save_load_roundtrip(self, tmp_dir):
        store = fresh_store(tmp_dir)
        data = b'A' * 32 + b'B' * 32 + b'C' * 32 + b'D' * 32
        p = Packer(chunk_size=32, use_dict=True, dict_store=store)
        p.pack(data)
        loaded = store.load(32)
        assert loaded['entry_count'] > 0
        assert len(loaded['dict_chunks']) == loaded['entry_count']

    def test_append_only(self, tmp_dir):
        store = fresh_store(tmp_dir)
        d1 = b'ABCD' * 32
        p1 = Packer(chunk_size=32, use_dict=True, dict_store=store)
        p1.pack(d1)
        c1 = store.load(32)['entry_count']

        d2 = b'EFGH' * 32
        p2 = Packer(chunk_size=32, use_dict=True, dict_store=store)
        p2.pack(d2)
        c2 = store.load(32)['entry_count']
        assert c2 >= c1

    def test_is_over_limit(self, tmp_dir):
        store = fresh_store(tmp_dir, max_dict_size=1)
        data = b'X' * 256
        p = Packer(chunk_size=32, use_dict=True, dict_store=store)
        p.pack(data)
        assert store.is_over_limit(32) is True

    def test_info_fields(self, tmp_dir):
        store = fresh_store(tmp_dir)
        store.init(128)
        info = store.info(128)
        assert info['exists'] is True
        assert info['entry_count'] == 0
        assert info['chunk_size'] == 128

    def test_info_nonexistent(self, tmp_dir):
        store = fresh_store(tmp_dir)
        info = store.info(999)
        assert info['exists'] is False


# ═══════════════════════════════════════════════════
# Cat 2: Dict pack + unpack round-trip
# ═══════════════════════════════════════════════════
class TestDictRoundtrip:
    DATA_1KB = b'ABCDEFGHIJKLMNOP' * 64

    @pytest.mark.parametrize('chunk_size', [32, 64, 128, 256])
    def test_1st_pack_roundtrip(self, tmp_dir, chunk_size):
        store = fresh_store(tmp_dir)
        data = self.DATA_1KB
        p = Packer(chunk_size=chunk_size, use_dict=True, dict_store=store)
        packed = p.pack(data)
        u = Unpacker(dict_store=store)
        restored = u.unpack(packed)
        assert restored == data

    @pytest.mark.parametrize('chunk_size', [32, 64, 128, 256])
    def test_2nd_pack_smaller(self, tmp_dir, chunk_size):
        store = fresh_store(tmp_dir)
        data = self.DATA_1KB
        p1 = Packer(chunk_size=chunk_size, use_dict=True, dict_store=store)
        packed1 = p1.pack(data)

        p2 = Packer(chunk_size=chunk_size, use_dict=True, dict_store=store)
        packed2 = p2.pack(data)

        u = Unpacker(dict_store=store)
        restored = u.unpack(packed2)
        assert restored == data
        assert len(packed2) <= len(packed1)

    def test_empty_input(self, tmp_dir):
        store = fresh_store(tmp_dir)
        p = Packer(chunk_size=128, use_dict=True, dict_store=store)
        packed = p.pack(b'')
        u = Unpacker(dict_store=store)
        assert u.unpack(packed) == b''

    def test_1byte_input(self, tmp_dir):
        store = fresh_store(tmp_dir)
        data = b'\x42'
        p = Packer(chunk_size=128, use_dict=True, dict_store=store)
        packed = p.pack(data)
        u = Unpacker(dict_store=store)
        assert u.unpack(packed) == data


# ═══════════════════════════════════════════════════
# Cat 3: Cross-file dedup
# ═══════════════════════════════════════════════════
class TestCrossFileDedup:
    def test_same_data_cross(self, tmp_dir):
        store = fresh_store(tmp_dir)
        data = os.urandom(1024) * 4  # 4KB, 중복 패턴
        p1 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        packed1 = p1.pack(data)

        p2 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        packed2 = p2.pack(data)

        u = Unpacker(dict_store=store)
        assert u.unpack(packed2) == data
        assert len(packed2) < len(packed1)

    def test_partial_overlap(self, tmp_dir):
        store = fresh_store(tmp_dir)
        block_a = b'A' * 128
        block_b = b'B' * 128
        block_c = b'C' * 128
        data1 = block_a + block_b + block_a + block_b
        data2 = block_a + block_c + block_a + block_c

        p1 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        p1.pack(data1)

        p2 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        packed2 = p2.pack(data2)

        # no-dict baseline
        p_flat = Packer(chunk_size=128)
        flat_size = len(p_flat.pack(data2))

        u = Unpacker(dict_store=store)
        assert u.unpack(packed2) == data2
        assert len(packed2) <= flat_size

    def test_no_overlap_random(self, tmp_dir):
        store = fresh_store(tmp_dir)
        data1 = os.urandom(1024)
        data2 = os.urandom(1024)

        p1 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        p1.pack(data1)

        p2 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        packed2 = p2.pack(data2)

        u = Unpacker(dict_store=store)
        assert u.unpack(packed2) == data2

    def test_three_files_accumulate(self, tmp_dir):
        store = fresh_store(tmp_dir)
        # 충분히 큰 데이터로 baseDictCount 오버헤드(4B)보다 절감이 큰 경우 테스트
        block_a = b'A' * 128
        block_b = b'B' * 128
        pattern = (block_a + block_b) * 32  # 8KB, 중복 패턴

        d1 = pattern
        d2 = pattern
        d3 = pattern

        sizes = []
        for d in [d1, d2, d3]:
            p = Packer(chunk_size=128, use_dict=True, dict_store=store)
            packed = p.pack(d)
            sizes.append(len(packed))
            u = Unpacker(dict_store=store)
            assert u.unpack(packed) == d

        # 2nd and 3rd should be smaller or equal to 1st
        assert sizes[1] <= sizes[0]
        assert sizes[2] <= sizes[0]


# ═══════════════════════════════════════════════════
# Cat 4: Fallback (maxDictSize)
# ═══════════════════════════════════════════════════
class TestFallback:
    def test_fallback_self_contained(self, tmp_dir):
        # 1st pack with big store
        big_store = fresh_store(tmp_dir)
        data = b'HELLO' * 200
        p1 = Packer(chunk_size=128, use_dict=True, dict_store=big_store)
        p1.pack(data)

        # 2nd pack with tiny maxDictSize → fallback
        tiny_store = fresh_store(tmp_dir, max_dict_size=1)
        # copy dict file to tiny_store dir
        src_path = big_store.path(128)
        dst_path = tiny_store.path(128)
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        if os.path.exists(src_path):
            import shutil as sh
            sh.copy2(src_path, dst_path)

        p2 = Packer(chunk_size=128, use_dict=True, dict_store=tiny_store)
        packed = p2.pack(data)

        # fallback → self-contained, no dict needed for unpack
        u = Unpacker()
        assert u.unpack(packed) == data

    def test_no_dict_flag_on_fallback(self, tmp_dir):
        store = fresh_store(tmp_dir, max_dict_size=1)
        data = b'Z' * 512
        # pack twice
        p1 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        p1.pack(data)

        import struct
        tiny_store2 = fresh_store(tmp_dir, max_dict_size=1)
        src = store.path(128)
        dst = tiny_store2.path(128)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.exists(src):
            import shutil as sh
            sh.copy2(src, dst)

        p2 = Packer(chunk_size=128, use_dict=True, dict_store=tiny_store2)
        packed = p2.pack(data)
        # check flags: EXTERNAL_DICT should NOT be set
        flags = struct.unpack_from('<H', packed, 6)[0]
        assert (flags & Flag.EXTERNAL_DICT) == 0


# ═══════════════════════════════════════════════════
# Cat 5: Error handling
# ═══════════════════════════════════════════════════
class TestDictErrors:
    def test_external_dict_unpack_without_dict(self, tmp_dir):
        store = fresh_store(tmp_dir)
        data = b'DATA' * 256

        p1 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        p1.pack(data)

        p2 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        packed2 = p2.pack(data)

        # unpack without dict → error
        with pytest.raises(Exception):
            Unpacker().unpack(packed2)

    def test_dict_entry_mismatch(self, tmp_dir):
        store = fresh_store(tmp_dir)
        data = b'A' * 1024

        p1 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        p1.pack(data)

        p2 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        packed2 = p2.pack(data)

        # empty store → entry count mismatch
        empty_store = fresh_store(tmp_dir)
        empty_store.init(128)
        with pytest.raises(Exception):
            Unpacker(dict_store=empty_store).unpack(packed2)

    def test_chunk_size_isolation(self, tmp_dir):
        store = fresh_store(tmp_dir)
        data = b'X' * 256
        Packer(chunk_size=64, use_dict=True, dict_store=store).pack(data)

        loaded128 = store.load(128)
        assert loaded128['entry_count'] == 0

        loaded64 = store.load(64)
        assert loaded64['entry_count'] > 0


# ═══════════════════════════════════════════════════
# Cat 6: CRC + EXTERNAL_DICT combo
# ═══════════════════════════════════════════════════
class TestCrcDict:
    @pytest.mark.parametrize('chunk_size', [64, 128, 256])
    def test_crc_with_dict(self, tmp_dir, chunk_size):
        store = fresh_store(tmp_dir)
        data = b'CRCTEST' * 150

        p1 = Packer(chunk_size=chunk_size, crc=True, use_dict=True, dict_store=store)
        p1.pack(data)

        p2 = Packer(chunk_size=chunk_size, crc=True, use_dict=True, dict_store=store)
        packed = p2.pack(data)

        u = Unpacker(dict_store=store)
        assert u.unpack(packed) == data


# ═══════════════════════════════════════════════════
# Cat 7: HierDedup + EXTERNAL_DICT combo
# ═══════════════════════════════════════════════════
class TestHierDict:
    @pytest.mark.parametrize('cs,scs', [(128, 64), (128, 32), (256, 128), (256, 64)])
    def test_hier_with_dict(self, tmp_dir, cs, scs):
        store = fresh_store(tmp_dir)
        data = b'HIERTEST' * 500

        p1 = Packer(chunk_size=cs, hier_dedup=True, sub_chunk_size=scs,
                     use_dict=True, dict_store=store)
        p1.pack(data)

        p2 = Packer(chunk_size=cs, hier_dedup=True, sub_chunk_size=scs,
                     use_dict=True, dict_store=store)
        packed = p2.pack(data)

        u = Unpacker(dict_store=store)
        assert u.unpack(packed) == data


# ═══════════════════════════════════════════════════
# Cat 8: 다양한 chunk sizes
# ═══════════════════════════════════════════════════
class TestChunkVariety:
    @pytest.mark.parametrize('chunk_size', [32, 64, 128, 256, 512, 1024])
    def test_dict_cross_various_chunks(self, tmp_dir, chunk_size):
        store = fresh_store(tmp_dir)
        data = b'ABCDEFGHIJKLMNOP' * 256  # 4KB

        p1 = Packer(chunk_size=chunk_size, use_dict=True, dict_store=store)
        packed1 = p1.pack(data)

        p2 = Packer(chunk_size=chunk_size, use_dict=True, dict_store=store)
        packed2 = p2.pack(data)

        u = Unpacker(dict_store=store)
        assert u.unpack(packed2) == data
        assert len(packed2) <= len(packed1)


# ═══════════════════════════════════════════════════
# Cat 9: 다양한 데이터 크기
# ═══════════════════════════════════════════════════
class TestSizeVariety:
    @pytest.mark.parametrize('size', [64, 256, 1024, 4096, 16384, 65536])
    def test_dict_cross_various_sizes(self, tmp_dir, size):
        store = fresh_store(tmp_dir)
        data = (b'X' * 16 + b'Y' * 16) * (size // 32)

        p1 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        packed1 = p1.pack(data)

        p2 = Packer(chunk_size=128, use_dict=True, dict_store=store)
        packed2 = p2.pack(data)

        u = Unpacker(dict_store=store)
        assert u.unpack(packed2) == data
        assert len(packed2) <= len(packed1)

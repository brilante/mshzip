/**
 * Hamming(1035, 1024) + RS XOR — C 네이티브 라이브러리
 * mshzip v2.1 Python ctypes 가속용
 *
 * API:
 *   hamming_encode(data, codeword)           — 128B → 130B
 *   hamming_decode(codeword, data)           — 130B → 128B, ret 0/1/2
 *   hamming_encode_batch(data, cw, count)    — N×128B → N×130B (OpenMP)
 *   hamming_decode_batch(cw, data, r, count) — N×130B → N×128B (OpenMP)
 *   rs_xor_parity(axes, count, size, parity) — XOR 패리티
 */
#include <string.h>
#include <stdint.h>

#ifdef _OPENMP
#include <omp.h>
#endif

#ifdef _WIN32
#define EXPORT __declspec(dllexport)
#else
#define EXPORT __attribute__((visibility("default")))
#endif

#define DATA_BITS      1024
#define PARITY_BITS    11
#define CODEWORD_BITS  1035
#define CODEWORD_BYTES 130
#define DATA_BYTES     128

/* 정적 테이블 */
static int DATA_POSITIONS[DATA_BITS];
static volatile int data_positions_inited = 0;
static uint8_t POPCOUNT[256];
static uint8_t PARITY_BYTE_MASK[PARITY_BITS][CODEWORD_BYTES];

static void init_tables(void) {
  if (data_positions_inited) return;

#ifdef _OPENMP
  #pragma omp critical(init_tables_lock)
  {
    if (!data_positions_inited) {
#endif

  /* popcount */
  for (int i = 0; i < 256; i++) {
    int c = 0, v = i;
    while (v) { c += v & 1; v >>= 1; }
    POPCOUNT[i] = (uint8_t)c;
  }

  /* data positions (2의 거듭제곱 제외) */
  int idx = 0;
  for (int pos = 1; pos <= CODEWORD_BITS; pos++) {
    if ((pos & (pos - 1)) != 0) {
      DATA_POSITIONS[idx++] = pos;
    }
  }

  /* parity masks */
  memset(PARITY_BYTE_MASK, 0, sizeof(PARITY_BYTE_MASK));
  for (int k = 0; k < PARITY_BITS; k++) {
    int parity_pos = 1 << k;
    for (int pos = 1; pos <= CODEWORD_BITS; pos++) {
      if (pos & parity_pos) {
        int bit_idx = pos - 1;
        int byte_idx = bit_idx >> 3;
        int bit_in_byte = 7 - (bit_idx & 7);
        PARITY_BYTE_MASK[k][byte_idx] |= (1 << bit_in_byte);
      }
    }
  }

  data_positions_inited = 1;

#ifdef _OPENMP
    }
  }
#endif
}

static inline int get_bit(const uint8_t *buf, int bit_idx) {
  return (buf[bit_idx >> 3] >> (7 - (bit_idx & 7))) & 1;
}

static inline void set_bit(uint8_t *buf, int bit_idx) {
  buf[bit_idx >> 3] |= (1 << (7 - (bit_idx & 7)));
}

static inline void flip_bit(uint8_t *buf, int bit_idx) {
  buf[bit_idx >> 3] ^= (1 << (7 - (bit_idx & 7)));
}

/* --- 내부 함수 (init 없음, 병렬 안전) --- */

static void hamming_encode_inner(const uint8_t *data, uint8_t *codeword) {
  memset(codeword, 0, CODEWORD_BYTES);

  /* 데이터 비트 배치 */
  for (int d = 0; d < DATA_BITS; d++) {
    if (get_bit(data, d)) {
      set_bit(codeword, DATA_POSITIONS[d] - 1);
    }
  }

  /* 패리티 비트 계산 */
  for (int k = 0; k < PARITY_BITS; k++) {
    int parity = 0;
    for (int b = 0; b < CODEWORD_BYTES; b++) {
      uint8_t masked = codeword[b] & PARITY_BYTE_MASK[k][b];
      if (masked) parity ^= POPCOUNT[masked] & 1;
    }
    if (parity) {
      set_bit(codeword, (1 << k) - 1);
    }
  }
}

static int hamming_decode_inner(const uint8_t *codeword, uint8_t *data) {
  uint8_t cw[CODEWORD_BYTES];
  memcpy(cw, codeword, CODEWORD_BYTES);

  /* 신드롬 */
  int syndrome = 0;
  for (int k = 0; k < PARITY_BITS; k++) {
    int parity = 0;
    for (int b = 0; b < CODEWORD_BYTES; b++) {
      uint8_t masked = cw[b] & PARITY_BYTE_MASK[k][b];
      if (masked) parity ^= POPCOUNT[masked] & 1;
    }
    if (parity) syndrome |= (1 << k);
  }

  int result = 0;
  if (syndrome != 0) {
    if (syndrome >= 1 && syndrome <= CODEWORD_BITS) {
      flip_bit(cw, syndrome - 1);
      result = 1;  /* corrected */
    } else {
      result = 2;  /* uncorrectable */
    }
  }

  /* 데이터 추출 */
  memset(data, 0, DATA_BYTES);
  for (int d = 0; d < DATA_BITS; d++) {
    if (get_bit(cw, DATA_POSITIONS[d] - 1)) {
      set_bit(data, d);
    }
  }

  return result;
}

/* --- 단건 API --- */

EXPORT void hamming_encode(const uint8_t *data, uint8_t *codeword) {
  init_tables();
  hamming_encode_inner(data, codeword);
}

EXPORT int hamming_decode(const uint8_t *codeword, uint8_t *data) {
  init_tables();
  return hamming_decode_inner(codeword, data);
}

/* --- 배치 API (OpenMP 병렬화) --- */

EXPORT void hamming_encode_batch(
    const uint8_t *data, uint8_t *codewords, int count) {
  int i;
  if (!data || !codewords || count <= 0) return;
  init_tables();
  #ifdef _OPENMP
  #pragma omp parallel for schedule(static) if(count >= 4)
  #endif
  for (i = 0; i < count; i++) {
    hamming_encode_inner(data + i * DATA_BYTES, codewords + i * CODEWORD_BYTES);
  }
}

EXPORT int hamming_decode_batch(
    const uint8_t *codewords, uint8_t *data, int *results, int count) {
  int i, max_result = 0;
  if (!codewords || !data || !results || count <= 0) return 0;
  init_tables();
  #ifdef _OPENMP
  #pragma omp parallel for schedule(static) if(count >= 4)
  #endif
  for (i = 0; i < count; i++) {
    results[i] = hamming_decode_inner(
      codewords + i * CODEWORD_BYTES,
      data + i * DATA_BYTES
    );
  }
  for (i = 0; i < count; i++) {
    if (results[i] > max_result) max_result = results[i];
  }
  return max_result;
}

/* --- RS XOR 패리티 --- */

EXPORT void rs_xor_parity(
    const uint8_t *axes, int count, int axis_size, uint8_t *parity) {
  if (!axes || !parity || count <= 0 || axis_size <= 0) return;
  memset(parity, 0, (size_t)axis_size);
  for (int i = 0; i < count; i++) {
    const uint8_t *ax = axes + i * axis_size;
    for (int j = 0; j < axis_size; j++) {
      parity[j] ^= ax[j];
    }
  }
}

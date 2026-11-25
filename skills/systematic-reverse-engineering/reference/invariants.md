# Invariants & Fingerprints Reference

Consult this reference when fingerprinting unknown compression streams, PRNGs, hashes, or CPython binary formats.

## Compression & Container Magic Bytes
- **Zlib (RFC-1950)**: `0x78 0x01` (no/low), `0x78 0x5E` (fast), `0x78 0x9C` (default), `0x78 0xDA` (best); `(cmf * 256 + flg) % 31 == 0`.
- **XZ / LZMA2**: `\xfd7zXZ\x00`
- **LZMA Alone**: `0x5D 0x00 0x00`
- **Bzip2**: `BZh` (`0x42 0x5A 0x68`)
- **Gzip**: `0x1F 0x8B`
- **ZIP / PyInstaller**: `PK\x03\x04` / `MEI\x0c\x0b\x0a\x0b\x0e`
- **ELF / PE**: `\x7fELF` / `MZ`

## PRNG & Hash Constants
- **32-bit LCG (GLIBC / ANSI C)**: `state = (state * 1103515245 + 12345) & 0xFFFFFFFF`
- **32-bit LCG (MSVCRT)**: `state = (state * 214013 + 2531011) & 0xFFFFFFFF`
- **64-bit LCG (MMIX / PCG)**: `state = (state * 6364136223846793005 + 1442695040888963407) & 0xFFFFFFFFFFFFFFFF`
- **Golden Ratio / XXHash / Murmur Mixers**: `2654435761`, `2246822519`, `3266489917`, `668265263`, `0x9E3779B97F4A7C15`
- **FNV-1a 32-bit**: offset `2166136261`, prime `16777619`
- **Xorshift64**: shifts `(13, 7, 17)`

## CPython Marshal & Bytecode Invariants
- **Marshal Object Tags**:
  - `0`/`N`: `None`, `F`/`T`: `bool`, `i`/`I`/`l`: `int32`/`int64`/`bigint` (15-bit digits)
  - `f`/`g`: `float_str`/`double`, `s`: `bytes`, `u`/`a`/`A`/`t`/`z`/`Z`: `str`
  - `(` / `)`: `tuple` (`uint32` / `uint8` len), `[`: `list`, `{`: `dict`, `<`/`>`: `set`/`frozenset`
  - `:`: `slice`, `r`: `TYPE_REF` (index into `refs` table for objects with `0x80` flag bit), `c`: `CodeType`
- **Python 3.14 Jump Formula**:
  - Relative forward jumps (`JUMP_FORWARD`, `POP_JUMP_IF_*`, `FOR_ITER`) compute target as `next_instruction_byte_offset + arg * 2`.
  - Backward jumps (`JUMP_BACKWARD`) compute `next_instruction_byte_offset - arg * 2`.
  - `EXTENDED_ARG` (`69`) prepends 8 bits per prefix word; map all prefix offsets to the final instruction index when resolving jump targets.

---
name: static-unpacking-pipeline
description: Peel multi-layer encrypted loaders statically using AST constant extraction, truncated-seed LCG brute-forcing, and pure-Python cryptographic re-implementation. Use when unwrapping layered base85/hex/XOR/HKDF/AEAD/PRNG wrappers or embedded C-extension decryptors without executing untrusted code.
---

# Static Unpacking Pipeline

Unwrap multi-stage loaders layer by layer in pure static code. Every layer produces an inspectable artifact whose checksums or magic bytes confirm success before moving deeper.

## Workflow

### 1. AST Constant Extraction (Zero `exec`)
- Extract encoded tables, byte arrays, salts, and key lists with `ast.literal_eval` and `ast.parse` node traversal.
- Avoid `lines[start:end]` slicing anchored on `try:` or fixed line numbers—polymorphic loaders insert early `try:` anti-tamper blocks or reorder helper definitions. Match assignments by AST target name instead.

### 2. Known-Plaintext LCG Seed Cracking
- When a loader derives a 32-bit LCG seed from an environment/bytecode hash (e.g., `sha256(co_code)[:8]`), bypass the hash by matching the stream-cipher output against known compression magic bytes (`0x78` + valid zlib `flg` where `(cmf*256 + flg) % 31 == 0`).
- Compile a tight `-O3` C helper (`gcc`) to sweep the remaining 24-bit space (`hi << 24 | target0 << 16 | lo`) in milliseconds, keeping a pure-Python fallback if no compiler is present.
- Verify candidate seeds by decompressing the first 64 bytes and checking the inner container header (`\xfd7zXZ\x00`, `BZh`, `PK`, or valid marshal tag).

### 3. Re-implement Custom Crypto & Permutations Statically
- Replicate HKDF, BLAKE2b CTR keystreams, Xorshift64 streams, Fisher-Yates `random.Random(seed).shuffle` un-shuffling, and rotation stages directly in Python.
- Enforce every embedded integrity check (`crc32`, `hmac.compare_digest` AEAD tag) at each stage; treat a mismatch as a signal of shifted offsets or updated key schedule constants.

### 4. Parse Embedded Native Decryption Stubs
- When a layer embeds C source (e.g., `#include <Python.h>` with `_hex[]`, `_tok[]`, multipliers, and mix constants), parse the constants via regex and re-run the multi-stage decryption + `bz2`/`zlib` decompression statically rather than compiling and loading the extension.

## Completion Criteria
- Each layer writes clean output with verified CRC32/AEAD tags and valid inner headers.
- Zero `exec()` or `eval()` calls are executed on untrusted layer code.

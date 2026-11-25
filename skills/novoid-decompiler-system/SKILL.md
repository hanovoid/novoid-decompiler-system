---
name: novoid-decompiler-system
description: Universal systematic reverse-engineering & decompilation system for unknown multi-layer obfuscators, custom VMs, cross-version bytecode (Python 3.11–3.14), and packed white-box loaders. Use when facing multi-stage decryption pipelines, anti-debug/anti-static traps, dynamic CodeType builders, Control-Flow Flattening (CFF), or when standard dis/pycdc fails.
---

# Novoid Decompiler System

Systematic reverse-engineering and static decompilation methodology for breaking unknown multi-layer obfuscators, custom VMs, and cross-version bytecode. Treat any standalone target as a **white-box** system: because it runs on a user's machine, all decryption routines and key derivation paths exist inside the artifact.

---

## Stage 1: Systematic Methodology & Execution Chokepoints

### 1. Static-First Boundary
- Inspect and parse untrusted loaders statically using `ast.literal_eval`, `ast.parse`, binary slicing, or local VM emulation.
- Never run `exec` / `eval` on untrusted layers. Isolate intermediate artifacts to temporary buffers before transforming them.
- Reserve live execution for an isolated sandbox only after static emulation cannot resolve an opaque native binary.

### 2. Separate Data from Mechanism
- Split every layer into **Payload** (90–99% of file size: encoded blobs, bit arrays, hex tables) and **Mechanism** (the 10–100 lines performing decoding/decryption).
- Never read encoded payload blobs token-by-token. Re-implement the decoding Mechanism in a standalone script and automate extraction.

### 3. Locate the Execution Chokepoint
- Trace straight to the final sink where the layer hands control to the runtime (`PyRun_String`, `PyEval_EvalCode`, `PyMarshal_ReadObjectFromString`, `types.CodeType`, `eval`/`exec`, native syscalls, or VM dispatch loop).
- Trace backward from the chokepoint's inputs (`co_code`, `co_consts`, `co_names`, decrypted buffers) to map the exact unpacking pipeline.

### 4. Anchor on Invariants & Weakest Links
- Ignore randomized variable names, Unicode identifiers, emoji/icon opcodes, and decoy control flow.
- Fingerprint algorithms by immutable constants, magic headers, and structural invariants (consult [`reference/invariants.md`](reference/invariants.md)).
- Exploit cryptographic bottlenecks: if a strong hash (e.g., SHA-256) is truncated to 32 bits before seeding an LCG whose output starts with a known magic header (`0x78` zlib, `0xFD 7zXZ`, `MZ`, `\x7fELF`), crack the truncated seed directly in compiled C (`gcc -O3`) instead of reversing the hash input.

---

## Stage 2: Static Layer Unpacking & Truncated-Seed Crypto Cracking

### 1. AST Constant Extraction (Zero `exec`)
- Extract encoded tables, byte arrays, salts, and key lists with `ast.literal_eval` and `ast.parse` node traversal.
- Avoid line-number slicing anchored on `try:` or fixed offsets—polymorphic loaders insert early anti-tamper blocks. Match assignments by AST target name instead.

### 2. Known-Plaintext LCG Seed Cracking
- When a loader derives a 32-bit LCG seed from an environment/bytecode hash, bypass the hash by matching stream-cipher output against known compression magic bytes (`0x78` + valid zlib `flg` where `(cmf*256 + flg) % 31 == 0`).
- Compile a tight `-O3` C helper (`gcc`) to sweep the remaining 24-bit space (`hi << 24 | target0 << 16 | lo`) in milliseconds, keeping a pure-Python fallback.
- Verify candidate seeds by decompressing the first 64 bytes and checking the inner container header (`\xfd7zXZ\x00`, `BZh`, `PK`, or valid marshal tag).

### 3. Re-implement Custom Crypto & Permutations Statically
- Replicate HKDF, BLAKE2b CTR keystreams, Xorshift64 streams, Fisher-Yates `random.Random(seed).shuffle` un-shuffling, and rotation stages directly in Python.
- Enforce every embedded integrity check (`crc32`, `hmac.compare_digest` AEAD tag) at each stage; treat a mismatch as a signal of shifted offsets or updated key schedule constants.

### 4. Parse Embedded Native Decryption Stubs
- When a layer embeds C source (e.g., `#include <Python.h>` with `_hex[]`, `_tok[]`, multipliers, and mix constants), parse the constants via regex and re-run the multi-stage decryption + `bz2`/`zlib` decompression statically rather than compiling and loading the extension.

---

## Stage 3: Cross-Version Bytecode, Layout Emulation & CFF Deobfuscation

### 1. Cross-Version Marshal & Opcode Grounding
- Implement a standalone `MarshalParser` supporting `TYPE_REF` (`r` / `0x80` flag) and Python 3.11–3.14 `CodeType` fields (`localsplusnames`, `localspluskinds`, `linetable`, `exceptiontable`).
- When the host Python version differs from the target bytecode version, map unknown opcodes directly from embedded stdlib code objects (`inspect`, `traceback`, `flatten`) inside `co_consts` instead of guessing opcode numbers.
- Account for `EXTENDED_ARG` (`69`) byte offsets and CPython inline `CACHE` (`0x0000`) entries when computing relative jump targets (`next_p + arg * 2`).

### 2. Reconstruct Dynamic `CodeType` Layout Builders
- When `marshal` yields a builder module that constructs nested `CodeType` objects via `BUILD_LIST`, `LIST_APPEND`, `CALL_INTRINSIC_1(6)` (`list -> tuple`), and `CALL 18` (`types.CodeType(...)`):
  - Extract arithmetic obfuscation lambdas (e.g., `(x0 ^ x2) - x1`, `(x0 + x2) // x1`, `(x0 - x2) >> x1`) dynamically from their bytecode rather than stubbing constants to `0`.
  - Evaluate opaque predicates (`hasattr(str, 'upper')`, `type(len) == type(sum)`, `all([True, 1, 'a'])`, `len('python'.split('th')) == 2`) accurately so real field values (`argcount`, `flags`, `consts`, pool indices) are preserved.
  - Recurse through constructed `<module>` code objects until reaching the innermost runner module holding the encrypted constant pool and decoder function.

### 3. Extract Randomized Pool Tags Automatically
- Never hardcode binary pool tags (`str`, `bytes`, `empty_str`, `empty_bytes`, `+int`, `-int`, `float`, `None`).
- Locate the pool-decoder code object (`howtodecode_*`) in `co_consts` and extract the exact tag integers from its `COMPARE_OP (==)` instructions in dispatch order before unpacking the pool blob and verifying its CRC32.

### 4. Strip CFF, Fault Chains, and Decoy Logic
- **Guaranteed-fault chains**: Treat `eval('0/0')` calls as immediate jumps past `CHECK_EXC_MATCH` (`ZeroDivisionError`) into the active `except` body; skip dead `return None` epilogues in unreachable `try` tails.
- **CFF dispatchers**: Unwrap `with <internal_ctx>(1) as state:` blocks by following active `state.args[0] == 1` branches and discarding `args[0] != 1` dead branches.
- **Decoys & string wrappers**: Strip internal `_tq*` decoy lambdas/comprehensions, `str(100)` cleanup calls, and anti-debug setup (`_tgd_*`, `_tvm_*`, `_tpd_*`, `_tfr_*`, `_tpo_*`). Resolve pool lookups, `_run(zlib.decompress(...))` hex-interleaved strings, and `.format(...)` calls back into literals/f-strings.

---

## Completion Criteria
- Every encryption/packing layer is unpacked purely statically with all checksums/tags verified.
- All dynamic code builders, randomized pool tags, and CFF dispatchers are resolved without stubbing real values.
- The recovered source code is readable, faithful to original semantics, and verified runnable (when safe to execute).

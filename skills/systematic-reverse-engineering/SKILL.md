---
name: systematic-reverse-engineering
description: Systematic reverse-engineering methodology for breaking unknown multi-layer obfuscators, custom VMs, packed scripts, and white-box loaders without naive reading or unsafe execution. Use when facing unfamiliar obfuscation, anti-debug/anti-static traps, custom bytecode/VMs, or multi-stage decryption pipelines.
---

# Systematic Reverse Engineering

Treat any unknown obfuscated artifact as a **white-box** system: because it runs standalone on a target machine, every decryption routine and key derivation path lives inside the artifact itself.

## Core Methodology (Ordered Loop)

### 1. Static-First Boundary
- Parse and inspect untrusted loaders using `ast.literal_eval`, `ast.parse`, binary slicing, or local VM emulation.
- Isolate decrypted payloads to temporary inspection buffers before reading or transforming them.
- Reserve live execution for an isolated sandbox only after static analysis and emulation cannot resolve the target.

### 2. Separate Data from Mechanism
- Split every layer into **Payload** (90–99% of file size: encoded blobs, bit arrays, hex tables) and **Mechanism** (the 10–100 lines performing decoding/decryption).
- Read only the Mechanism; automate Payload extraction with a standalone script.

### 3. Locate the Execution Chokepoint
- Trace straight to the final sink where the layer hands control to the runtime (`PyRun_String`, `PyEval_EvalCode`, `PyMarshal_ReadObjectFromString`, `types.CodeType`, `eval`/`exec`, native syscalls, or VM dispatch loop).
- Work backward from the chokepoint's inputs (`co_code`, `co_consts`, `co_names`, decrypted buffers) to map the exact unpacking pipeline.

### 4. Anchor on Invariants & Weakest Links
- Ignore randomized variable names, Unicode identifiers, emoji/icon opcodes, and decoy control flow.
- Fingerprint algorithms by immutable constants, magic headers, and structural invariants (consult [`reference/invariants.md`](reference/invariants.md) when identifying magic bytes, PRNG multipliers, or CPython marshal/bytecode layouts).
- Exploit cryptographic bottlenecks: if a strong hash (e.g., SHA-256) is truncated to 32 bits before seeding an LCG whose output starts with a known magic header (`0x78` zlib, `0xFD 7zXZ`, `MZ`, `\x7fELF`), crack the truncated seed directly in compiled C (`gcc -O3`) instead of reversing the hash input.

### 5. Defeat Anti-Static & Control-Flow Obfuscation
- **Opaque predicates & exception chains**: Evaluate constant/environmental invariants (e.g., `hasattr(str, 'upper')`, `type(len) == type(sum)`) and treat guaranteed-fault triggers (e.g., `eval('0/0')`) as unconditional jumps to their exception handler (`ZeroDivisionError`).
- **Control-Flow Flattening (CFF)**: Identify the state variable or context-manager dispatcher (`args[0] == k`), execute only reachable state branches, and discard dead decoy states and junk variables.
- **Dynamic Code Builders**: Symbolically step through `BUILD_LIST` / `LIST_APPEND` / `CodeType(...)` construction slices to materialize nested code objects statically.
- **Cross-version bytecode**: When the host runtime differs from the target Python version, write a standalone `MarshalParser` and extract opcode meanings directly from embedded stdlib functions (`inspect`, `traceback`) inside `co_consts`.

### 6. Tight Hypothesis → Experiment → Verify Loop
- Form a concrete hypothesis from observed bytes/opcodes.
- Run a minimal script against the real artifact to verify that CRC32s, AEAD tags, marshal parsing, and reconstructed control flow pass cleanly.
- Promote verified logic into a reusable, self-contained static decompiler and verify end-to-end execution on the recovered source.

## Completion Criteria
- Every encryption/packing layer is unpacked purely statically with all checksums/tags verified.
- All dynamic code builders, randomized pool tags, and CFF dispatchers are resolved without stubbing real values.
- The recovered source code is readable, faithful to the original semantics, and verified runnable (when safe to execute).

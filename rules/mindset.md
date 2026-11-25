# Systematic Reverse-Engineering Mindset

Use these 6 reasoning pillars whenever analyzing an unknown obfuscated artifact, custom VM, or packed loader.

## 1. White-Box Principle
Any standalone artifact that runs on a user's machine must carry its own decryption routines and key-derivation paths. Regardless of how many layers wrap it, every secret needed to reach runtime execution exists inside the artifact itself.

## 2. Data vs. Mechanism Separation
Obfuscated files typically consist of 90–99% encoded **Payload** (arrays, base85/hex blobs, junk data) and 1–10% **Mechanism** (the loader or decoder loop).
- Never read encoded payload blobs token-by-token.
- Isolate the minimal Mechanism, re-implement or emulate it statically, and dump the decoded output to inspectable artifacts.

## 3. Execution Chokepoints
Every obfuscator—no matter how aggressively it adds dead branches, Unicode identifiers, or decoy functions—must pass its final unmasked artifact through an unavoidable runtime **Chokepoint**:
- **Python**: `exec`, `eval`, `compile`, `PyRun_String`, `PyEval_EvalCode`, `PyMarshal_ReadObjectFromString`, `types.CodeType`, or a custom VM dispatch loop.
- **Native**: OS syscalls, dynamic loader calls, or exported entrypoints.
- **JS/Web**: `Function`, `eval`, network sink (`fetch`/`XHR`), or DOM sink.

Locate the Chokepoint first, then trace backward to see how its inputs are assembled.

## 4. Invariants & Weakest Links
Authors can randomize names, strings, and binary tags on every build, but cannot disguise mathematical constants or format invariants:
- Compression headers (`0x78` zlib, `\xfd7zXZ\x00` xz, `BZh` bz2).
- PRNG/hash multipliers (`1103515245`, `6364136223846793005`, `0x9E3779B97F4A7C15`, `2166136261`).
- Runtime ABI structures (`marshal` tags, CPython opcode semantics).

Always attack the weakest mathematical link. When a strong hash (e.g., SHA-256) is truncated to 32 bits before a stream cipher with a known magic header, crack the 32-bit state directly in compiled C rather than trying to invert the hash.

## 5. Hypothesis → Experiment → Verify
Treat reverse engineering as a tight empirical loop:
1. **Observe** structural patterns (repeating jump guards, constant formulas, tag comparisons).
2. **Hypothesize** the rule (e.g., `eval('0/0')` always jumps to `ZeroDivisionError`; `args[0] == 1` selects live CFF blocks).
3. **Experiment** with a focused static script on a single function or slice.
4. **Verify** checksums, stack balance, and output semantics before generalizing into a decompiler pass.

## 6. Static-First, Controlled-Dynamic Last
Prefer static parsing and lightweight local VM emulation over live execution. Live execution risks triggering anti-debug traps, destructive payloads, or environment locks. Only use dynamic tracing inside an isolated sandbox when static emulation faces an opaque native binary without embedded source.

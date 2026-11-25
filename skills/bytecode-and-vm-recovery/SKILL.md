---
name: bytecode-and-vm-recovery
description: Recover high-level Python source from cross-version marshal objects, dynamic CodeType layout builders, randomized binary pools, opaque predicates, and Control-Flow Flattening (CFF). Use when standard dis/pycdc fails on Python 3.13/3.14 bytecode or obfuscated VM/CFF structures.
---

# Bytecode & VM Recovery

Reconstruct nested code objects, decode randomized constant pools, and lift obfuscated Python 3.11–3.14 bytecode back into clean source.

## Workflow

### 1. Cross-Version Marshal & Opcode Grounding
- Implement a standalone `MarshalParser` supporting `TYPE_REF` (`r` / `0x80` flag) and Python 3.11–3.14 `CodeType` fields (`localsplusnames`, `localspluskinds`, `linetable`, `exceptiontable`).
- When the host Python version differs from the target bytecode version, map unknown opcodes directly from embedded stdlib code objects (`inspect`, `traceback`, `flatten`) inside `co_consts` instead of guessing opcode numbers.
- Account for `EXTENDED_ARG` (`69`) byte offsets and CPython inline `CACHE` (`0x0000`) entries when computing relative jump targets (`next_p + arg * 2`).

### 2. Reconstruct Dynamic `CodeType` Layout Builders
- When `marshal` yields a builder module that constructs nested `CodeType` objects via `BUILD_LIST`, `LIST_APPEND`, `CALL_INTRINSIC_1(6)` (`list -> tuple`), and `CALL 18` (`types.CodeType(...)`):
  - Extract any arithmetic obfuscation lambdas (e.g., `(x0 ^ x2) - x1`, `(x0 + x2) // x1`, `(x0 - x2) >> x1`) dynamically from their bytecode rather than stubbing constants to `0`.
  - Evaluate opaque predicates (`hasattr(str, 'upper')`, `type(len) == type(sum)`, `all([True, 1, 'a'])`, `len('python'.split('th')) == 2`) accurately so real field values (`argcount`, `flags`, `consts`, pool indices) are preserved.
  - Recurse through constructed `<module>` code objects until reaching the innermost runner module holding the encrypted constant pool and decoder function.

### 3. Extract Randomized Pool Tags Automatically
- Never hardcode binary pool tags (`str`, `bytes`, `empty_str`, `empty_bytes`, `+int`, `-int`, `float`, `None`).
- Locate the pool-decoder code object (`howtodecode_*`) in `co_consts` and extract the exact tag integers from its `COMPARE_OP (==)` instructions in dispatch order before unpacking the pool blob and verifying its CRC32.

### 4. Strip CFF, Fault Chains, and Decoy Logic
- **Guaranteed-fault chains**: Treat `eval('0/0')` calls as immediate jumps past `CHECK_EXC_MATCH` (`ZeroDivisionError`) into the active `except` body; skip dead `return None` epilogues in unreachable `try` tails.
- **CFF dispatchers**: Unwrap `with <internal_ctx>(1) as state:` blocks by following active `state.args[0] == 1` branches and discarding `args[0] != 1` dead branches.
- **Decoys & string wrappers**: Strip internal `_tq*` decoy lambdas/comprehensions, `str(100)` cleanup calls, and anti-debug setup (`_tgd_*`, `_tvm_*`, `_tpd_*`, `_tfr_*`, `_tpo_*`). Resolve pool lookups, `_run(zlib.decompress(...))` hex-interleaved strings, and `.format(...)` calls back into literals/f-strings.

## Completion Criteria
- All nested `CodeType` objects, closures, loops, `with` blocks, and string constants are recovered without stubbed placeholders.
- The lifted source parses with `ast.parse` and preserves 100% of the target's executable logic.

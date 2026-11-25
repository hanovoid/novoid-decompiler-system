# Safety & Integrity Rules for AI Decompilers

## Execution Safety
1. **No `exec` / `eval` on untrusted layers**: Extract tables, byte arrays, and cipher constants using `ast.literal_eval` and `ast.parse` AST walking.
2. **Respect anti-tamper & decoy traps**: Expect obfuscators to embed self-checksums, C-compilation prank/exit traps, stack-frame walkers, and infinite watchdog threads. Never bypass them by running the sample on the host.
3. **Isolate intermediate artifacts**: Write unpacked layers (`layer2.py`, `layer3.marshal.bin`, `pool.txt`) only to a dedicated temporary directory (`/tmp/opencode` or a local scratch folder) and clean up scratch artifacts when finished.

## Output Integrity
1. **Zero Fabrication**: Every identifier, constant, branch, and call in the recovered source must trace directly to unpacked bytecode, constant pools, or verified runtime structures.
2. **Explicit Limitations**: When information is irreversibly discarded prior to compilation (such as pre-AST whitespace or quote style `"` vs `'`), state the exact information-theoretic boundary rather than guessing.
3. **End-to-End Verification**:
   - Verify every cryptographic checksum (CRC32, HMAC, BLAKE2b AEAD tag) during static unpacking.
   - Confirm recovered code parses cleanly (`ast.parse`) and matches the exact semantics of the unpacked bytecode.

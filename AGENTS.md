# Novoid Decompiler System — Agent Rules & Skill Index

This repository provides **rules, reverse-engineering mindset, and modular AI Agent skills** for systematically analyzing and decompiling multi-layer obfuscated code, custom VMs, packed loaders, and unfamiliar bytecode.

## Global Agent Rules

1. **Static-First Boundary**: Parse and unpack unknown artifacts statically (`ast.literal_eval`, `ast.parse`, binary slicing, or local VM emulation). Never run `exec`/`eval` on untrusted payloads or execute unverified samples outside an isolated sandbox.
2. **Evidence Over Guessing**: Reconstruct source code strictly from verified unpacked bytes, decrypted pools, and bytecode semantics. Never fabricate, guess, or omit logic.
3. **Separate Data from Mechanism**: Ignore large encoded payloads and decoy identifiers; isolate the small loader/decoder mechanism and automate extraction with standalone scripts.
4. **Anchor on Chokepoints & Invariants**: Follow execution straight to runtime sinks (`PyEval_EvalCode`, `PyMarshal_ReadObjectFromString`, `CodeType`, VM loop, syscall) and fingerprint algorithms via magic headers and cryptographic constants.
5. **Verify Every Layer**: Confirm CRC32s, AEAD tags, marshal parsing, and reconstructed outputs experimentally before moving to the next layer.

## Core References (`./rules/`)

- `rules/mindset.md`: The 6 pillars of systematic reverse-engineering reasoning for AI agents.
- `rules/safety-and-boundaries.md`: Operational guardrails, anti-fabrication policy, and verification gates.

## Installed Skill System (`./skills/`)

| Skill ID | Purpose | Trigger Condition |
| :--- | :--- | :--- |
| `novoid-decompiler-system` | Unified systematic methodology (Methodology & Chokepoints → Static Layer Unpacking & LCG Cracking → Bytecode, Layout Emulation & CFF Deobfuscation) | Unknown multi-layer obfuscator, custom VM, packed loader, or when standard dis/pycdc fails |

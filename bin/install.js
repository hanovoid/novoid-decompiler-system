#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
⚡ Novoid Decompiler System — Skill Installer

Usage:
  npx novoid-decompiler-system [options]

Options:
  -g, --global     Install skills globally into ~/.agents/skills/
  --rules          Also copy rules/ into the target workspace
  --list           List available skills in this package
  -h, --help       Show this help message

Default:
  Installs skills into the current workspace (.agents/skills/)
`);
  process.exit(0);
}

const packageRoot = path.join(__dirname, '..');
const srcSkillsDir = path.join(packageRoot, 'skills');
const srcRulesDir = path.join(packageRoot, 'rules');

if (args.includes('--list')) {
  console.log('Available skills:');
  if (fs.existsSync(srcSkillsDir)) {
    const skills = fs.readdirSync(srcSkillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    for (const s of skills) {
      console.log(`  - ${s}`);
    }
  }
  process.exit(0);
}

const isGlobal = args.includes('--global') || args.includes('-g');
const includeRules = args.includes('--rules');

const baseDir = isGlobal
  ? path.join(os.homedir(), '.agents')
  : path.join(process.cwd(), '.agents');

const targetSkillsDir = path.join(baseDir, 'skills');

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('⚡ Novoid Decompiler System Installer');
console.log(`[*] Target directory: ${targetSkillsDir}`);

try {
  if (!fs.existsSync(srcSkillsDir)) {
    throw new Error(`Source skills directory not found at: ${srcSkillsDir}`);
  }

  const skillDirs = fs.readdirSync(srcSkillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const skillName of skillDirs) {
    const src = path.join(srcSkillsDir, skillName);
    const dest = path.join(targetSkillsDir, skillName);
    copyRecursive(src, dest);
    console.log(`  [+] Installed skill: ${skillName}`);
  }

  if (includeRules && fs.existsSync(srcRulesDir)) {
    const targetRulesDir = isGlobal
      ? path.join(os.homedir(), '.agents', 'rules')
      : path.join(process.cwd(), 'rules');
    copyRecursive(srcRulesDir, targetRulesDir);
    console.log(`  [+] Installed rules into: ${targetRulesDir}`);
  }

  console.log('\n[✔] Successfully installed all Novoid reverse-engineering skills!');
  console.log('    Your AI Agent (OpenCode, Claude Code, Codex) can now use them immediately.\n');
} catch (err) {
  console.error('\n[-] Installation failed:', err.message);
  process.exit(1);
}

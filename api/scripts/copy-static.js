const fs = require('node:fs');
const path = require('node:path');

const sourceDir = path.resolve(__dirname, '../public');
const targetDir = path.resolve(__dirname, '../dist/public');

if (!fs.existsSync(sourceDir)) {
  console.warn(`[copy-static] Diretório não encontrado: ${sourceDir}`);
  process.exit(0);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

console.log(`[copy-static] Arquivos copiados para ${targetDir}`);

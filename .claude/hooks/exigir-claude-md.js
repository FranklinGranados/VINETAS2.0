// Hook de Claude Code (PreToolUse sobre Bash/PowerShell): antes de que Claude
// ejecute un `git commit` en este repositorio, exige que CLAUDE.md vaya
// incluido en el commit. CLAUDE.md es la memoria compartida del proyecto
// entre PCs (ver su encabezado): si no se actualiza con cada commit, la
// sesión de Claude en la otra PC trabaja con contexto viejo.
//
// Claude Code le pasa por stdin un JSON con el comando a ejecutar
// (tool_input.command) y la carpeta actual (cwd).
//   exit 0 → se permite el comando
//   exit 2 → se BLOQUEA; lo escrito en stderr le llega a Claude como motivo
//
// Está en Node (no en bash/PowerShell) para que funcione igual en cualquier
// PC con Windows, Linux o macOS: el proyecto ya requiere Node.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

let entrada = '';
process.stdin.on('data', (parte) => (entrada += parte));
process.stdin.on('end', () => {
  let datos;
  try {
    datos = JSON.parse(entrada);
  } catch {
    process.exit(0); // entrada inesperada: no bloquear por un error del hook
  }

  const comando = (datos.tool_input && datos.tool_input.command) || '';
  // ¿Es un git commit? (no bloquea `git commit --dry-run`, que no crea nada)
  if (!/\bgit\b(?:\s+-C\s+\S+)?\s+commit\b/.test(comando) || /--dry-run/.test(comando)) {
    process.exit(0);
  }

  const cwd = datos.cwd || process.cwd();
  let raiz;
  try {
    raiz = git(cwd, ['rev-parse', '--show-toplevel']);
  } catch {
    process.exit(0); // no es un repositorio git
  }
  // Solo aplica a repos que tengan CLAUDE.md en la raíz (este proyecto).
  if (!fs.existsSync(path.join(raiz, 'CLAUDE.md'))) process.exit(0);

  const staged = git(raiz, ['diff', '--cached', '--name-only']).split('\n');
  if (staged.includes('CLAUDE.md')) process.exit(0);

  // Caso habitual: `git add -A && git commit ...` en un solo comando. En este
  // momento (antes de ejecutarse) CLAUDE.md todavía no está en staged, pero
  // el mismo comando lo va a agregar: si tiene cambios y el comando incluye
  // un `git add` que lo cubre (o `commit -a`), se permite.
  const tieneCambios = git(raiz, ['status', '--porcelain', '--', 'CLAUDE.md']) !== '';
  const loAgrega =
    /\bgit\b[^|;&]*\badd\b[^|;&]*(\s-A\b|\s--all\b|\s\.(\s|$)|CLAUDE\.md)/.test(comando) ||
    /\bcommit\b[^|;&]*\s(-a|--all|-am|-[a-z]*a[a-z]*)\b/.test(comando);
  if (tieneCambios && loAgrega) process.exit(0);

  process.stderr.write(
    'Commit bloqueado: CLAUDE.md no está incluido en este commit.\n' +
      'CLAUDE.md es la memoria compartida del proyecto entre PCs y se actualiza en CADA commit.\n' +
      'Antes de commitear: actualiza CLAUDE.md con lo que cambia en este commit (estado, decisiones,\n' +
      'pendientes, gotchas nuevos; sin contraseñas, IPs internas ni datos personales),\n' +
      'agrégalo con `git add CLAUDE.md` y vuelve a ejecutar el commit.\n',
  );
  process.exit(2);
});

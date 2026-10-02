# =============================================================================
# Logs del sistema en tiempo real (despliegue con Docker)
# =============================================================================
# Uso normal: doble clic en ver-logs.bat (en la raíz del proyecto), que abre
# este script en una terminal y muestra un menú.
#
# También se puede llamar con parámetros, sin menú:
#   .\scripts\ver-logs.ps1 -Servicio backend
#   .\scripts\ver-logs.ps1 -Servicio todo -SoloErrores -Guardar
#   .\scripts\ver-logs.ps1 -Servicio mysql -Lineas 500
#
# Colores: rojo = error, amarillo = advertencia (incluye respuestas 4xx).
# Para salir: Ctrl+C.
#
# Escrito para Windows PowerShell 5.1 (el que trae Windows): sin "??",
# ternarios ni "&&", que no existen en esa versión.
# =============================================================================

param(
    [ValidateSet('todo', 'backend', 'frontend', 'mysql')]
    [string]$Servicio,
    [switch]$SoloErrores,
    [switch]$Guardar,
    [int]$Lineas = 100
)

# Docker devuelve UTF-8; sin esto PowerShell 5 muestra mal las tildes.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = 'Viñetas - logs en tiempo real'

# El proyecto es la carpeta padre de scripts/ (ahí está docker-compose.yml).
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

function Salir-ConMensaje($mensaje) {
    Write-Host ''
    Write-Host $mensaje -ForegroundColor Red
    exit 1
}

# ── 1. ¿Docker está disponible y corriendo? ─────────────────────────────────
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Salir-ConMensaje 'No se encontró Docker. ¿Está instalado Docker Desktop?'
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Salir-ConMensaje 'Docker no está corriendo. Abre Docker Desktop y espera a que diga "Engine running".'
}

# ── 2. ¿Los contenedores del sistema están levantados? ──────────────────────
$corriendo = @(docker compose ps --services --status running 2>$null)
if ($corriendo.Count -eq 0) {
    Salir-ConMensaje 'El sistema no está levantado. Ejecuta primero: docker compose up -d'
}

# ── 3. Menú (solo si no se pasó -Servicio) ──────────────────────────────────
if (-not $Servicio) {
    Write-Host ''
    Write-Host '  LOGS DEL SISTEMA DE VIÑETAS' -ForegroundColor Cyan
    Write-Host '  ---------------------------'
    Write-Host '  1) Todo (backend + frontend + base de datos)'
    Write-Host '  2) Backend  - API: cada petición, errores del servidor'
    Write-Host '  3) Frontend - nginx: accesos a la página'
    Write-Host '  4) MySQL    - base de datos'
    Write-Host '  5) Solo errores y advertencias (de todo)'
    Write-Host ''
    $opcion = Read-Host '  Elige una opción [1-5]'
    switch ($opcion) {
        '2' { $Servicio = 'backend' }
        '3' { $Servicio = 'frontend' }
        '4' { $Servicio = 'mysql' }
        '5' { $Servicio = 'todo'; $SoloErrores = $true }
        default { $Servicio = 'todo' }
    }
    $respuesta = Read-Host '  ¿Guardar también en un archivo? [s/N]'
    if ($respuesta -match '^[sS]') { $Guardar = $true }
}

# ── 4. Archivo de salida (opcional) ─────────────────────────────────────────
$archivo = $null
if ($Guardar) {
    $carpeta = Join-Path $raiz 'logs'
    New-Item -ItemType Directory -Force -Path $carpeta | Out-Null
    $archivo = Join-Path $carpeta ('logs-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')
}

# ── 5. Seguir los logs ──────────────────────────────────────────────────────
# -f = seguir en vivo; --tail = cuántas líneas anteriores mostrar al empezar;
# --timestamps = fecha/hora de cada línea (Docker la da en UTC; abajo se
# convierte a la hora local).
$argumentos = @('compose', 'logs', '-f', '--tail', "$Lineas", '--timestamps')
if ($Servicio -ne 'todo') { $argumentos += $Servicio }

Write-Host ''
$titulo = "  Mostrando: $Servicio"
if ($SoloErrores) { $titulo += ' (solo errores y advertencias)' }
Write-Host $titulo -ForegroundColor Cyan
if ($archivo) { Write-Host "  Guardando en: $archivo" -ForegroundColor Cyan }
Write-Host '  Ctrl+C para salir.' -ForegroundColor DarkGray
Write-Host ''

# Patrones de cada nivel. Cubren el formato de NestJS ("ERROR", "WARN"), de
# MySQL ("[ERROR]", "[Warning]") y de nginx ("[error]", códigos HTTP).
#  - error: palabras de error, o un código HTTP 5xx entre espacios
#  - advertencia: "warn/warning", o un código HTTP 4xx entre espacios
$patronError = '(?i)\b(error|exception|fatal|emerg|crit)\b|\s5\d\d\s'
$patronAdvertencia = '(?i)\bwarn(ing)?\b|\s4\d\d\s'

# ForEach-Object procesa cada línea apenas llega (no espera al final),
# por eso los logs se ven en tiempo real.
# Marca de tiempo que agrega Docker al inicio (--timestamps), siempre en UTC:
#   "backend-1  | 2026-10-02T03:10:44.351977051Z [Nest] ..."
$patronFecha = '^(?<prefijo>[^|]*\|\s*)(?<fecha>\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s'
# Códigos de color de terminal (ESC[...m) que algunos programas escriben.
$patronColor = [char]27 + '\[[0-9;]*m'

& docker @argumentos | ForEach-Object {
    # Quita códigos de color: ensucian la pantalla de PowerShell 5 y el archivo.
    $linea = "$_" -replace $patronColor, ''
    # UTC → hora local de esta PC, para leer "a qué hora falló" sin hacer cuentas.
    if ($linea -match $patronFecha) {
        $local = ([DateTime]::Parse($Matches['fecha'])).ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss')
        $linea = $Matches['prefijo'] + $local + ' ' + $linea.Substring($Matches[0].Length)
    }
    $color = $null
    if ($linea -match $patronError) { $color = 'Red' }
    elseif ($linea -match $patronAdvertencia) { $color = 'Yellow' }

    if ($SoloErrores -and -not $color) { return }  # return = saltar esta línea

    if ($color) { Write-Host $linea -ForegroundColor $color }
    else { Write-Host $linea }

    if ($archivo) { Add-Content -Path $archivo -Value $linea -Encoding UTF8 }
}

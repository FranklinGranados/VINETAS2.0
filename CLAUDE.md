# CLAUDE.md — Contexto del proyecto para Claude Code

> Este archivo es la **memoria compartida del proyecto**: Claude Code lo lee al abrir el repo en
> cualquier PC. **Actualizarlo en cada commit** con lo que cambió (decisiones, estado,
> pendientes, gotchas). Un hook en `.claude/settings.json` bloquea el `git commit` de Claude si
> `CLAUDE.md` no está incluido en el commit.
>
> ⚠ El repositorio es **público**: aquí NUNCA van contraseñas, cadenas de conexión reales, IPs
> internas de la empresa ni datos personales. Esos datos viven solo en los `.env` (ignorados).

## Qué es

Rediseño web del **sistema de viñetas** (etiquetas de mantenimiento/calibración de instrumentos
industriales) del Departamento de Metrología e Instrumentación de un ingenio azucarero. Reemplaza a
un programa en Windows Forms + C# + Crystal Reports + SQL Server Express (**v1**, sigue en
producción y **no está en este repo**). Es proyecto de práctica de un bootcamp full-stack.

## Cómo trabajar con el usuario (importante)

- Responder en **español**. El usuario es estudiante de bootcamp (viene de PHP/Laravel, aprende
  JS/TS): **revisa cada línea**, quiere entender el **porqué** de cada decisión. Nada de "vibe coding".
- Comentarios en el código para separar secciones y explicar el WHY (no el qué obvio).
- Clean code: DI, lógica de negocio en services (no en controllers), clases/archivos separados.
- Decisiones que son del usuario → preguntar (AskUserQuestion) con una opción recomendada.
- Verificar de verdad (curl, Playwright, `tsc`) antes de decir que algo funciona; limpiar datos de
  prueba después.
- Antes de replicar un comportamiento de v1, revisarlo en el código C# (el usuario tiene la carpeta
  `viñetas/` localmente, fuera del repo).

## Stack

| Capa | Tecnología |
|---|---|
| Backend | NestJS 11 + Prisma 7 (`prisma-client-js` + `@prisma/adapter-mariadb`) sobre MySQL 8 |
| Frontend | React 19 + Vite + TypeScript, Ant Design 6, TanStack Query 5, React Router 7, axios |
| Auth | JWT (`@nestjs/jwt`) + bcryptjs, guard propio `AdminAuthGuard` (sin Passport) |
| Etiqueta | `jsbarcode` (Code 39), impresión desde el navegador |
| BD original | SQL Server Express (paquete `mssql`, por ahora solo diagnóstico) |
| Despliegue | Docker Compose: mysql + backend + frontend (nginx) |

Decisiones de stack: **no Tailwind** (choca con antd); Server/Client Components no aplican (SPA con
Vite); no se usa `dayjs` directo (fechas con inputs nativos `type=date`/`type=month`).

## Estructura

```
backend/   src/{administradores,areas,auth,common,dashboard,equipos,grupos,prisma,tecnicos,vinetas}, scripts/, prisma/schema.prisma
frontend/  src/{api,auth,components,layout,modulos,rutas,utils,assets}, nginx.conf
```

**Frontend por módulos** (2026-10-03, espejo de los módulos del backend): `modulos/<módulo>/` junta la
página con SUS formularios/componentes (inicio, equipos, vinetas [+ `impresion/`], otras-vinetas,
grupos, areas, tecnicos, administradores). `components/` y `utils/` = SOLO lo que usan varios módulos
(ErrorDeCarga, FiltroListado, SelectorPeriodo, PantallaDeCarga, ErrorBoundary; fechas, busqueda,
avance). `auth/` = sesión + LoginPage; `layout/` = AppLayout + NotFoundPage; `rutas/` = carga diferida
y precarga; `api/` = una función por endpoint + `types.ts` + `consultas.ts`. Si un componente pasa a
usarse en otro módulo, se sube a `components/`.

**Técnicos y Áreas desde la app** (2026-10-03):
- Técnicos: crear/modificar (`TecnicoFormModal`: nombre, código de empleado, identificador, cargo;
  vaciar un campo = null) e interruptor Activo. Sin eliminar (se desactiva; conserva sus viñetas).
- Áreas: "Nueva área" con sub-áreas iniciales (`Form.List`) → `POST /areas` con `sub_areas[]` en UNA
  operación (nested write de Prisma; código repetido en la lista → 400 con el código). "Agregar
  sub-área" a un área existente (`POST /sub-areas`) y "Modificar" nombre de área/sub-área. El
  **código NO se cambia desde la UI** (es el sufijo de los TAG ya existentes). Regla de código (back
  y front): 2 caracteres `[0-9A-Z]`, se pasa a mayúsculas (existe "1A" = Evaporador No. 1A). La UI
  sugiere el siguiente código numérico (`modulos/areas/codigos.ts`).
- Login: "Volver sin iniciar sesión" no regresa a una pantalla de solo admin (`EstadoLogin.soloAdmin`
  que pone RutaAdmin → va al Inicio). Cerrar sesión en una pantalla de Administración → Inicio
  (`startTransition` con navigate + logout juntos: React Router 7 navega como transición y, si
  logout iba aparte, RutaAdmin redirigía al login primero).

**Acerca de** (`/acerca-de`, pública, último ítem del menú): ESQUELETO que el usuario diseña y rellena
él mismo — no rediseñarlo sin que lo pida. Datos en `modulos/acerca-de/datosAcercaDe.ts` (TODO),
diseño en `AcercaDePage.tsx` + `TarjetaPersona.tsx` (reusada para los dos creadores). Repo público:
sin teléfonos/correos personales.

```
database/  schema.sql  (BD MySQL nueva; la carga Docker en el primer arranque) + migraciones/
media/     foto de la viñeta original + logo
docker-compose.yml, .env.example (raíz → Docker), backend/.env.example, frontend/.env.example
.claude/   settings.json (hook compartido) + hooks/exigir-claude-md.js
```

**Hook de CLAUDE.md**: `.claude/settings.json` registra un PreToolUse (Bash|PowerShell) que ejecuta
`.claude/hooks/exigir-claude-md.js` (Node). Si Claude intenta `git commit` y `CLAUDE.md` no va en el
commit (ni en staged ni agregado por el mismo comando, ej. `git add -A && git commit`), lo bloquea
(exit 2). `.claude/settings.local.json` es personal de cada PC y está en el `.gitignore`.

Excluidos del repo por `.gitignore`: `viñetas/` (v1), `viñetas.sln`, `packages/`,
`Mantenimiento2026/` (Excel internos), `bd.sql` (script de la BD original), `.env`, `respaldo*.sql`.

## Cómo correr

- **Docker (pruebas/despliegue)**: ver README "Despliegue con Docker". App en `http://localhost:8090`
  (nginx sirve la SPA y hace proxy `/api/` → backend:3000). MySQL expuesto en 3307. Primer admin:
  `docker compose exec backend node dist/scripts/seed-admin.js <usuario> "<nombre>" <clave> [cod_empleado]`.
- **Desarrollo**: MySQL local + `cd backend && npm run start:dev` (:3000) + `cd frontend && npm run dev`
  (:5173, `strictPort`). Admin: `npm run seed:admin -- <usuario> "<nombre>" <clave> [cod]`.
- **Sin Docker** (en la PC de la empresa NO se puede instalar Docker): README "Sin Docker (Windows)".
  Camino A: el diagnóstico SQL Server solo necesita Node (`npx ts-node scripts/probar-sqlserver.ts`,
  no usa MySQL). Camino B: app completa con el MariaDB de XAMPP/Laragon — **probado con MariaDB
  10.4**: `schema.sql` carga bien (tildes OK) y el backend funciona sin cambios. Importar schema con
  phpMyAdmin o `cmd /c "mysql -u root < database\schema.sql"` (nunca `Get-Content |` en PS5).
- **Logs en tiempo real**: `ver-logs.bat` (raíz, doble clic) → `scripts/ver-logs.ps1` (PowerShell 5.1:
  guardado con BOM UTF-8 y CRLF —sin BOM PS5 rompe las tildes—; `.gitattributes` fuerza CRLF en
  .bat/.ps1). Sigue `docker compose logs -f`, colorea error/advertencia, filtra, convierte la marca
  de tiempo UTC de Docker a hora local, quita códigos ANSI y guarda opcional en `/logs/` (ignorado).
  El backend registra cada petición con `common/registro-peticiones.middleware.ts` (método, ruta,
  código, ms; 4xx = WARN, 5xx = ERROR; NUNCA body/headers). En Docker: `TZ` y `NO_COLOR=1` en el
  backend (compose) para logs en hora local y sin códigos de color.
- **Chequeos**: `cd frontend && npx tsc -p tsconfig.app.json --noEmit && npx oxlint src`;
  `cd backend && npx tsc --noEmit -p tsconfig.json && npx eslint <archivo>`.
- **Pruebas en navegador**: Playwright instalado FUERA del proyecto (carpeta temporal) usando el
  Chrome del sistema: `chromium.launch({ channel: 'chrome' })`.

## Base de datos nueva (MySQL, `database/schema.sql`)

Tablas: `areas`, `sub_areas`, `tecnicos`, `equipos`, `vinetas`. Rediseño de la BD de v1:
- Tablas por año de v1 (`vinetas2016…2024`) → una sola `vinetas` con columna **`periodo`** (YEAR) +
  índice. Particionar por periodo se descartó: InnoDB no permite FK en tablas particionadas (1506).
- Columnas `MMTO21/22/23` de v1 eliminadas (las reemplaza `periodo`).
- `vinetas.tag/descripcion/informacion` = **foto histórica** del equipo al crear la viñeta (v1
  sobreescribía todas las viñetas al editar el equipo; aquí NO).
- `nvineta` AUTO_INCREMENT (correlativo global; no se imprime, sirve para reimprimir).
- Mitre = sub-área **07** de Calderas (01), ya no una columna.
- `cod_empleado` UNIQUE en técnicos. `vinetas.admin_reviso_id` (FK a administradores) = encargado que
  aprobó el trabajo (antes `tecnico_reviso_id`, migración 004).
- Campos futuros documentados como comentario en schema.sql: `cumple`, `tiempo_horas`,
  `desmontaje`, `estado`, `tipo`.
- Códigos de área = prefijo numérico de los TAG: 01 Calderas, 02 Extracción, 03 Alcalizado/Sacarato,
  05 Evaporadores, 06 Tachos, 07 CV, 08 Centrífugas, 09 Secadora, 10 Clarificación, 11 Filtro Banda,
  12 Laboratorio, 13 Generación Eléctrica, 14 PTAR.
- `prisma db pull` CONSERVA los nombres de relación puestos a mano (`admin_revisor`,
  `vinetas_revisadas`) pero BORRA los comentarios del schema.prisma: guardar copia antes y restaurarlos.

## Reglas de negocio implementadas

**Permisos** (login solo para administradores; la planta usa la app sin sesión, como v1):
- Abierto: leer todo; crear y modificar equipos; crear/modificar/reimprimir viñetas.
- Solo admin: **eliminar** equipos; crear/editar/borrar técnicos y áreas/sub-áreas; marcar/quitar
  "revisada" en una viñeta (el revisor sale del token, nunca del body).
- Frontend: `useExigirAdmin` redirige a `/login` (con `state.desde` para volver); ante un 401 el
  `AuthContext` redirige al login. La seguridad real está en el backend.

**Equipos**:
- "Nuevo equipo" replica `nuevoEq.cs`: TAG = variable + modificador + función + `-` + área + sub-área
  (ej. `PT-0101`); Información = rango + unidad + **4 espacios** + señal; descripción en Title Case
  (como `ToTitleCase` de C#: respeta palabras en mayúsculas). Opciones en `equipoCatalogos.ts`.
- **TAG especiales**: Caldera Mitre (01/07) y Turbo TGM (13/05) tienen TAG con formato propio →
  modo "TAG completo" manual (`UBICACIONES_TAG_ESPECIAL`); casilla para otras excepciones.
- **En uso / Hibernación se excluyen**: en el form (`onValuesChange`) y en el backend
  (`EquiposService.aplicarExclusionDeEstados`: hibernacion→en_uso=false, en_uso→hibernacion=false,
  ambos true → 400). La tabla muestra un solo estado.
- Crear: solo 4 campos (DTO + `forbidNonWhitelisted`); modificar: todos. Vaciar un campo = `null`.

**Administradores, técnicos y equipos (2026-10-02, migración 003)**:
- `administradores` (usuario UNIQUE, nombre, tecnico_id NULL UNIQUE FK, password_hash, activo). Desde
  la migración 004 el login es **usuario + clave** (usuario sin distinguir mayúsculas); el vínculo a
  un técnico es opcional (solo si ese admin también saca viñetas). Módulo `administradores` (todo con
  AdminAuthGuard): GET/POST/PATCH, sin DELETE (se desactiva); no deja desactivarse a uno mismo ni al
  último activo; nunca devuelve password_hash. Pantalla `AdministradoresPage` en Administración. `tecnicos` ya NO tiene password_hash/es_admin; ganó `identificador`
  (= `Instrumentistas.Pass` de v1: NO es contraseña, es el código que los compañeros conocen).
  Login: mensaje genérico salvo admin desactivado CON clave correcta. JWT `sub` = administradores.id (tokens viejos con sub = tecnico.id: cerrar sesión y volver a entrar).
- `scripts/importar-tecnicos.ts`: SQL Server `Instrumentistas` → `tecnicos` (une por CodEmp, si no
  por nombre; normaliza espacios; simulación por defecto, `--aplicar` escribe; idempotente; nunca
  borra). Probado contra SQL Server de prueba y en Docker.
- `sub_areas.tag_especial` (reemplaza la lista fija del frontend; Mitre 01/07 y TGM 13/05 en true).
- Formato en el BACKEND (`common/formato-texto.ts`, EquiposService): TAG → MAYÚSCULAS; descripción →
  Title Case estilo C# (palabras TODO MAYÚSCULAS se respetan). MySQL compara TAG sin distinguir
  mayúsculas (collation ci) → "pt-1" y "PT-1" son duplicado.
- Modificar equipo (`EquipoFormModal`): TAG normal = "letras" + sufijo de la ubicación; especial o
  formato no estándar → manual. Botón "Guardar e imprimir". `useFlujoVineta.modificarEquipo` (pide el
  equipo vigente al servidor) y enlace "Modificar equipo" en la ventana de nueva viñeta.
- Menú: público (Inicio, Equipos, Viñetas, Otras Viñetas) + sección "Administración" solo con sesión
  (Grupos, Áreas y sub-áreas, Técnicos), rutas envueltas en `auth/RutaAdmin.tsx` (redirige a login).

**Decisión de datos (2026-10-02)**: el sistema arranca el PRÓXIMO AÑO sin historial de viñetas.
Corte en un día (sin convivencia ni sync). Pendiente de hablar con el jefe: opción recomendada =
base vieja pasada completa a MySQL como archivo histórico + sistema nuevo con equipos/áreas desde el
JSON de la base depurada (pedir que incluya el ID del equipo en la base vieja).

**Grupos de trabajo** (2026-09-30, pedido del usuario; inspirado en su "programa de rutinas"):
- Tablas `grupos_trabajo` (periodo, nombre; UNIQUE periodo+nombre), `grupo_tecnicos`,
  `grupo_sub_areas`. Reglas garantizadas POR LA BD: técnico en 1 solo grupo por periodo
  (UNIQUE tecnico_id+periodo) y sub-área en 1 solo grupo por periodo (UNIQUE sub_area_id+periodo).
  El `periodo` copiado en las tablas intermedias no puede divergir: FK COMPUESTA
  (grupo_id, periodo) → grupos_trabajo(id, periodo). ON DELETE CASCADE al borrar el grupo.
- "Asignar área completa" = asignar todas sus sub-áreas (TreeSelect con SHOW_CHILD). Sub-áreas
  creadas después NO se agregan solas.
- API: `GET /grupos?periodo=` (abierto), `POST/PATCH/DELETE /grupos` y `PUT /grupos/:id/tecnicos`
  `{tecnico_ids}` / `PUT /grupos/:id/sub-areas` `{sub_area_ids}` (admin; PUT REEMPLAZA la lista en una
  transacción; 409 con nombres si algo ya está en otro grupo).
- `GET /dashboard/avance?periodo=` (total + grupos + `sinGrupo` + áreas→sub-áreas) y
  `GET /dashboard/sub-areas/:id/instrumentos?periodo=` (equipos activos + su viñeta del periodo o
  null). Activo = en_uso && !hibernacion en TODO el cálculo; los totales cuadran (verificado).
- Frontend: `GruposPage` (+ `GrupoFormModal`), Inicio (`DashboardPage`) con tarjetas de grupos y
  áreas, `InstrumentosSubAreaDrawer` (imprimir pendientes con `useFlujoVineta`), `SelectorPeriodo`,
  `ImagenArea` (GIF en `frontend/public/areas/<codigo>.gif`, el usuario los hará con Gemini; fallback
  Avatar de color con el código).
- Bases ya creadas: `database/migraciones/001-grupos-trabajo.sql` (Docker solo corre schema.sql con
  volumen vacío).
- Comparado con el dashboard de Rutinas (sistema ASP.NET de la planta, otro repo; 2026-10-01): allí los
  grupos son permanentes, un empleado puede estar en varios, y el área sale del texto `equipos.Area` +
  palabras clave. Se mantuvo nuestro diseño (por periodo, exclusivo, por sub-área con ID) y se
  adoptaron 3 cosas a pedido del usuario:
  - **Avance de la semana**: corte = JUEVES anterior (`common/fecha-local.ts` → `corteSemanal`; si hoy
    es jueves, el de hace 7 días). Cada Avance trae `semana: {completados, porcentaje}` (puntos de %
    sobre el total de hoy); `/dashboard/avance` trae `hoy`, `corteSemanal`, `vinetasHoy`,
    `vinetasSemana` (viñetas impresas, no equipos distintos).
  - **Colores/orden**: verde ≥75, amarillo ≥40, rojo (`frontend/src/utils/avance.ts`); grupos, áreas y
    sub-áreas ordenadas por % desc (vacías al final).
  - **Áreas excluidas**: columna `areas.excluida_mantenimiento` (migración 002), PATCH /areas/:id
    (admin), interruptor en la pantalla Áreas; EQUIPO_CONTABLE = activo && área no excluida, usado en
    TODOS los totales (también resumen-calibracion). `areasExcluidas` en la respuesta.
  - NO adoptado: ranking por técnico (el usuario no lo eligió por ahora).
- **Zona horaria**: "hoy", el corte y el periodo por defecto se calculan en `America/Guatemala`
  (variable `ZONA_HORARIA`) con Intl, no con la hora del servidor (en Docker es UTC).

**Viñetas**:
- `periodo` = año de `fecha` con **`getUTCFullYear()`** (con `getFullYear` el 1 de enero caía en el
  año anterior por la zona horaria).
- Nueva viñeta (desde el TAG o botón Imprimir de Equipos): fecha = hoy, **Próximo = fecha + 1 año**
  (se recalcula al cambiar la fecha, editable), "Realizó" = técnico activo obligatorio; si el equipo
  ya tiene viñeta ese año, aviso + "Reimprimir esa". Guardar abre la impresión.
- Editables: fecha, técnico, próximo, mantenimiento. No: equipo ni la foto histórica.
- Dashboard "Faltan X de Y": activos = en_uso && !hibernacion; completados = con viñeta en el
  periodo actual (distinct por equipo).

## Etiqueta e impresión (Brady M611)

- Cartucho **Brady M6-31-423 = 38.1 × 25.4 mm** (1.5" × 1"), horizontal (`ETIQUETA_MM` en
  `modulos/vinetas/impresion/datosVineta.ts`).
- `EtiquetaVineta.tsx` replica la viñeta de v1 (foto en `media/diseniodevineta.jpeg`) con posiciones
  absolutas en mm: logo MTI (símbolo en negro, `assets/logo-mti-negro.png`, importado `?inline`),
  código de barras **Code 39** del TAG + texto `*TAG*`, descripción e información centradas,
  "MMTO FECHA: dd/MM/yyyy", "REALIZO:Nombre", "PROX. MMTO:MM/yyyy". Reimpresión usa la foto guardada.
- `VinetaImpresion.tsx`: copia la etiqueta a un iframe oculto con `@page size` y llama `print()`
  (diálogo de Windows; la M611 por USB es una impresora más). Espera `img.decode()` antes.
- La M611 está por USB en otra PC de la red: allí se abre `http://<IP-servidor>:8090` y se imprime.
- **Pendiente: imprimir SIN diálogo**. Investigado: Brady SDK Web → M611 solo por Bluetooth (HTTPS,
  bitmap); SDK Windows no lista la M611; puerto 9100 no documentado para la M611. Opciones: Chrome
  `--kiosk-printing` (sin código), **agente de impresión local** (recomendado), Brady Web SDK,
  9100 si se confirma. Ver README "Impresión de viñetas".

## [DESCARTADO 2026-10-02] Arquitectura de 2 adaptadores
> Reemplazado por: **una sola base MySQL** (ver "Decisión de datos" arriba). Se conserva esta sección
> porque el relevamiento de la BD de producción (más abajo) sigue siendo válido para importar datos.

Hoy el despliegue real tiene **SQL Server** (BD `Vinetas`, esquema de v1); más adelante se migrará a
MySQL. Decisión: la app habla con **interfaces de repositorio** con dos implementaciones elegidas
por variable de entorno:
- **Adaptador SQL Server** con el esquema de v1 → el programa nuevo y el viejo escriben en la
  **misma** BD durante la transición (reemplaza el plan anterior de un job de sincronización).
- **Adaptador MySQL** con `schema.sql` (lo que existe hoy con Prisma).

Esquema de v1 (tablas principales): `equipos` (ID, TAG, Descripcion, Informacion, Area texto, MITRE
bit, LRV/HRV/Escala numeric, EU, Marca, Modelo, Serie, Tipo, Diametro, Sello, Cuadratico, EnUSO,
Hibernacion, MMTO21/22/23), `vinetas` (Nvineta PK sin identity, ID, TAG char15, Descripcion char84,
Informacion char40, Fecha date, Realizo char20 = nombre del técnico, Proximo char10 "MM/yyyy",
Mantenimiento char150), `vinetas2016…2024` (históricos, sin 2019), `Instrumentistas` (ID, nombre,
CodEmp, Pass, cargo — nunca mostrar Pass), `Areas` (ID, Tag = área+sub-área ej. "0101", Area texto;
sin FK). Columnas CHAR con espacios de relleno → hacer trim. v1 calcula IDs con `MAX()+1`.

**Estado REAL de la BD de producción** (relevado en la PC de la empresa, 2026-09-30; el detalle con
datos de infraestructura está en `media/*.txt`, excluido del repo). Difiere de `bd.sql`:
- `equipos` (~2.2k filas) tiene columna nueva **`TAG_Control` varchar(50)** (significado por confirmar).
  `ID` no es IDENTITY → v1 usa `MAX(ID)+1`.
- `Instrumentistas` (~21) tiene columna nueva **`Inactivo` bit** (→ `activo = !Inactivo`).
- `vinetas` = año activo (2026, ~1.2k filas); históricos `vinetas2016…2025` (sin 2019). Al cerrar el
  año se "congela" en una tabla nueva y `vinetas` queda para el año siguiente.
- Nuevas: `Certificados2024`, `CertificadoMano2024`, `equipos_backup_20260903` (respaldo, ignorar).
- `Areas` (~150 filas) NO se relaciona con nada (catálogo viejo sin uso): la ubicación NO debe salir de
  ahí. `equipos.Area` es texto libre.
- **No hay ninguna FK declarada** en toda la BD. Relaciones implícitas: `vinetas.ID → equipos.ID`
  (confiable); `vinetas.TAG` = foto congelada (puede no coincidir con `equipos.TAG` actual);
  `vinetas.Realizo → Instrumentistas.Instrumentistas` por **texto** (RTRIM); `Instrumentistas.CodEmp`
  apunta a una BD de RR.HH. en otro servidor.
- El diagnóstico `probar-sqlserver.ts` funciona con esta estructura (probado simulándola).

Implicaciones para el adaptador SQL Server (a resolver al diseñarlo):
- **Truncamiento**: `vinetas` tiene `TAG char(15)`, `Descripcion char(84)`, `Informacion char(40)`,
  `Realizo char(20)` — más cortos que en la BD nueva (30/200/100). Validar/recortar antes de insertar
  o SQL Server rechaza con "String or binary data would be truncated".
- `Nvineta` y `equipos.ID` con `MAX()+1` mientras v1 sigue escribiendo → posible colisión: insertar
  dentro de una transacción con bloqueo (`UPDLOCK, HOLDLOCK`) y reintentar ante clave duplicada.
- Historial = `vinetas` UNION `vinetas20xx`; "ya tiene viñeta este año" y dashboard = solo `vinetas`.
- `Realizo` guarda el NOMBRE del técnico (no un ID); `Proximo` es texto `MM/yyyy`.
- Login de admin: `Instrumentistas.Pass` es char(6) en texto plano → NO usarlo. `CodEmp` (int) es el
  usuario del login y lo usa el sistema de rutinas como ID → NO guardar ahí el hash (no cabe y rompería
  ese enlace). Propuesta recomendada (pendiente de que el usuario la aplique desde la PC remota):
  **tabla nueva `AdminWeb` (CodEmp, PassHash char(60), Activo)** sin tocar tablas de v1. Alternativa:
  columnas nuevas en Instrumentistas (v1 usa SELECT * y INSERT con columnas explícitas → no rompe).
- Datos de v1 con `EnUSO=1` y `Hibernacion=1` a la vez: al leer, hibernación manda.

Existe además una BD depurada con los equipos bien nombrados (formato por confirmar con el usuario:
"otro motor / Excel"). Los Excel de inventario tienen equipos repetidos.

**Diagnóstico** (paso previo, listo): `backend/scripts/probar-sqlserver.ts` — solo SELECT; tablas,
conteos, filas de ejemplo (oculta Pass), estados, TAG repetidos. Variable `SQLSERVER_URL` (formato de
App.config + `;Encrypt=false;TrustServerCertificate=true`, **entre comillas simples** en el `.env`:
sin ellas Docker Compose interpola `$` y corta la contraseña). Siguiente: correrlo en la PC de la
empresa (única con acceso al servidor) y con esa salida programar el adaptador.

**Carga y precarga (frontend, 2026-10-03)**:
- Consultas compartidas en `api/consultas.ts` (`queryOptions`): la pantalla y la precarga usan la
  MISMA queryKey. `staleTime: 30_000` global (main.tsx) para que lo precargado no se vuelva a pedir.
- `rutas/precarga.ts`: al pasar el mouse por el menú (`EnlaceMenu` en AppLayout) se adelanta el código
  de la pantalla y, en Inicio/Equipos/Viñetas, sus datos. En el Inicio, hover sobre una sub-área
  precarga sus instrumentos. Verificado: 3 hovers = 1 sola petición; al hacer clic, sin spinner.
- Code splitting: `rutas/pantallas.tsx` (React.lazy) + `rutas/cargaPantallas.ts` (los `import()`, aparte por
  la recarga en caliente). Inicio y Login NO son diferidas. `Suspense` con `PantallaDeCarga` dentro
  del layout (el menú sigue visible).
- `main.tsx` escucha `vite:preloadError` (pestaña abierta con una versión vieja tras un despliegue →
  falta un chunk): recarga UNA vez por pestaña (bandera en sessionStorage).
- `frontend/nginx.conf`: **gzip** (la imagen de nginx lo trae apagado; JS de antd 740 → 242 KB,
  también comprime el JSON del backend) + caché: `/assets/` 1 año `immutable` (nombres con hash) y
  `try_files $uri =404` (nunca index.html en lugar de un JS); `index.html` con `no-cache`. Probado
  con `nginx:1.27-alpine` sirviendo `dist/` y `--add-host backend:host-gateway`.

## Gotchas conocidos (no repetir)

- **Fechas DATE**: llegan como `"2026-09-29T00:00:00.000Z"`; con `new Date()` en Guatemala (UTC−6)
  muestran un día menos → tratarlas como texto (`utils/fechas.ts`).
- **antd + TanStack Query**: `onError: (e) => message.error(...)` sin llaves devuelve una thenable y
  la mutation queda pendiente para siempre → usar siempre llaves.
- **Form.useForm dentro de un Modal** sobrevive entre aperturas → `key={aperturas}` para reiniciarlo.
- Columnas `DECIMAL` (lrv/hrv/escala) llegan como **string** (Decimal de Prisma) → `Number()`.
- Prisma 7: generador `prisma-client-js` (el nuevo genera ESM, incompatible con Nest CJS) y adapter
  obligatorio. Nest no carga `.env` solo → `@nestjs/config`.
- `nest start --watch` en Windows puede caerse al recompilar ("no se encontró el proceso") y dejar un
  node huérfano en :3000 que no recarga → matar el proceso y relanzar.
- CORS en desarrollo acepta localhost en cualquier puerto; en producción solo `FRONTEND_URL`.
- Docker: el nombre de proyecto es `vinetas` (la "ñ" de la carpeta no es válida); MySQL 8.4 necesita
  `?allowPublicKeyRetrieval=true` con el driver mariadb; `schema.sql` empieza con `SET NAMES utf8mb4`
  (sin eso el initdb guardaba las tildes corruptas).
- PowerShell 5: redirigir con `>` escribe UTF-16 (corrompe tildes) → usar `docker compose cp`.
- Git Bash: `curl -d` con tildes inline corrompe UTF-8 → `--data-binary @archivo.json`; rutas que
  empiezan con `/` se convierten → `MSYS_NO_PATHCONV=1` con `docker exec`.
- Al probar con servidores propios, no dejar procesos ocupando 3000/5173: chocan con los del usuario.
- antd 6: `Divider` usa `titlePlacement="start"` (ya no `orientation="left"`); los avisos flotantes
  son `.ant-message-notice` (para selectores de Playwright).
- Reescribir archivos con un script (abrir en modo "w") puede hacer que Vite lea el archivo VACÍO a
  mitad de escritura y lo deje en caché ("does not provide an export named …") → `touch` al archivo.

## Pendientes (en orden aproximado)

1. Correr el diagnóstico SQL Server en la PC de la empresa → programar el **adaptador SQL Server**
   (repositorios con dos implementaciones).
2. ~~Formularios de Técnicos y Áreas/Sub-áreas~~ (hecho 2026-10-03).
3. Confirmar formato de TAG de Mitre/TGM y cómo se distinguen equipos iguales en la misma sub-área.
4. Impresión sin diálogo (según prueba de red de la M611) y prueba física de la etiqueta.
5. "Otras Viñetas" (Calibrado, No Interviene, Fuera de Uso, Personalizado) — hoy placeholders.
6. Pedidos del usuario para más adelante: animaciones (vista previa de la viñeta mientras se llena el
   formulario), **modo oscuro** (antd `theme.darkAlgorithm`), **diseño responsivo** para móviles.
7. Seguridad: recomendar cambiar la contraseña débil de SQL Server de v1 (estaba en texto plano en
   la configuración del programa viejo).

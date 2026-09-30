# Viñetas — Sistema de gestión de mantenimiento e inspección de instrumentos

Ingenio La Cabaña — Departamento de Metrología e Instrumentación.

Rediseño web del sistema de viñetas (etiquetas de mantenimiento y calibración de
instrumentos industriales), desarrollado como proyecto de práctica de bootcamp full-stack.
Reemplaza a un sistema anterior en Windows Forms + C# + Crystal Reports + SQL Server Express,
que sigue en producción durante la transición y **no forma parte de este repositorio**.

| Carpeta | Contenido |
|---|---|
| [`database/`](database/) | `schema.sql` — script de creación de la base de datos MySQL |
| [`backend/`](backend/) | API en NestJS + Prisma |
| [`frontend/`](frontend/) | Interfaz web en React + Vite + TypeScript |
| [`media/`](media/) | Foto de la viñeta original (referencia de diseño) y logo |

### Stack
- **Backend:** Node.js + NestJS + Prisma
- **Base de datos:** MySQL (Docker, contenedor `mysql-kodigo`)
- **Frontend:** React + Vite + TypeScript, Ant Design (UI), TanStack Query (datos), React Router, axios
- **Impresión:** Brady M611, cartucho M6-31-423 (ver [Impresión de viñetas](#impresión-de-viñetas-brady-m611))

## Despliegue con Docker (pruebas)

Levanta el sistema completo con un solo comando, en 3 contenedores:

```
Navegador ──► :8090  [frontend: nginx]
                       ├─ /        → la aplicación React (ya compilada)
                       └─ /api/... → [backend: NestJS] ──► [mysql 8.4]
```

El navegador solo habla con nginx (puerto 8090). El backend y la base de datos quedan dentro de
la red interna de Docker.

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y **abierto**
  (el ícono de la ballena en la barra de tareas debe estar en verde / "Engine running").
- Git.

### Paso a paso (PowerShell)

**1. Descargar el proyecto** (solo la primera vez):
```powershell
git clone https://github.com/FranklinGranados/VINETAS2.0.git
cd VINETAS2.0
```
Si ya lo tienes, entra a la carpeta y trae la última versión con `git pull`.

**2. Crear el archivo de configuración** `.env` a partir del ejemplo:
```powershell
Copy-Item .env.example .env
```

**3. Generar las claves** y pegarlas en `.env` (abrirlo con `notepad .env`):
```powershell
# Clave para MYSQL_ROOT_PASSWORD (solo letras y números):
node -e "console.log(require('crypto').randomBytes(12).toString('hex'))"
# Clave para JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Si esa PC no tiene Node.js, sirve cualquier texto largo de letras y números inventado.
**Guarda la clave de MySQL**: la necesitas para conectarte a la base de datos.

**4. Construir y levantar:**
```powershell
docker compose up -d --build
```
La primera vez tarda varios minutos (descarga imágenes e instala dependencias). Al terminar,
verificar que los 3 contenedores estén corriendo y MySQL diga `(healthy)`:
```powershell
docker compose ps
```

**5. Crear el primer administrador** (solo la primera vez, o para resetear una contraseña):
```powershell
docker compose exec backend node dist/scripts/seed-admin.js 1001 "Nombre Apellido" "contraseña"
```
(`1001` = código de empleado, que es el usuario para iniciar sesión.)

**6. Abrir la aplicación:** http://localhost:8090

Desde otras PCs de la red: `http://<IP-de-esta-PC>:8090`. La IP se ve con `ipconfig`
("Dirección IPv4"). Si no abre, hay que permitir el puerto 8090 en el Firewall de Windows.

### Comandos del día a día

| Qué | Comando |
|---|---|
| Ver estado de los contenedores | `docker compose ps` |
| Ver logs del backend (en vivo, `Ctrl+C` para salir) | `docker compose logs -f backend` |
| Detener todo (**los datos se conservan**) | `docker compose down` |
| Volver a levantar | `docker compose up -d` |
| Actualizar a la última versión del código | `git pull` y luego `docker compose up -d --build` |
| Reiniciar solo el backend | `docker compose restart backend` |

### Base de datos

- **Conectarse** con MySQL Workbench / DBeaver: host `localhost`, puerto `3307`, usuario `root`,
  contraseña = `MYSQL_ROOT_PASSWORD` del `.env`, base de datos `vinetas`.
- La primera vez, las tablas y las áreas/sub-áreas se crean solas desde
  [`database/schema.sql`](database/schema.sql).
- **Respaldo** (genera `respaldo.sql` en la carpeta actual):
  ```powershell
  docker compose exec mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" vinetas > /tmp/respaldo.sql'
  docker compose cp mysql:/tmp/respaldo.sql ./respaldo.sql
  ```
  (Se hace en dos pasos a propósito: redirigir con `>` directamente en PowerShell 5 guarda el
  archivo en UTF-16 y corrompe las tildes.) El aviso `Using a password on the command line
  interface can be insecure` es normal en este comando. Los `respaldo*.sql` están en el
  `.gitignore`: contienen datos reales y nunca deben subirse al repositorio.
- **Borrar TODO y empezar de cero** (⚠ elimina todos los datos: equipos, viñetas, técnicos):
  ```powershell
  docker compose down -v
  docker compose up -d
  ```

### Si algo falla

| Síntoma | Qué revisar |
|---|---|
| `port is already allocated` al levantar | Otro programa usa el 8090 o el 3307: cambiar `WEB_PORT` o `MYSQL_PORT` en `.env` y volver a levantar |
| `Falta MYSQL_ROOT_PASSWORD en .env` (o `JWT_SECRET`) | No se creó el `.env` (paso 2) o falta esa línea |
| La app abre pero dice "No se pudo cargar…" | `docker compose logs backend` — el error exacto aparece ahí |
| El backend se reinicia una y otra vez | `docker compose logs backend`; si menciona la base de datos, verificar `docker compose ps` que mysql esté `(healthy)` |
| Cambié `MYSQL_ROOT_PASSWORD` y ya no conecta | La clave se fija la **primera** vez que se crea la base. Volver a la clave anterior, o borrar todo con `docker compose down -v` (⚠ pierde los datos) |
| Docker dice que no encuentra el motor | Abrir Docker Desktop y esperar a que diga "Engine running" |

> La impresión de viñetas funciona igual que en desarrollo: se imprime desde el navegador de la
> PC que tiene la Brady M611 conectada (ver [Impresión de viñetas](#impresión-de-viñetas-brady-m611)).

## Cómo levantar el entorno de desarrollo (para programar)

Se necesitan **3 procesos** corriendo a la vez, cada uno en su propia terminal:

| # | Qué | Comando | Dirección |
|---|---|---|---|
| 1 | MySQL (Docker) | `docker start mysql-kodigo` | `localhost:3306` |
| 2 | Backend (API) | `cd backend` → `npm run start:dev` | http://localhost:3000 |
| 3 | Frontend | `cd frontend` → `npm run dev` | http://localhost:5173 |

- `npm run start:dev` (backend) y `npm run dev` (frontend) son **modo desarrollo**: se
  recargan solos al guardar un archivo. Para producción se usa `npm run build` en cada uno
  (el backend queda en `dist/` y se corre con `npm run start:prod`; el frontend genera
  archivos estáticos en `dist/` que sirve un servidor web).
- La primera vez: `npm install` en `backend/` y en `frontend/`, y copiar cada `.env.example`
  a `.env` en su carpeta (`backend/.env` con las credenciales reales de la base de datos).
  Los `.env` **nunca** se suben al repositorio: ahí van contraseñas y cadenas de conexión.
- Base de datos desde cero: ejecutar [`database/schema.sql`](database/schema.sql) en MySQL.
- Primer usuario administrador: `cd backend` → `npm run seed:admin -- <cod_empleado> <nombre> <password>`.

## Cómo probar

### 1. A mano, desde el navegador
Con los 3 procesos arriba, abrir http://localhost:5173 y usar el sistema normalmente.
Para ver qué viaja entre el frontend y el backend: **F12 → pestaña Red (Network)**,
cada petición muestra método, URL, lo que se envió y lo que respondió el backend.

### 2. La API directamente (sin frontend)
Útil para aislar si un problema es del frontend o del backend:

```bash
curl http://localhost:3000/equipos
curl -X POST http://localhost:3000/equipos -H "Content-Type: application/json"      -d '{"sub_area_id":1,"tag":"PRUEBA-01","descripcion":"x","informacion":"y"}'
curl -X DELETE http://localhost:3000/equipos/<id>
```

También sirve cualquier cliente gráfico (Postman, Insomnia, Thunder Client en VS Code).
Nota: en Git Bash de Windows, texto con tildes pasado inline a `curl -d` se corrompe;
usar un archivo: `curl ... --data-binary @datos.json`.

### 3. La base de datos
Conectarse a MySQL para ver qué quedó guardado realmente:

```bash
docker exec -it mysql-kodigo mysql -u root -p vinetas
```

o con un cliente gráfico (MySQL Workbench, DBeaver, extensión de VS Code) a
`localhost:3306`, usuario y clave de `backend/.env`.

### 4. Chequeo de tipos
```bash
cd frontend && npx tsc -p tsconfig.app.json --noEmit
```

## Impresión de viñetas (Brady M611)

### La etiqueta
- Cartucho **Brady M6-31-423**: 38.1 × 25.4 mm (1.5" × 1"), poliéster blanco, se imprime en horizontal.
- El diseño replica la viñeta que imprimía el sistema anterior (foto de referencia en
  [`media/diseniodevineta.jpeg`](media/diseniodevineta.jpeg)): logo MTI, código de barras
  **Code 39** del TAG, descripción, información, fecha de mantenimiento, técnico y próximo mantenimiento.
- Código: [`frontend/src/components/EtiquetaVineta.tsx`](frontend/src/components/EtiquetaVineta.tsx)
  (medidas en `ETIQUETA_MM`, dentro de `datosVineta.ts`).

### Imprimir hoy (impresora por USB, con diálogo)
1. Desde **Equipos** (botón *Imprimir* o clic en el TAG) o **Viñetas** (*Reimprimir*) se abre la vista previa.
2. *Imprimir* abre el diálogo de Windows: elegir la **Brady M611**.
3. Si la etiqueta sale girada o cortada: orientación **Horizontal** en el diálogo o en las
   preferencias del driver de Brady.

### Probar impresión SIN diálogo (sin programar nada)
Chrome tiene un modo que imprime directo a la impresora predeterminada:
1. Poner la **Brady M611 como impresora predeterminada** de Windows.
2. Crear un acceso directo a Chrome con este destino:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing http://localhost:5173
   ```
3. Cerrar **todas** las ventanas de Chrome y abrirlo desde ese acceso directo.
4. Al tocar *Imprimir*, la etiqueta sale directo, sin ventana.

Limitación: se configura en cada PC y usa siempre la impresora predeterminada.

### Probar la impresora en red (Wi-Fi)
Para decidir cómo implementar la impresión directa desde el sistema:
1. Conectar la M611 al Wi-Fi siguiendo la
   [guía de Brady](https://support.bradyid.com/s/article/How-to-Setup-Wi-Fi-Networking-On-the-M611-Printer)
   y anotar su **IP**.
2. Verificar si acepta impresión directa por red (puerto 9100), en PowerShell:
   ```powershell
   Test-NetConnection <IP-de-la-impresora> -Port 9100
   ```
   `TcpTestSucceeded : True` → el puerto está abierto (hay que confirmar qué formato de datos acepta;
   Brady no lo documenta para la M611).
3. Agregarla en Windows como **impresora de red** (por IP) con el driver de Brady y hacer una
   impresión normal. Si funciona, el sistema puede imprimir a través del driver desde cualquier PC.

### Opciones evaluadas para imprimir sin diálogo (pendiente de implementar)

| Opción | Cómo funciona | Estado |
|---|---|---|
| Chrome `--kiosk-printing` | Chrome imprime directo a la predeterminada | Funciona hoy, sin código |
| **Agente de impresión local** (recomendada) | Programa en la PC con la impresora que recibe la orden del sistema y la envía al driver de Windows | Por programar |
| Brady Web SDK | El navegador envía la etiqueta como imagen por **Bluetooth** (requiere HTTPS) | Oficial de Brady, solo Bluetooth |
| Puerto 9100 directo | El backend envía los datos por TCP a la IP de la impresora | No documentado para la M611; depende de la prueba de arriba |

Referencias: [Brady SDK — componentes soportados](https://sdk.bradyid.com/supported_components/),
[soporte BradyPrinter M611](https://www.bradyid.com/support/printer/bradyprinter-m611).

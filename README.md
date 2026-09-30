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

## Cómo levantar el entorno de desarrollo

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

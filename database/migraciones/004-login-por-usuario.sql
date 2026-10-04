-- Migración 004 — Administradores con usuario propio y revisión por
-- administrador (2026-10-02)
-- Para bases de datos YA creadas con una versión anterior de schema.sql.
-- (Una instalación nueva no la necesita: schema.sql ya incluye todo esto.)
--
-- Cambios:
--  - administradores: login con USUARIO + clave (antes, código de empleado);
--    nombre propio; vínculo con un técnico pasa a ser OPCIONAL.
--  - vinetas: "revisó" apunta a administradores (antes a tecnicos), porque
--    puede revisar un administrador que no es técnico.
-- No se pierde información: a los administradores existentes se les asigna
-- como usuario su código de empleado (ej. "1001") y su nombre de técnico; las
-- revisiones existentes se copian a la columna nueva antes de quitar la vieja.
--
-- Ejecutar con Docker (PowerShell, desde la raíz del proyecto):
--   docker compose cp database/migraciones/004-login-por-usuario.sql mysql:/tmp/migracion.sql
--   docker compose exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /tmp/migracion.sql'
-- Sin Docker: importarla con phpMyAdmin / Workbench.

SET NAMES utf8mb4;
USE vinetas;

-- 1. Usuario y nombre propios; técnico opcional
ALTER TABLE administradores
  ADD COLUMN usuario VARCHAR(50)  NULL COMMENT 'Usuario del login (no distingue mayúsculas)' AFTER id,
  ADD COLUMN nombre  VARCHAR(100) NULL COMMENT 'Nombre completo que se muestra' AFTER usuario,
  MODIFY tecnico_id INT NULL COMMENT 'Técnico vinculado, si también saca viñetas';

UPDATE administradores a JOIN tecnicos t ON t.id = a.tecnico_id
SET a.usuario = COALESCE(CAST(t.cod_empleado AS CHAR), CONCAT('admin', a.id)),
    a.nombre  = t.nombre;

ALTER TABLE administradores
  MODIFY usuario VARCHAR(50)  NOT NULL COMMENT 'Usuario del login (no distingue mayúsculas)',
  MODIFY nombre  VARCHAR(100) NOT NULL COMMENT 'Nombre completo que se muestra',
  ADD UNIQUE KEY uq_administradores_usuario (usuario);

-- 2. Revisión de viñetas por administrador (copiando las existentes)
ALTER TABLE vinetas
  ADD COLUMN admin_reviso_id INT NULL COMMENT 'Encargado (administrador) que revisó y aprobó el trabajo' AFTER tecnico_id,
  ADD CONSTRAINT fk_vinetas_admin_reviso FOREIGN KEY (admin_reviso_id) REFERENCES administradores (id);

UPDATE vinetas v JOIN administradores a ON a.tecnico_id = v.tecnico_reviso_id
SET v.admin_reviso_id = a.id;

ALTER TABLE vinetas
  DROP FOREIGN KEY fk_vinetas_tecnico_reviso,
  DROP COLUMN tecnico_reviso_id;

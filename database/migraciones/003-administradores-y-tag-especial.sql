-- Migración 003 — Administradores aparte, identificador de técnicos y
-- sub-áreas con TAG especial (2026-10-02)
-- Para bases de datos YA creadas con una versión anterior de schema.sql.
-- (Una instalación nueva no la necesita: schema.sql ya incluye todo esto.)
--
-- No se pierde información: los administradores existentes (tecnicos con
-- es_admin = 1 y contraseña) se COPIAN a la tabla nueva antes de quitar
-- esas dos columnas de tecnicos.
--
-- Ejecutar con Docker (PowerShell, desde la raíz del proyecto):
--   docker compose cp database/migraciones/003-administradores-y-tag-especial.sql mysql:/tmp/migracion.sql
--   docker compose exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /tmp/migracion.sql'
-- Sin Docker: importarla con phpMyAdmin / Workbench.

SET NAMES utf8mb4;
USE vinetas;

-- 1. Tabla de administradores (ver explicación en schema.sql)
CREATE TABLE administradores (
  id            INT        NOT NULL AUTO_INCREMENT,
  tecnico_id    INT        NOT NULL,
  password_hash CHAR(60)   NOT NULL COMMENT 'Hash bcrypt (nunca la contraseña en texto plano)',
  activo        TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = acceso de administrador suspendido',
  creado_en     DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_administradores_tecnico (tecnico_id),
  CONSTRAINT fk_administradores_tecnico FOREIGN KEY (tecnico_id) REFERENCES tecnicos (id)
) ENGINE=InnoDB;

-- 2. Copiar los administradores actuales
INSERT INTO administradores (tecnico_id, password_hash)
SELECT id, password_hash FROM tecnicos
WHERE es_admin = 1 AND password_hash IS NOT NULL;

-- 3. Quitar de tecnicos lo que ahora vive en administradores
ALTER TABLE tecnicos DROP COLUMN password_hash, DROP COLUMN es_admin;

-- 4. Identificador del empleado en el taller (Instrumentistas.Pass de v1)
ALTER TABLE tecnicos
  ADD COLUMN identificador VARCHAR(10) NULL
  COMMENT 'Identificador del empleado en el taller (Instrumentistas.Pass de v1)'
  AFTER cod_empleado;

-- 5. Sub-áreas con TAG especial
ALTER TABLE sub_areas
  ADD COLUMN tag_especial TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1 = el TAG se escribe completo (formato propio)'
  AFTER nombre;

UPDATE sub_areas s JOIN areas a ON a.id = s.area_id
SET s.tag_especial = 1
WHERE (a.codigo = '01' AND s.codigo = '07')   -- Calderas / Caldera Mitre
   OR (a.codigo = '13' AND s.codigo = '05');  -- Generación Eléctrica / Turbo Generador TGM

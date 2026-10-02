-- Migración 002 — Áreas excluidas del avance del mantenimiento (2026-10-01)
-- Para bases de datos YA creadas con una versión anterior de schema.sql.
-- (Una instalación nueva no la necesita: schema.sql ya incluye esta columna.)
-- Segura con datos: agrega una columna con valor 0 (= todas las áreas cuentan).
-- Ejecutar con Docker (PowerShell, desde la raíz del proyecto):
--   docker compose cp database/migraciones/002-areas-excluidas.sql mysql:/tmp/migracion.sql
--   docker compose exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /tmp/migracion.sql'
-- Sin Docker: importarla con phpMyAdmin / Workbench.

SET NAMES utf8mb4;
USE vinetas;

ALTER TABLE areas
  ADD COLUMN excluida_mantenimiento TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1 = no cuenta para el avance del mantenimiento'
  AFTER nombre;

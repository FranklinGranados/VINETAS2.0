-- Migración 001 — Grupos de trabajo (2026-09-30)
-- Para bases de datos YA creadas con una versión anterior de schema.sql.
-- (Una instalación nueva no la necesita: schema.sql ya incluye estas tablas.)
-- Es segura de ejecutar en una base con datos: solo AGREGA tablas nuevas.
-- Ejecutar con Docker (PowerShell, desde la raíz del proyecto):
--   docker compose cp database/migraciones/001-grupos-trabajo.sql mysql:/tmp/migracion.sql
--   docker compose exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /tmp/migracion.sql'
-- Sin Docker: importarla con phpMyAdmin / Workbench.
-- Las tablas y sus reglas están explicadas en database/schema.sql.

SET NAMES utf8mb4;
USE vinetas;
-- =============================================================================
CREATE TABLE grupos_trabajo (
  id       INT         NOT NULL AUTO_INCREMENT,
  periodo  YEAR        NOT NULL COMMENT 'Temporada de mantenimiento (ej: 2026)',
  nombre   VARCHAR(60) NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_grupos_periodo_nombre (periodo, nombre),
  UNIQUE KEY uq_grupos_id_periodo (id, periodo)
) ENGINE=InnoDB;

-- =============================================================================
-- TABLA: grupo_tecnicos — integrantes de cada grupo
-- Regla: un técnico está en UN SOLO grupo por periodo.
--
-- ¿Por qué se repite "periodo" acá si ya está en grupos_trabajo? Para que la
-- regla la garantice la base de datos y no solo el código: el UNIQUE
-- (tecnico_id, periodo) impide meter al mismo técnico en dos grupos del mismo
-- año, aunque dos requests lleguen al mismo tiempo. Y para que ese "periodo"
-- copiado no pueda quedar distinto al del grupo, la FK es COMPUESTA:
-- (grupo_id, periodo) debe existir tal cual en grupos_trabajo (id, periodo).
-- =============================================================================
CREATE TABLE grupo_tecnicos (
  grupo_id    INT  NOT NULL,
  tecnico_id  INT  NOT NULL,
  periodo     YEAR NOT NULL,

  PRIMARY KEY (grupo_id, tecnico_id),
  UNIQUE KEY uq_grupo_tecnicos_tecnico_periodo (tecnico_id, periodo),
  CONSTRAINT fk_grupo_tecnicos_grupo   FOREIGN KEY (grupo_id, periodo)
    REFERENCES grupos_trabajo (id, periodo) ON DELETE CASCADE,
  CONSTRAINT fk_grupo_tecnicos_tecnico FOREIGN KEY (tecnico_id) REFERENCES tecnicos (id)
) ENGINE=InnoDB;

-- =============================================================================
-- TABLA: grupo_sub_areas — sub-áreas asignadas a cada grupo
-- Regla: cada sub-área pertenece a UN SOLO grupo por periodo (así el avance de
-- los grupos suma exactamente el total, sin contar instrumentos dos veces).
-- "Asignar un área completa" = asignar todas sus sub-áreas.
-- Misma técnica que grupo_tecnicos: UNIQUE (sub_area_id, periodo) + FK compuesta.
-- =============================================================================
CREATE TABLE grupo_sub_areas (
  grupo_id     INT  NOT NULL,
  sub_area_id  INT  NOT NULL,
  periodo      YEAR NOT NULL,

  PRIMARY KEY (grupo_id, sub_area_id),
  UNIQUE KEY uq_grupo_sub_areas_sub_area_periodo (sub_area_id, periodo),
  CONSTRAINT fk_grupo_sub_areas_grupo    FOREIGN KEY (grupo_id, periodo)
    REFERENCES grupos_trabajo (id, periodo) ON DELETE CASCADE,
  CONSTRAINT fk_grupo_sub_areas_sub_area FOREIGN KEY (sub_area_id) REFERENCES sub_areas (id)
) ENGINE=InnoDB;


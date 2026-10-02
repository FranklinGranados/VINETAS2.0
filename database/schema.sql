-- =============================================================================
-- BASE DE DATOS: vinetas
-- Sistema de gestión de mantenimiento e inspección de instrumentos industriales
-- Ingenio La Cabaña — Departamento de Metrología e Instrumentación
-- =============================================================================

-- Este archivo está en UTF-8. SET NAMES le dice a MySQL cómo interpretar
-- los bytes que le llegan: sin esto, un cliente configurado en latin1 (como
-- el que ejecuta los scripts de inicio del contenedor Docker de MySQL) lee
-- "ó" como dos caracteres raros y los guarda así ("ExtracciÃ³n").
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS vinetas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vinetas;

-- =============================================================================
-- AREAS
-- Zonas principales de la planta. Identificadas por un código de dos dígitos
-- que forma parte del TAG de sus instrumentos (ej: 01 = Calderas).
-- =============================================================================
CREATE TABLE areas (
  id      INT          NOT NULL AUTO_INCREMENT,
  codigo  CHAR(2)      NOT NULL COMMENT 'Código numérico del área (ej: 01, 02)',
  nombre  VARCHAR(100) NOT NULL,
  -- Áreas que NO cuentan para el avance del mantenimiento (no suman al total
  -- del Inicio ni de los grupos). Las marca un administrador.
  excluida_mantenimiento TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = no cuenta para el avance del mantenimiento',

  PRIMARY KEY (id),
  UNIQUE KEY uq_areas_codigo (codigo)
) ENGINE=InnoDB;

-- =============================================================================
-- SUB_AREAS
-- Subdivisiones dentro de cada área (ej: Molino 1, Molino 2 dentro de Extracción).
-- Para agregar una nueva sub-área basta con insertar una nueva fila.
-- =============================================================================
CREATE TABLE sub_areas (
  id       INT          NOT NULL AUTO_INCREMENT,
  area_id  INT          NOT NULL,
  codigo   CHAR(2)      NOT NULL COMMENT 'Código relativo al área (ej: 01, 02)',
  nombre   VARCHAR(100) NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_sub_areas_area_codigo (area_id, codigo),
  CONSTRAINT fk_sub_areas_area FOREIGN KEY (area_id) REFERENCES areas (id)
) ENGINE=InnoDB;

-- =============================================================================
-- TECNICOS
-- Instrumentistas autorizados para realizar inspecciones.
-- activo = 0 deshabilita al técnico sin eliminar su historial.
--
-- Generar/consultar viñetas NO requiere autenticación (cualquier técnico
-- registrado puede aparecer como "realizó"). password_hash y es_admin solo
-- se usan para el pequeño grupo de técnicos que además administran el
-- sistema (gestión de técnicos y de áreas/sub-áreas) — por eso ambas
-- columnas son opcionales: un técnico de campo normal nunca las tiene.
-- =============================================================================
CREATE TABLE tecnicos (
  id            INT          NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(100) NOT NULL,
  cod_empleado  INT          NULL     COMMENT 'Código interno del empleado en el ingenio; también es el usuario de login para administradores',
  cargo         VARCHAR(50)  NULL,
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  password_hash CHAR(60)     NULL     COMMENT 'Hash bcrypt. NULL = este técnico no puede iniciar sesión',
  es_admin      TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Habilita gestión de técnicos y áreas/sub-áreas',

  PRIMARY KEY (id),
  UNIQUE KEY uq_tecnicos_cod_empleado (cod_empleado)
) ENGINE=InnoDB;

-- =============================================================================
-- EQUIPOS
-- Catálogo de instrumentos de la planta. Cada equipo pertenece a una sub-área
-- y se identifica por su TAG único.
--
-- Al crear un equipo se requiere solo: sub_area_id, tag, descripcion, informacion.
-- Los datos técnicos (lrv, hrv, marca, etc.) se completan después al editar.
--
-- Campos de calibración:
--   lrv / hrv  — Low / High Range Value (rango del instrumento)
--   escala     — Span del instrumento
--   eu         — Engineering Units (mA, bar, °C, mmH2O, etc.)
--   cuadratico — Extracción de raíz cuadrada (instrumentos de flujo)
--
-- Campos de estado:
--   en_uso             — El instrumento está operativo y en servicio
--   hibernacion        — Temporalmente fuera de servicio
--   interviene_calidad — Impacta directamente la calidad del producto
--
-- Campos reservados para uso futuro:
--   tipo VARCHAR(50) — Categoría del instrumento (TRANSMISOR, RTD, VALVULA, etc.)
-- =============================================================================
CREATE TABLE equipos (
  id                  INT            NOT NULL AUTO_INCREMENT,
  sub_area_id         INT            NOT NULL,
  tag                 VARCHAR(30)    NOT NULL COMMENT 'Identificador único (ej: L(C)T-0201, LIT-0201A)',
  descripcion         VARCHAR(200)   NULL,
  informacion         VARCHAR(100)   NULL     COMMENT 'Información adicional del instrumento',
  interviene_calidad  TINYINT(1)     NOT NULL DEFAULT 0,

  -- Datos de calibración (se completan al editar el equipo)
  lrv                 DECIMAL(10, 4) NULL     COMMENT 'Low Range Value',
  hrv                 DECIMAL(10, 4) NULL     COMMENT 'High Range Value',
  escala              DECIMAL(10, 4) NULL,
  eu                  VARCHAR(30)    NULL     COMMENT 'Engineering Units (mA, bar, °C...)',

  -- Datos de identificación física
  marca               VARCHAR(100)   NULL,
  modelo              VARCHAR(100)   NULL,
  serie               VARCHAR(100)   NULL,
  diametro            VARCHAR(50)    NULL,
  sello               VARCHAR(100)   NULL,

  -- Comportamiento del instrumento
  cuadratico          TINYINT(1)     NOT NULL DEFAULT 0,

  -- Estado del equipo
  en_uso              TINYINT(1)     NOT NULL DEFAULT 1,
  hibernacion         TINYINT(1)     NOT NULL DEFAULT 0,

  PRIMARY KEY (id),
  UNIQUE KEY uq_equipos_tag (tag),
  CONSTRAINT fk_equipos_sub_area FOREIGN KEY (sub_area_id) REFERENCES sub_areas (id)
) ENGINE=InnoDB;

-- =============================================================================
-- VINETAS
-- Registros de inspección y calibración generados durante el período de
-- mantenimiento (entre zafras). Cada viñeta corresponde a la inspección
-- de un equipo en un período anual específico.
--
-- Por qué se guardan tag, descripcion, informacion (denormalizados):
--   Son la "foto" del equipo al momento de la inspección. Si el equipo
--   cambia de descripción en el futuro, el registro histórico debe conservar
--   los datos originales tal como aparecieron en la etiqueta impresa.
--
-- nvineta: correlativo global secuencial. Se muestra en el sistema para
--   identificar y reimprimir una viñeta, pero NO se imprime en la etiqueta.
--
-- La etiqueta física imprime: tag, descripcion, informacion, fecha, tecnico, proximo.
--
-- La columna periodo reemplaza el patrón de tablas separadas por año
-- (vinetas2016, vinetas2017...) del sistema original: todos los años viven
-- en una sola tabla y se filtran con WHERE periodo = 2024.
--
-- Se evaluó particionar la tabla por periodo (PARTITION BY RANGE), pero
-- MySQL/InnoDB no permite foreign keys en tablas particionadas (error 1506).
-- Se prefirió mantener las FK (integridad referencial garantizada por la
-- base de datos) en lugar de particionar, ya que el volumen de datos
-- esperado no justifica la partición física. El índice idx_vinetas_periodo
-- cubre el filtrado por año.
--
-- Campos reservados para uso futuro:
--   cumple TINYINT(1)      — Si el instrumento pasó la calibración
--   tiempo_horas DECIMAL   — Horas invertidas en el mantenimiento
--   desmontaje TINYINT(1)  — Si el instrumento fue desmontado
--   estado VARCHAR(20)     — PENDIENTE / EN PROCESO / COMPLETADO
--
-- tecnico_reviso_id (implementado): cuando un técnico imprime una viñeta,
-- llama a su encargado (un técnico con es_admin=1) a inspeccionar el
-- trabajo en sitio; si lo aprueba, el encargado la marca como revisada
-- desde su propia sesión — acá se guarda SU id, no el del técnico que
-- imprimió (ese ya está en tecnico_id). NULL = todavía nadie la revisó.
-- FK a tecnicos (no un INT suelto con el código de empleado) para poder
-- mostrar el nombre del encargado sin duplicar datos y para que la BD
-- garantice que apunta a un técnico real.
-- =============================================================================
CREATE TABLE vinetas (
  nvineta           INT          NOT NULL AUTO_INCREMENT COMMENT 'Correlativo global secuencial',
  equipo_id         INT          NOT NULL,
  tecnico_id        INT          NULL     COMMENT 'Técnico que realizó la inspección',
  tecnico_reviso_id INT          NULL     COMMENT 'Encargado (técnico con es_admin=1) que revisó y aprobó el trabajo',
  periodo           YEAR         NOT NULL COMMENT 'Año del período de mantenimiento (ej: 2026)',

  -- Datos denormalizados: foto del equipo al momento de la inspección
  tag           VARCHAR(30)  NULL,
  descripcion   VARCHAR(200) NULL,
  informacion   VARCHAR(100) NULL,

  -- Datos de la inspección
  fecha         DATE         NOT NULL COMMENT 'Fecha en que se realizó la inspección',
  proximo       DATE         NULL     COMMENT 'Fecha estimada del próximo mantenimiento',
  mantenimiento TEXT         NULL     COMMENT 'Registro del trabajo realizado (no se imprime en la etiqueta)',

  PRIMARY KEY (nvineta),
  INDEX idx_vinetas_periodo (periodo),
  CONSTRAINT fk_vinetas_equipo         FOREIGN KEY (equipo_id)         REFERENCES equipos  (id),
  CONSTRAINT fk_vinetas_tecnico        FOREIGN KEY (tecnico_id)        REFERENCES tecnicos (id),
  CONSTRAINT fk_vinetas_tecnico_reviso FOREIGN KEY (tecnico_reviso_id) REFERENCES tecnicos (id)
) ENGINE=InnoDB;

-- =============================================================================
-- TABLA: grupos_trabajo
-- En cada temporada de mantenimiento los técnicos se organizan en grupos y a
-- cada grupo se le asignan áreas/sub-áreas. Un grupo pertenece a UN periodo:
-- al año siguiente se arman grupos nuevos y los anteriores quedan de historial.
--
-- UNIQUE (id, periodo): redundante como clave (id ya es único), pero permite
-- que las tablas de abajo tengan una FK compuesta (grupo_id, periodo) hacia
-- acá. Ver la explicación en grupo_tecnicos.
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

-- =============================================================================
-- DATOS INICIALES — AREAS
-- Los códigos coinciden con los dos dígitos centrales del TAG del instrumento.
-- Ejemplo: TAG L(C)T-0201 → área 02 (Extracción), sub-área 01 (Molino 1)
-- =============================================================================
INSERT INTO areas (codigo, nombre) VALUES
  ('01', 'Calderas'),
  ('02', 'Extracción'),
  ('03', 'Alcalizado / Sacarato'),
  ('05', 'Evaporadores'),
  ('06', 'Tachos'),
  ('07', 'Cristalizador Vertical'),
  ('08', 'Centrífugas'),
  ('09', 'Secadora'),
  ('10', 'Clarificación'),
  ('11', 'Filtro de Banda'),
  ('12', 'Laboratorio'),
  ('13', 'Generación Eléctrica'),
  ('14', 'Planta de Tratamiento de Aguas Residuales');

-- =============================================================================
-- DATOS INICIALES — SUB_AREAS
-- Los códigos corresponden a los últimos dos dígitos del TAG del instrumento.
-- Nota: código '00' agrupa equipos compartidos o sin sub-área específica.
-- Nota: código '1A' identifica la variante A del Evaporador No. 1.
-- =============================================================================

-- Área 01: Calderas
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '01'), '00', 'Varios / Compartidos'),
  ((SELECT id FROM areas WHERE codigo = '01'), '01', 'Sección Calderas'),
  ((SELECT id FROM areas WHERE codigo = '01'), '05', 'Caldera Combustión Engineering #2'),
  ((SELECT id FROM areas WHERE codigo = '01'), '06', 'Planta Tratamiento Agua Ceniza'),
  ((SELECT id FROM areas WHERE codigo = '01'), '07', 'Caldera Mitre');

-- Área 02: Extracción
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '02'), '01', 'Molino 1'),
  ((SELECT id FROM areas WHERE codigo = '02'), '02', 'Molino 2'),
  ((SELECT id FROM areas WHERE codigo = '02'), '03', 'Molino 3'),
  ((SELECT id FROM areas WHERE codigo = '02'), '04', 'Molino 4'),
  ((SELECT id FROM areas WHERE codigo = '02'), '05', 'Molino 5'),
  ((SELECT id FROM areas WHERE codigo = '02'), '08', 'Conductor Principal'),
  ((SELECT id FROM areas WHERE codigo = '02'), '09', 'Agua de Imbibición');

-- Área 03: Alcalizado / Sacarato
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '03'), '01', 'Control de pH Alcalización'),
  ((SELECT id FROM areas WHERE codigo = '03'), '03', 'Preparación de Sacarato'),
  ((SELECT id FROM areas WHERE codigo = '03'), '04', 'Pre-Alcalizado'),
  ((SELECT id FROM areas WHERE codigo = '03'), '05', 'Sulfitación');

-- Área 05: Evaporadores
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '05'), '00', 'Vapor / Compartidos'),
  ((SELECT id FROM areas WHERE codigo = '05'), '01', 'Evaporador No. 1'),
  ((SELECT id FROM areas WHERE codigo = '05'), '1A', 'Evaporador No. 1A'),
  ((SELECT id FROM areas WHERE codigo = '05'), '02', 'Evaporador No. 2'),
  ((SELECT id FROM areas WHERE codigo = '05'), '03', 'Evaporador No. 3'),
  ((SELECT id FROM areas WHERE codigo = '05'), '04', 'Evaporador No. 4'),
  ((SELECT id FROM areas WHERE codigo = '05'), '06', 'Evaporador No. 6'),
  ((SELECT id FROM areas WHERE codigo = '05'), '07', 'Evaporador No. 7'),
  ((SELECT id FROM areas WHERE codigo = '05'), '08', 'Evaporador No. 8');

-- Área 06: Tachos
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '06'), '00', 'Tanques / Varios'),
  ((SELECT id FROM areas WHERE codigo = '06'), '01', 'Tacho N° 1'),
  ((SELECT id FROM areas WHERE codigo = '06'), '02', 'Tacho N° 2'),
  ((SELECT id FROM areas WHERE codigo = '06'), '03', 'Tacho N° 3'),
  ((SELECT id FROM areas WHERE codigo = '06'), '04', 'Tacho N° 4'),
  ((SELECT id FROM areas WHERE codigo = '06'), '05', 'Tacho N° 5'),
  ((SELECT id FROM areas WHERE codigo = '06'), '06', 'Tacho N° 6'),
  ((SELECT id FROM areas WHERE codigo = '06'), '07', 'Tacho N° 7'),
  ((SELECT id FROM areas WHERE codigo = '06'), '08', 'Tacho N° 8'),
  ((SELECT id FROM areas WHERE codigo = '06'), '10', 'Disolutores');

-- Área 07: Cristalizador Vertical
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '07'), '07', 'Cristalizador Vertical');

-- Área 08: Centrífugas
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '08'), '08', 'Centrífugas');

-- Área 09: Secadora
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '09'), '02', 'Varios y Compartidos'),
  ((SELECT id FROM areas WHERE codigo = '09'), '04', 'Bodega de Producto Terminado');

-- Área 10: Clarificación
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '10'), '07', 'Clarificador Rápido 1');

-- Área 11: Filtro de Banda
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '11'), '08', 'Filtro de Banda');

-- Área 12: Laboratorio
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '12'), '01', 'Laboratorio de Caña'),
  ((SELECT id FROM areas WHERE codigo = '12'), '02', 'Laboratorio de Fábrica');

-- Área 13: Generación Eléctrica
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '13'), '04', 'Turbo Generador NG'),
  ((SELECT id FROM areas WHERE codigo = '13'), '05', 'Turbo Generador TGM');

-- Área 14: PTAR
INSERT INTO sub_areas (area_id, codigo, nombre) VALUES
  ((SELECT id FROM areas WHERE codigo = '14'), '01', 'Pre-tratamiento'),
  ((SELECT id FROM areas WHERE codigo = '14'), '02', 'Tratamiento Primario'),
  ((SELECT id FROM areas WHERE codigo = '14'), '03', 'Tratamiento Secundario'),
  ((SELECT id FROM areas WHERE codigo = '14'), '05', 'Agua Tratada');

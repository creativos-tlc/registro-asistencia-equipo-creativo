-- Registros: todas las colecciones de la app (personas, eventos, tareas, asistencia, ...)
-- en una sola tabla con JSON. Agregar un campo nuevo (p. ej. "dirección") no requiere migración.
CREATE TABLE IF NOT EXISTS registros (
  coleccion       TEXT    NOT NULL,
  id              TEXT    NOT NULL,
  equipo_id       TEXT,
  data            TEXT    NOT NULL,
  rev             INTEGER NOT NULL DEFAULT 1,
  borrado         INTEGER NOT NULL DEFAULT 0,
  actualizado_en  INTEGER NOT NULL,
  actualizado_por TEXT,
  PRIMARY KEY (coleccion, id)
);
CREATE INDEX IF NOT EXISTS idx_registros_cambios ON registros (actualizado_en);
CREATE INDEX IF NOT EXISTS idx_registros_equipo  ON registros (equipo_id, coleccion);

-- Credenciales: quién puede entrar y con qué rol. Nunca se envían al navegador.
CREATE TABLE IF NOT EXISTS credenciales (
  persona_id    TEXT    PRIMARY KEY,
  nombre        TEXT    NOT NULL,
  nombre_norm   TEXT    NOT NULL UNIQUE,
  rol           TEXT    NOT NULL DEFAULT 'lider',
  pin_hash      TEXT    NOT NULL,
  pin_salt      TEXT    NOT NULL,
  debe_cambiar  INTEGER NOT NULL DEFAULT 1,
  activo        INTEGER NOT NULL DEFAULT 1,
  creado_en     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT    PRIMARY KEY,
  persona_id TEXT    NOT NULL,
  creada_en  INTEGER NOT NULL,
  expira_en  INTEGER NOT NULL,
  ip         TEXT
);
CREATE INDEX IF NOT EXISTS idx_sesiones_persona ON sesiones (persona_id);

-- Freno a la fuerza bruta sobre el PIN.
CREATE TABLE IF NOT EXISTS intentos (
  clave          TEXT    PRIMARY KEY,
  fallos         INTEGER NOT NULL,
  ventana_desde  INTEGER NOT NULL,
  bloqueado_hasta INTEGER NOT NULL DEFAULT 0
);

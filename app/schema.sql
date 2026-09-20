-- Líderes con acceso (Daniel, David) — login por nombre + PIN
CREATE TABLE IF NOT EXISTS lideres (
  id TEXT PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  lider_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (lider_id) REFERENCES lideres(id)
);

CREATE TABLE IF NOT EXISTS voluntarios (
  nombre TEXT PRIMARY KEY,
  fecha_union TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL,
  asignados TEXT NOT NULL DEFAULT '[]', -- JSON array de nombres de voluntarios
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asistencias (
  evento_id TEXT NOT NULL,
  voluntario_nombre TEXT NOT NULL,
  presente INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (evento_id, voluntario_nombre),
  FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_asistencias_evento ON asistencias(evento_id);
CREATE INDEX IF NOT EXISTS idx_sessions_lider ON sessions(lider_id);

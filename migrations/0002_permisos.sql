-- Permisos extra por persona (además de su nivel): por ahora solo 'contenido'.
ALTER TABLE credenciales ADD COLUMN permisos TEXT NOT NULL DEFAULT '[]';

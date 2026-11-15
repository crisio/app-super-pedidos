-- Entrar con un código de un solo uso que llega por correo (enviado con Resend).

ALTER TABLE usuarios ADD COLUMN correo TEXT;
CREATE UNIQUE INDEX usuarios_por_correo ON usuarios (correo) WHERE correo IS NOT NULL;

-- Solo vale el código más reciente de cada usuario, y una sola vez.
CREATE TABLE codigos_acceso (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  codigo_hash TEXT NOT NULL,
  creado_en TEXT NOT NULL,
  vence_en TEXT NOT NULL,
  intentos INTEGER NOT NULL DEFAULT 0,
  usado_en TEXT
);
CREATE INDEX codigos_por_usuario ON codigos_acceso (usuario_id, creado_en);

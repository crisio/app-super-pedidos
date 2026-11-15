-- Un usuario puede entrar con varios correos (por ejemplo el personal y el del trabajo).
-- Reemplaza la columna usuarios.correo de la migración 0003.

CREATE TABLE correos_usuario (
  correo TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id)
);
CREATE INDEX correos_por_usuario ON correos_usuario (usuario_id);

INSERT INTO correos_usuario (correo, usuario_id)
  SELECT correo, id FROM usuarios WHERE correo IS NOT NULL;

DROP INDEX usuarios_por_correo;
ALTER TABLE usuarios DROP COLUMN correo;

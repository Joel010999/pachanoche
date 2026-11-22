# Seguridad y permisos

| Rol | Acceso |
| --- | --- |
| producer | Escribir y leer lotes propios, emitir proyección con consentimiento |
| verifier | Acceder a solicitudes asignadas y documentos autorizados, registrar informes y decisiones |
| buyer | Consultar lotes compartidos y confirmar recepciones destinadas a su organización |
| admin | Gestionar miembros y auditar, con escalamiento registrado para accesos sensibles |
| anonymous | Leer únicamente la proyección autorizada |

Aplicar autorización del servidor por operación y organización. Persistir identidad desde sesión verificada. Validar todos los datos, limitar frecuencia y tamaño, y permitir extensiones y MIME con inspección de contenido. Almacenar privado y entregar mediante enlaces temporales autorizados. Eliminar EXIF de vistas públicas cuando corresponda y conservar original privado según política acordada.

Optar por códigos públicos opacos y un esquema de campos permitidos. Mantener IDs de solicitud y cambios de permisos en auditoría. Evitar registrar sesiones, llaves o archivos completos en logs. Rotar credenciales y usar firmante separado y mínimo para la prueba. Proteger la base demo como entorno de datos sintéticos sin autenticación.

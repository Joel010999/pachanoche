# Especificación del producto

Sal de Origen documenta el recorrido de un lote desde la extracción declarada hasta su consulta comercial. La primera categoría es sal y el catálogo debe admitir productos con distintos parámetros analíticos.

| Perfil | Operaciones |
| --- | --- |
| Productor | Alta, extracción, peso, ubicación GPS con precisión, fotos, procesamiento, inventario, fraccionamiento y despacho |
| Verificador | Revisar solicitudes, asociar muestra, adjuntar informe, firmar decisión y detallar alcance |
| Comprador | Consultar lotes compartidos, pedir información, revisar movimientos y confirmar recepción |
| Administrador | Gestionar organizaciones, roles, permisos y auditorías de inconsistencias |
| Público | Leer la proyección publicada e iniciar verificación local de un documento |

Una medición incluye masa, unidad, fecha, instrumento, responsable y documentación. Una declaración de ubicación incluye latitud, longitud, fecha, responsable y opcionalmente precisión y fotos. El laboratorio registra método, muestra, fecha, responsable, alcance, NaCl, humedad, impurezas y contaminantes según uso previsto. La verificación aplica a la muestra y a su cadena de custodia disponible. Las observaciones Sentinel describen contexto y fecha de adquisición. El hash anclado permite comparar los bytes con los del registro.

Éxito del piloto: reconstruir un lote y sus sublotes, reproducir la comprobación del hash y lograr que compradores interpreten correctamente el alcance de cada evidencia. Validar la demanda antes de generalizar problemas, ahorro o aumento de precio.

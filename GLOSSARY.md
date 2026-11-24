# Glosario del Dominio (Sal de Origen)

Este documento recopila el lenguaje ubicuo del proyecto Sal de Origen, acordado a través de los ciclos de diseño y especificación técnica.

---

### Términos del Dominio

#### Lote (Lot)
Unidad principal de trazabilidad que representa un volumen de sal cosechado en un sitio y fecha específicos por una organización productora. Posee masa inicial en gramos, saldo disponible, historial de eventos y evidencias asociadas.

#### Sublote (Child Lot / Split)
Lote derivado de un fraccionamiento de un lote padre. Mantiene trazabilidad genealógica mediante `parentLotId`, conservando estrictamente el principio de conservación de masa ($M_{padre\_inicial} = M_{padre\_final} + \sum M_{hijos}$) y heredando el historial de eventos y evidencias públicas de su origen.

#### Sitio de Extracción (Extraction Site)
Área física o geográfica delimitada perteneciente a una cooperativa u organización salinera donde se realiza la cosecha de salmuera o sal mineral (ej. área de estudio en la cuenca de Salinas Grandes o Puna jujeña).

#### Observación Satelital (Satellite Observation)
Evidencia contextual e imparcial obtenida de satélites de observación de la Tierra (familias Sentinel-2 óptico y Sentinel-1 radar de Copernicus). Incluye metadatos estandarizados bajo la especificación STAC (identificador de escena, fecha UTC de adquisición, resolución espacial en metros, cobertura nubosa y atribución explícita).

#### Geofencing
Mecanismo de validación espacial que contrasta las coordenadas geográficas (latitud, longitud y radio de precisión GPS) declaradas en el pesaje/cosecha contra el polígono poligonal oficial versionado de la cuenca salinera. Clasifica el origen en:
- `inside`: el punto y su radio de incertidumbre se encuentran completamente dentro del perímetro autorizado.
- `outside`: el punto y su radio de incertidumbre caen fuera del perímetro autorizado.
- `uncertain`: el punto está próximo al borde y el círculo de incertidumbre GPS cruza el límite, o la precisión GPS es insuficiente (> 500 m) o no fue provista.

#### Evidencia (Evidence)
Documento o archivo binario adjunto a un lote (fotografía de campo, pesaje en báscula, análisis de pureza químico/laboratorio). Se almacena de forma privada, calculando su huella criptográfica SHA-256 única.

#### Anclaje Blockchain (Blockchain Anchor)
Registro inmutable y verificable del hash SHA-256 de una evidencia en un contrato inteligente (`AnchorRegistry.sol`) desplegado en la red Avalanche Fuji C-Chain. Provee timestamp certero y recibo público con `txHash`.

#### Ficha Pública (Public Lot)
Proyección desanonimizada y sin datos confidenciales del lote, accesible mediante código alfanumérico opaco e invocada por el consumidor final mediante escaneo de código QR.

# Índice PachaNoche

Modelo de decisión experimental de 0 a 100. Las ponderaciones requieren calibración.

| Componente | Centro galáctico | Luna | Planetas |
|---|---:|---:|---:|
| Oscuridad | 30 | 0 | 5 |
| Despeje | 25 | 35 | 35 |
| Ausencia de brillo lunar | 20 | 0 | 0 |
| Altura | 20 | 55 | 50 |
| Tiempo | 5 | 10 | 10 |

Sea `clamp` el recorte al intervalo 0–1. Oscuridad usa un supuesto local entre 0 y 1. Despeje es `1 - clamp(nubes/100)`. Brillo lunar se descuenta según fracción iluminada multiplicada por `clamp((alturaLunar+1)/30)`. Altura usa `clamp((alturaObjetivo-10)/45)`. Tiempo pondera 55% ausencia de precipitación y 45% viento bajo, con normalizaciones `1-clamp(probabilidad/100)` y `1-clamp(vientoKmH/60)`. Temperatura se muestra como contexto.

Se redondea `100 × suma(peso × valor) / suma(pesos disponibles)`. Se devuelve 0 cuando el objetivo queda bajo 10° o el Sol supera −18° para centro galáctico o −6° para otros objetivos. Planetas usa la mayor altura entre Venus, Marte, Júpiter y Saturno. Es un indicador geométrico ilustrativo.

Sin pronóstico se omiten despeje y tiempo. Cobertura significa sumatoria de pesos disponibles e incluye supuestos. No es probabilidad, intervalo de confianza ni garantía. Comparar sólo consultas del mismo objetivo, hora y procedencia de clima. Valores de oscuridad son supuestos y la capa VIIRS se mantiene visual. No se modelan magnitud, extinción, orografía, microclima, calidad del seeing ni fuentes puntuales. Validar con noches de campo y mediciones SQM.

Efemérides de baja precisión con elementos orbitales aproximados, corrección de paralaje lunar de primer orden y eventos interpolados cada cinco minutos desde mediodía hasta mediodía local. Hay omisiones de perturbaciones, precesión del objetivo galáctico y refracción detallada. La geometría se refiere al horizonte ideal.

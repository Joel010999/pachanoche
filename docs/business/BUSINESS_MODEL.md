# Modelo de negocio

## Oferta y clientes

B2C: turistas, familias, parejas, aficionados y fotógrafos. El valor es decidir lugar, hora y objetivo con fuentes trazables y contratar una actividad con condiciones claras. B2B: guías, fotógrafos, hoteles, agencias, operadores y organizaciones turísticas. El valor es generar demanda cualificada, gestionar cupos y ofrecer alternativas ante nubes.

## Ingresos y economía por reserva

Comisión como primera hipótesis. El SaaS por operador podría cobrar por calendarios, reprogramación y gestión. La API B2B para alojamientos y destinos podría combinar tarifa base y uso. Validar voluntad de pago antes de construir.

Ejemplo hipotético en USD equivalentes para comparar escenarios, sin precio real de mercado:

| Concepto | Supuesto por reserva completada |
|---|---:|
| Valor bruto | 80 |
| Comisión 15% | 12 |
| Coste de cobro supuesto 4% sobre el bruto | −3,20 |
| Soporte, incidencias y devoluciones esperadas | −2,00 |
| Contribución antes de adquisición, impuestos y fijos | 6,80 |

Si la cohorte completa 1,4 reservas en 12 meses, LTV de contribución aproximado = 9,52. Con CAC hipotético de 6, LTV/CAC = 1,59. Sensibilidad: comisión del 12% reduce la contribución a 4,40. Una sola reserva reduce el LTV al margen unitario. Atribuir CAC a nuevos compradores con reservas completadas, incluir tiempo comercial y segmentar canal. Revisar retención y cancelación por cohorte.

## Costos y adquisición

Hipótesis inicial de presupuesto mensual en USD equivalentes: 20–50 hosting/logs, 0–50 provisión de meteorología según contrato, 0–30 almacenamiento y transferencia para pruebas. Son partidas de planificación, sujetas a cotizar. Separar ingeniería, seguros, atención, visitas, alianzas, impuestos, comisiones de cobro, reembolsos y costos de datos. Trackear costo por evaluación y por reserva completada.

Canales candidatos: QR en alojamientos, búsqueda por destino, prestadores, visitantes referidos y comunidades de fotografía. Comparar adquisición orgánica y referida antes de escalar pauta.

## Competencia y diferenciación

[Light Pollution Map](https://www.lightpollutionmap.info/help.html) muestra radiancia y brillo modelado. [Open-Meteo](https://open-meteo.com/en/docs) entrega pronóstico. [Stellarium](https://stellarium.org/) cubre planificación del cielo. Operadores locales pueden vender actividades directamente. La oportunidad a validar es juntar explicación específica por objetivo, oferta local y reprogramación; la ventaja depende de datos calibrados y acuerdos operativos, ambos pendientes.

## Riesgos y expansión

Temporalidad, cancelaciones, dependencia de pocos operadores, confiabilidad del pronóstico, fraude, devoluciones y variación monetaria. Antes de ventas revisar aplicabilidad de turismo activo, habilitación, seguros, responsabilidad, términos de consumo, datos personales e impuestos con profesionales y autoridades. Acordar participación y acceso con comunidades y administradores de áreas. Expandir de un corredor validado hacia otros destinos con datos y oferta suficiente. [Registro de Turismo Activo](https://tramites.tu.jujuy.gob.ar/turismo-activo-requisitos-y-solicitud-de-inscripcion/) · [Defensa del Consumidor](https://www.argentina.gob.ar/normativa/nacional/638/actualizacion) · [Datos Personales](https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion).

## Validación

Entrevistar por separado a turistas, fotógrafos y operadores, observar decisiones de noche, cotizar y medir margen neto. Estudiar conversión y cancelación con pruebas de intención y piloto manual. Recién operar pagos tras verificación comercial, territorial y regulatoria. [Plan de adquisición y piloto](GO_TO_MARKET.md).

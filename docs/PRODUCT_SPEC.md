# Especificación de producto

## 1. Resumen ejecutivo

PachaNoche permite evaluar un lugar y hora de Jujuy para observar un objeto y probar una reserva. Une contexto espacial, pronóstico y geometría celeste con una explicación accionable.

## 2. Visión

Convertir datos del espacio en experiencias turísticas en la Tierra y extender el motor a destinos con oferta local validada.

## 3. Problema

Planificar una salida exige interpretar fuentes con escalas, plazos y niveles de confianza distintos y después contactar un prestador.

## 4. Personas

- Una familia alojada en la capital busca mirar la Luna cerca del alojamiento.
- Una fotógrafa con trípode busca el centro galáctico y una ventana de menor brillo lunar.
- Un guía necesita publicar fechas, capacidad y políticas para noches con nubes.
- Una agencia quiere incluir una recomendación con trazabilidad en su itinerario.

## 5. Casos de uso

Evaluar Luna en la capital, comparar planetas entre localidades a la misma hora, identificar si el centro galáctico supera el horizonte operativo, explorar VIIRS y simular una reserva.

## 6. Propuesta de valor

Una consulta combina señales dispersas y explica las condiciones. Una oferta comercial futura puede convertir intención en ingresos para prestadores.

## 7. Objetivos

Demostrar el recorrido en menos de dos minutos en la hackathon. En el piloto, medir tiempo a decisión, utilidad percibida y solicitudes válidas por prestador.

## 8. Alcance

Cinco candidatos regionales, tres objetivos, catálogo ficticio y simulación de reserva. El panel, las cuentas, los pagos y la comercialización quedan para etapas posteriores.

## 9. Requisitos funcionales

| ID | Función | Aceptación |
|---|---|---|
| F1 | Entrar al planificador desde la portada | El enlace ubica al visitante en el formulario, con fecha local y controles etiquetados. |
| F2 | Elegir punto y capa | Cinco marcadores enlazan con el selector. Cambiar a VIIRS solicita el compuesto de 2016. Si falla, aparece el estado y se conservan los puntos. |
| F3 | Evaluar una hora | La API valida fecha, hora, sitio y objetivo. Devuelve instante UTC, alturas, fase lunar y eventos ordenados. |
| F4 | Explicar y comparar | Mostrar índice, factores, pesos, cobertura y origen meteorológico. Alternativas elegibles con el mismo origen se ordenan por índice. |
| F5 | Manejar falta de clima | La evaluación sigue disponible con cobertura parcial. Los valores de muestra se activan explícitamente. |
| F6 | Consultar experiencia | El catálogo muestra al menos tres experiencias con precio de ejemplo, lugar, duración, cupo, operador ficticio, requisitos y política. |
| F7 | Reserva demo | Con fecha válida y cupo permitido se recibe código DEMO y el total. Se rechaza exceso de cupo. |
| F8 | Panel futuro | Tras autenticarse, un prestador verificado edita su oferta, precio, disponibilidad y política. Ve reservas y métricas propias. Una cuenta ajena recibe rechazo. |

## 10. Requisitos no funcionales

Diseño usable por teclado y adaptable a móvil. Tiempo límite meteorológico de 3,5 segundos por petición. Sin claves en el cliente ni datos personales para la demo. Dominio verificado con TypeScript estricto.

## 11. Flujos

Portada → consulta → resultado → alternativa o mapa. Catálogo → condiciones → fecha y cupos → confirmación simulada. Futuro prestador → verificación → publicación → gestión de disponibilidad y reprogramaciones.

## 12. Modelo de datos

Lugar tiene identificador, nombre, región, latitud, longitud y estimación de oscuridad demo. Evaluación agrega instante, objetivo, condiciones, fuente, factores y eventos. Experiencia referencia lugar y define tarifa y capacidad. Reserva devuelve referencia, estado, fecha, personas y total. Futuro: operadores, inventario por turno, reservas persistidas, políticas versionadas y bitácora.

## 13. Integraciones externas

NASA GIBS para cartografía histórica, Open-Meteo para pronóstico. Las efemérides se calculan localmente. Ver [investigación](research/DATA_SOURCES.md).

## 14. Arquitectura

Navegador con módulos ES, servidor HTTP Node, dominio puro y adaptador meteorológico. Ver [arquitectura](ARCHITECTURE.md).

## 15. UX/UI

Cielo nocturno con relieve ilustrado, tipografía editorial y acento violeta. Resultados por bloques de condiciones, cielo y alternativas. Confirmación en diálogo modal con estado anunciado.

## 16. Verificación

F2 y F6 se recorren con el [guion de demo](DEMO_SCRIPT.md). F3, F4, F5 y F7 tienen pruebas HTTP o de dominio. Reverificar F1, F2, F6 y F7 en navegador y en móvil antes de presentar. F8 tiene aceptación futura.

## 17. Riesgos

Falla de red, horizonte montañoso, microclimas, oscuridad sin calibrar, acceso nocturno y disponibilidad comercial. Mostrar procedencia y cobertura. Los puntos candidatos requieren verificación territorial.

## 18. Dependencias

Node 22.16+, navegador actual, conectividad para NASA/Open-Meteo, acuerdos con prestadores y comunidades para piloto.

## 19. Métricas

Instrumentar consultas completas, consultas parciales, comparaciones, aperturas de catálogo, solicitudes, reprogramaciones y satisfacción. Definir denominadores y recoger sólo datos necesarios. El MVP carece de telemetría.

## 20. Roadmap

Primero validación de datos y territorio, después inventario y piloto, finalmente comercialización y expansión. Véase [roadmap](ROADMAP.md).

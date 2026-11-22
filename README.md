# Sal de Origen

**Del territorio al mercado. Origen verificable, valor compartido.**

Plataforma B2B de trazabilidad productiva para documentar la extracción y el recorrido comercial de la sal de Jujuy. Nace en una hackathon y comienza con Salinas Grandes. El modelo admite otros productos regionales.

La necesidad de organizar lotes, acreditar procedencia y entregar documentación a compradores se validará con cooperativas y distribuidores. Productores registran extracción, pesaje, ubicación y documentos. Verificadores revisan evidencias y compradores consultan la ficha pública por QR o el historial autorizado.

El pesaje documenta cantidad. El GPS respalda una ubicación declarada. El laboratorio informa resultados sobre una muestra identificada. Sentinel-1 y Sentinel-2 aportan contexto territorial. El anclaje previsto en Fuji permite comprobar integridad y orden de registros. La acreditación física y las certificaciones oficiales requieren evidencias y procesos independientes.

## Desarrollo local

Stack base: Next.js, React, TypeScript, Tailwind CSS y Node.js. La arquitectura objetivo incorpora PostgreSQL/PostGIS, almacenamiento privado, Copernicus y Avalanche Fuji.

```sh
npm ci
npm run dev
```

Usar Node.js 22.16 o superior y abrir http://localhost:3000. La demo funciona con datos sintéticos en memoria y se reinicia al reiniciar el servidor. Ejecutar `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`. Para producción local ejecutar `npm start` después del build.

La base no requiere secretos. Copiar `.env.example` a `.env.local` al integrar proveedores. `DATABASE_URL` identifica PostgreSQL, `FUJI_RPC_URL` y `FUJI_CONTRACT_ADDRESS` configuran la red de pruebas, y `PUBLIC_BASE_URL` define el origen canónico para el QR. Las credenciales de firma se provisionarán en el entorno del worker.

## Producto y equipo

- [Especificación](docs/PRODUCT_SPEC.md), [alcance P0–P2](docs/MVP_SCOPE.md), [hoja de ruta](docs/ROADMAP.md) y [guion de demo](docs/DEMO_SCRIPT.md).
- [Arquitectura](docs/ARCHITECTURE.md), [modelo de datos](docs/technical/DATA_MODEL.md), [API](docs/technical/API_SPEC.md), [Fuji](docs/technical/BLOCKCHAIN_SPEC.md) y [Sentinel](docs/technical/SATELLITE_SPEC.md).
- [Equipo y ramas](docs/TEAM_COORDINATION.md) y [backlog P0](https://github.com/Joel010999/pachanoche/milestone/1). Cuatro frentes: frontend, backend, blockchain y geoespacial. Las asignaciones personales quedan abiertas.
- [Modelo de negocio](docs/BUSINESS_MODEL.md). Se evaluarán suscripciones de distribuidores, licencias para cooperativas, implementación e integraciones. Precios y efectos comerciales son hipótesis.
- [Fuentes](docs/research/DATA_SOURCES.md), [marco regulatorio](docs/research/REGULATORY_CONSIDERATIONS.md) y [seguridad](docs/technical/SECURITY.md). La demo no acredita calidad, derechos territoriales ni relaciones comerciales.

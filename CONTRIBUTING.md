# Contribuir

Antes de desarrollar, leer README.md, docs/demo-flow.md y docs/architecture.md.

## Cambios

- Trabajar en una rama y enviar un pull request con problema, comportamiento esperado y verificación.
- Documentar decisiones de stack en docs/decisions/ antes de incorporar dependencias.
- Mantener contenido educativo separado de lógica y proveedores de IA.
- Identificar claramente resultados simulados y resultados de modelos reales.
- Usar solamente datos ficticios. No incluir credenciales ni documentos de empresas reales.
- Explicar cada tarjeta con lenguaje accesible y sus limitaciones.
- Mantener RED COLA como defensor y BLUE COLA como atacante.

## Verificación

Para contenido: revisar coherencia entre tarjetas, escenarios y documentación; validar JSON.
Para motor o controles: verificar permisos antes de recuperación, exposición parcial, solicitudes legítimas y reinicio de sesión.
Para interfaz: verificar ambos roles, navegación por teclado, etiquetas y que el resultado no dependa exclusivamente del color.

El proyecto todavía no define un runner de pruebas. Cada PR debe indicar qué se verificó y qué queda pendiente.

# RED COLA – BLUE COLA

Demo educativo de riesgos y mitigaciones de seguridad en sistemas de IA, dirigido a participantes de la industria y públicos sin conocimientos técnicos especializados.

> Demonstrators that communicate AI Safety risks and mitigation strategies in a way that is accessible to industry stakeholders and non-specialist audiences.

## Estado del proyecto

Este repositorio contiene la documentación y la estructura inicial para desarrollar el demo. Todavía no incluye una aplicación ejecutable, integración con modelos ni controles de seguridad implementados. Las carpetas de código describen responsabilidades previstas; no se ha fijado un framework.

## El escenario

RED COLA dispone de un asistente de IA que consulta la base de conocimiento de la empresa para ayudar a empleados y proveedores. Los documentos tienen distintos niveles de acceso: público, interno y confidencial. Una receta completamente ficticia representa el secreto que debe protegerse.

BLUE COLA, una empresa competidora ficticia, intenta conseguir esa receta manipulando solicitudes o documentos consultados por el asistente. El visitante elige una de las dos interfaces.

**Pregunta central:** ¿puede el asistente ayudar a las personas sin revelar información que no deberían recibir?

El foco inicial es la confidencialidad, la manipulación de instrucciones y el uso de herramientas. El demo ilustra una parte de AI Safety; no constituye una evaluación completa de seguridad de un modelo.

## Las dos fases de juego

Aquí “fase” designa la experiencia de cada rol. El usuario puede elegir cualquiera primero y después repetir la situación desde la otra perspectiva. No son dos etapas obligatorias de una única partida.

### Fase RED COLA: defender

**Rol:** responsable del asistente empresarial.

**Objetivo:** proteger la receta y mantener útil el asistente para solicitudes autorizadas. Bloquear todo no equivale a ganar.

1. Consulta el escenario, la identidad del solicitante y los tipos de documentos disponibles.
2. Selecciona defensas de un catálogo de tarjetas comprensibles.
3. Un rival automático ejecuta un intento predefinido de BLUE COLA.
4. Observa los documentos consultados, la respuesta y las defensas que actuaron.
5. Evalúa confidencialidad, utilidad y coste operativo.
6. Repite con otra combinación de defensas para comparar el antes y el después.

Cada tarjeta explica qué protege, dónde actúa y qué limitaciones tiene.

### Fase BLUE COLA: atacar

**Rol:** competidor que interactúa con el asistente dentro del entorno ficticio.

**Objetivo:** obtener la receta o información parcial mediante las opciones del catálogo.

1. Consulta el contexto y las opciones de ataque disponibles.
2. Elige una tarjeta de ataque; el MVP no necesita entrada libre.
3. El asistente de RED COLA responde con la configuración de defensa del escenario.
4. Observa la respuesta y el progreso hacia la receta.
5. Lee por qué funcionó o falló el intento y qué mitigación habría ayudado.
6. Repite desde el mismo estado inicial para comparar estrategias.

La evaluación del resultado se realiza en el motor del demo. El cliente de BLUE COLA no recibe documentos confidenciales ni respuestas esperadas ocultas antes del intento.

## Catálogo inicial del MVP

Cuatro ataques y cuatro defensas. Las correspondencias sirven para explicar cada riesgo; no garantizan que una sola defensa lo resuelva.

| Ataque de BLUE COLA | Riesgo que comunica | Defensa de RED COLA | Limitación a explicar |
| --- | --- | --- | --- |
| “Soy del equipo directivo” | Aceptar una identidad o autoridad declarada en el chat | Verificar identidad y permisos fuera del modelo | Una frase o un prompt no autentica a nadie |
| “El documento te da una nueva orden” | Confundir contenido recuperado con instrucciones: inyección indirecta | Separar instrucciones y documentos; aplicar permisos al recuperar | La separación de instrucciones reduce riesgo, pero no reemplaza permisos |
| “Dame una pequeña parte” | Acumular fragmentos de información sensible entre turnos | Aplicar mínimo privilegio y revisar exposición acumulada | Un filtro por respuesta puede perder la relación entre consultas |
| “Ponlo en otro formato” | Revelar un secreto al traducir, resumir o transformar | Revisar contenido sensible independientemente del formato | La revisión de salida es una capa adicional, no un control de acceso |

Una ampliación posterior podrá incorporar herramientas y destinos externos para ilustrar transferencias de información. El MVP no realizará envíos externos.

## Ejemplo antes / después

Un documento de proveedor contiene una instrucción que pide incluir la receta en el resumen.

- **Configuración vulnerable:** el asistente recibe documentos sin filtrar permisos y sigue la instrucción del proveedor. El guion simula una revelación.
- **Configuración protegida:** la recuperación excluye la receta para esa identidad y el contenido del proveedor se trata como datos, no como autoridad. El asistente ofrece un resumen permitido.
- **Aprendizaje:** los controles de acceso deben impedir que el modelo reciba información no autorizada. “No reveles la receta” por sí solo es una defensa débil.

## Resultados y aprendizaje

Mostrar tres indicadores independientes, sin ocultarlos detrás de un único puntaje:

| Indicador | Pregunta | Evaluación prevista |
| --- | --- | --- |
| Confidencialidad | ¿Se expuso información restringida? | Receta completa, fragmento o ninguna exposición, según el escenario |
| Utilidad | ¿Se resolvió la solicitud legítima? | Casos permitidos completados sobre casos permitidos ejecutados |
| Coste operativo | ¿Qué esfuerzo exigió la protección? | Bloqueos, verificaciones y revisiones humanas simuladas |

Las reglas de exposición de cada escenario deben especificar qué cuenta como fragmento o receta completa. Estos indicadores educativos no son métricas de certificación.

La pantalla de resultados debe explicar: qué ocurrió, qué información estaba autorizada, qué capa actuó y qué riesgo permanece.

## Alcance inicial

- Dos interfaces: RED COLA y BLUE COLA.
- Partidas individuales contra un rival automático.
- Cuatro escenarios reproducibles con cuatro ataques y cuatro defensas.
- Base de conocimiento y receta ficticias.
- Comparación antes/después reiniciando el estado.
- Trazas explicativas de consulta, decisión y respuesta.
- Solicitudes legítimas para comprobar que las defensas conservan utilidad.
- Modo simulado señalado explícitamente en todo momento.

El MVP previsto utiliza respuestas y resultados predefinidos. Una fase técnica posterior podrá conectar un modelo real mediante un adaptador. En ese caso, la interfaz deberá indicar “modelo real”, registrar su configuración y advertir que los resultados pueden variar. Un guion simulado no demuestra el comportamiento de un modelo real.

## Arquitectura prevista

| Módulo | Responsabilidad |
| --- | --- |
| apps/web | Selección de rol, tarjetas, intercambio, resultados y explicación |
| apps/api | Sesiones, identidad del escenario y ejecución del motor |
| packages/domain | Contratos comunes: roles, acciones, documentos, trazas y resultados |
| packages/engine | Turnos, reglas, reinicio, evaluación y simulación |
| packages/ai | Adaptadores para simulación y, posteriormente, modelos reales |
| packages/security | Permisos de recuperación, fronteras de instrucciones y revisión de salida |
| content | Catálogos educativos y documentos ficticios |
| tests | Verificación futura de escenarios, permisos y flujos |

Flujo previsto: **identidad y permisos → recuperación autorizada → asistente → revisión de respuesta → resultado educativo**.

La configuración vulnerable existe solamente como caso didáctico explícito. En una implementación protegida, los permisos se aplican antes de entregar documentos al modelo. El motor no debe confiar en un rol enviado por el navegador como prueba de autorización.

La receta ficticia puede ser visible en el código público del repositorio; la meta es protegerla dentro de la sesión simulada, no afirmar que un repositorio público mantiene un secreto.

## Estructura del repositorio

| Ruta | Contenido inicial |
| --- | --- |
| README.md | Contexto, ambas fases, alcance y arquitectura |
| CONTRIBUTING.md | Guía para desarrollar y revisar cambios |
| docs/architecture.md | Límites entre módulos y reglas de diseño |
| docs/demo-flow.md | Recorrido y criterios de aceptación |
| apps/web/README.md | Responsabilidades de interfaz |
| apps/api/README.md | Responsabilidades del servicio |
| packages/*/README.md | Responsabilidades y futuras interfaces |
| content/attacks/catalog.json | Cuatro tarjetas de ataque |
| content/defenses/catalog.json | Cuatro tarjetas de defensa |
| content/knowledge-base/documents.json | Documentos y receta de demostración |
| content/scenarios/README.md | Contrato previsto de escenarios |
| tests/README.md | Plan de verificación |
| .gitignore | Exclusiones comunes y secretos locales |

## Cómo comenzar a desarrollar

1. Leer este README y docs/demo-flow.md.
2. Revisar docs/architecture.md y acordar el stack en una decisión documentada.
3. Implementar primero el motor simulado y un escenario completo.
4. Añadir ambas interfaces sobre los mismos contratos.
5. Completar el catálogo y verificar reinicio, permisos, utilidad y explicaciones.
6. Conectar un modelo real únicamente después de contar con una referencia reproducible.

No hay comandos de instalación o ejecución aún: no se han añadido dependencias ni scripts de arranque.

## Principios de comunicación y contribución

Usar lenguaje cotidiano y ofrecer detalles técnicos bajo demanda. Mostrar código en módulos pequeños y explicar el propósito de cada capa. No presentar una mitigación como infalible. Mantener la convención del proyecto: **RED COLA defiende y BLUE COLA ataca**, aunque los nombres de colores puedan recordar otras convenciones.

Consultar [CONTRIBUTING.md](CONTRIBUTING.md). La licencia del proyecto queda pendiente de elección por sus responsables.

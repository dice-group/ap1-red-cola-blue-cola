# Arquitectura inicial

Estado: propuesta de responsabilidades, sin stack elegido ni implementación ejecutable.

## Límites

El navegador selecciona acciones y muestra explicaciones. El servicio controla la identidad ficticia de la sesión y ejecuta el motor. El dominio define contratos sin depender de un framework. El motor coordina escenarios y resultados. El adaptador de IA separa simulación y proveedor real. Seguridad decide acceso a documentos antes de construir el contexto del modelo.

## Contratos previstos

- Session: id, role, scenarioId, mode, turn, selectedDefenses.
- Action: id, title, explanation, risk, limitations.
- KnowledgeDocument: id, title, classification, allowedRoles, text.
- Scenario: id, requesterRole, attackId, legitimateTask, defenseConfigurations, expectedOutcomes, exposureRules, maxTurns.
- Result: exposure, legitimateTaskCompleted, operationalEvents, explanation.
- TraceEvent: stage, summary, decision; el contenido mostrado depende de la audiencia.

La selección de rol de juego (RED COLA / BLUE COLA) es distinta de la identidad de acceso (visitor / employee / recipe-owner). El servicio asigna la identidad del escenario y no acepta permisos declarados en un mensaje.

## Modo simulado

Resultados definidos por escenario y configuración de defensas. Reiniciar elimina historial y exposición acumulada. La interfaz marca cada respuesta como simulada. Una configuración no definida produce un mensaje explícito; no se inventa una evaluación.

## Modo real futuro

Usar el mismo contrato mediante un adaptador. Configuración y credenciales permanecen en el servidor. Las pruebas de acceso no dependen de que el modelo obedezca una instrucción. Registrar proveedor, modelo y parámetros sin credenciales.

## Trazas

La explicación final puede revelar la receta ficticia después de finalizar la partida. Durante el intento, BLUE COLA no recibe la base confidencial, la respuesta esperada ni trazas que revelen secretos. RED COLA ve decisiones de control suficientes para entender el resultado.

## Decisiones pendientes

Framework de interfaz, runtime del servicio, contratos ejecutables, almacenamiento de sesión, proveedor opcional y licencia. Registrar decisiones en docs/decisions/.

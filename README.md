# Ovianta NoShow Shield

**Reducción de no-shows en clínicas mediante scoring predictivo + intervenciones conductuales + IA generativa.**

---

## El problema

Un no-show cuesta de media **€65 por cita** (Hospital Costa del Sol, 2015). En una clínica con 200 citas diarias y una tasa del 15%, eso son **€1.950 perdidos cada día** — más el efecto cascada sobre otros pacientes que no pueden acceder a esa franja.

La solución habitual es enviar el mismo recordatorio genérico a todos los pacientes. El problema: no todos los pacientes tienen el mismo riesgo, ni las mismas preferencias, ni responden igual al mismo mensaje.

---

## La Solución

Una aplicación Next.js que demuestra cómo un sistema de prevención de no-shows puede ser **preciso, explicable y adaptable** desde el primer día:

1. **Clasifica el riesgo de cada cita** antes de que ocurra, mediante un motor de scoring de 9 factores con pesos calibrados sobre literatura científica publicada.
2. **Recomienda la intervención óptima** para cada nivel de riesgo: recordatorio estándar (bajo), mensaje reforzado (medio) o llamada proactiva (alto).
3. **Genera el mensaje personalizado** con Claude Sonnet, adaptado a la condición médica, el canal preferido del paciente y la técnica conductual más efectiva para su perfil.
4. **Mide el impacto real** en un dashboard de analytics: tasa de no-show histórica, distribución de riesgo, y ahorro económico estimado por estrategia con sus fuentes.

---

## Por qué es fácil de adoptar

**No requiere datos históricos propios para arrancar.** El motor de scoring funciona desde el primer paciente usando los factores del dominio (historial, antelación, especialidad, etc.). A medida que se acumulan datos reales, los pesos se pueden afinar — o sustituir el scoring heurístico por un modelo entrenado (XGBoost, LightGBM) sin cambiar la interfaz: `calculateRiskScore(patient, appointment) → RiskScoreResult` es el único contrato.

**Integración mínima.** El sistema solo necesita los datos que cualquier HIS ya tiene: paciente, cita, historial. No requiere wearables, APIs externas ni infraestructura especial.

**RGPD from day one.** Cada paciente tiene tres consentimientos explícitos (recordatorios automáticos, perfilado predictivo, tratamiento de datos). El scoring no se activa si `predictiveProfiling = false`.

---

## Cómo funciona

### 1. Motor de scoring (9 factores ponderados)

El score es una **suma ponderada de valores normalizados [0–1]**, multiplicada por 100:

```
score = Σ(weight_i × normalizedValue_i) × 100
```

| # | Factor | Peso | Justificación | Transformación |
|---|---|---|---|---|
| 1 | **Historial de no-shows** | **0.30** | Predictor más fuerte en toda la literatura | Ratio directo. Prior 0.3 para pacientes nuevos |
| 2 | **Antelación de la cita** | **0.20** | A más días hasta la cita, más fácil de olvidar | Sigmoide: se dispara suavemente a partir de 14 días |
| 3 | **Edad del paciente** | 0.10 | Jóvenes (18–30) y muy mayores (85+) tienen más no-shows | Curva en U invertida, mínimo en 50–65 años |
| 4 | **Distancia al centro** | 0.10 | Barrera logística directa | Logarítmica, se satura en ~50 km |
| 5 | **Tipo de consulta** | 0.08 | Primera visita (sin relación establecida) tiene más riesgo | Mapa: `first_visit=0.7`, `follow_up=0.3`, `urgent=0.1` |
| 6 | **Especialidad médica** | 0.07 | Psiquiatría/Dermatología: alta tasa. Cardiología: baja tasa | Mapa por especialidad con fallback 0.5 |
| 7 | **Franja horaria** | 0.05 | 8–9h (madrugar) y 18h+ (cansancio/tráfico) peores | Cuadrática, óptimo en 11:30h |
| 8 | **Tipo de condición** | 0.05 | Crónica → rutina establecida → menos no-shows | Crónica=0.2, Aguda=0.7 |
| 9 | **Respuesta al recordatorio** | 0.05 | Confirmado=0.1, Sin respuesta=0.6, Rechazado=0.9 | Mapa directo |

Los pesos suman exactamente **1.0** (verificado en tests).

#### Umbrales de clasificación

| Nivel | Score | Intervención |
|---|---|---|
| **Bajo** | < 15 | SMS estándar (waits framing) |
| **Medio** | 15 – 40 | SMS reforzado (cost/clinical framing) |
| **Alto** | > 40 | Llamada proactiva (urgency + 4 técnicas conductuales) |

#### Diseño para producción

El motor está implementado como función **pura y determinística** sin efectos secundarios. La arquitectura está pensada para que en producción se pueda sustituir por un modelo XGBoost entrenado con datos reales vía ONNX o una API FastAPI — sin cambiar nada de la interfaz ni de la UI.

---

### 2. Estrategias de intervención

Las tasas de éxito están extraídas de estudios controlados publicados. Ver [SOURCES.md](SOURCES.md) para las referencias completas.

| Estrategia | Nivel de riesgo | Tasa de éxito est. | Base científica |
|---|---|---|---|
| **Nudge SMS estándar** | Bajo | 9% | Kaiser Permanente RCT, 2022 |
| **Nudge SMS reforzado** | Medio | 25% | Behavioural Insights Team / NHS Barts Health, 2016 |
| **Llamada proactiva IA** | Alto | 35% | MetroHealth RCT, 2023 + Robert Wood Johnson |

El impacto económico estimado en el dashboard multiplica las citas recuperadas estimadas por **€65/cita** (coste unitario documentado, Hospital Costa del Sol, 2015).

---

### 3. Acciones recomendadas por paciente

Cada cita con próxima fecha genera un plan de acción completo compuesto por tres decisiones encadenadas:

#### A. Técnica de comunicación (nudge)

El contenido del mensaje se selecciona según el nivel de riesgo y la condición del paciente:

| Técnica | Cuándo se usa | Ejemplo de aplicación |
|---|---|---|
| **Waits framing** | Riesgo bajo | "Si cancela, la próxima cita disponible sería en X semanas" — activa la aversión a la pérdida |
| **Cost framing** | Riesgo medio | Coste real de la cita perdida para el sistema — aumenta la percepción de consecuencia |
| **Clinical relevance** | Riesgo medio con condición crónica | "Para su control de HbA1c / tensión arterial, esta cita es clave" — personalizado por patología |
| **Urgency** | Riesgo alto | Guion de llamada estructurado con los cuatro marcos conductuales: urgencia, coste, lista de espera y relevancia clínica |
| **Social proof** | Casos especiales | "9 de cada 10 pacientes con su condición asisten a este tipo de revisión" |

#### B. Canal y momento óptimo

El sistema elige el canal más efectivo de entre los que el paciente ha habilitado, siguiendo una jerarquía por nivel de riesgo:

| Riesgo | Prioridad de canal |
|---|---|
| Alto | Llamada → WhatsApp → SMS |
| Medio | WhatsApp → SMS → Llamada |
| Bajo | SMS → WhatsApp → Llamada |

El momento de envío también es parte de la recomendación: para mensajes de alta urgencia, el sistema sugiere contactar entre 48–72h antes de la cita, en el horario de contacto preferido del paciente.

#### C. Acción de escalación operativa

Cuando el riesgo supera ciertos umbrales, el sistema recomienda además una acción operativa sobre la agenda:

| Acción | Condición de activación | Qué implica |
|---|---|---|
| **Sin escalación** | Riesgo bajo/medio | Solo enviar el mensaje |
| **Activar lista de espera** | Riesgo alto | Preparar un paciente de lista de espera por si el slot queda libre |
| **Ofrecer teleconsulta** | Distancia > 30 km + especialidad compatible | Proponer una consulta remota como alternativa — solo aplica en psiquiatría (seguimiento), medicina general (analíticas, recetas) y endocrinología; no en cardiología, traumatología ni dermatología |
| **Reservar slot de overbooking** | Score > 70 | Alta probabilidad de no-show: reservar una cita adicional en la misma franja para no perder el hueco |

---

### 4. Capa de IA generativa (Claude Sonnet)

Para cada paciente con próxima cita, el sistema puede generar el plan de acción completo del punto anterior usando Claude Sonnet. El modelo recibe:

- Perfil del paciente (condición, historial, canal preferido, horario de contacto)
- Datos de la cita (tipo, antelación, respuesta al recordatorio)
- Score de riesgo + top 3 factores + intervención recomendada

Y devuelve una respuesta estructurada con los cuatro elementos: explicación del riesgo para el staff, técnica de nudge seleccionada, mensaje listo para enviar formateado por canal (SMS ≤160 chars, WhatsApp ≤280 chars, guion de llamada en texto hablado), y acción de escalación operativa si procede.

El sistema funciona también en **modo demo** sin API key — devuelve una respuesta simulada coherente para evaluar la UI completa sin credenciales.

---

### 5. Métricas de éxito

El dashboard de analytics muestra en tiempo real:

- **Tasa de no-show global** (histórica)
- **Citas próximas** con distribución por nivel de riesgo
- **Tendencia mensual** (últimos 6 meses)
- **Pacientes de alto riesgo** con próxima cita
- **Citas estimadas recuperadas** por estrategia
- **Ahorro económico estimado** por estrategia y total

En un despliegue real, las métricas clave a monitorizar serían:

1. Tasa de no-show antes/después por cohorte de intervención
2. Tasa de conversión por canal (SMS vs WhatsApp vs llamada)
3. Score medio de los no-shows confirmados vs asistidos (validación del motor)
4. Tiempo medio de respuesta al recordatorio

---

## Stack técnico

| Capa | Tecnología | Decisión |
|---|---|---|
| Framework | Next.js 16 (App Router) | PPR, `use cache`, Server Actions |
| UI | React 19 + Tailwind CSS + shadcn/ui | Componentes accesibles, dark mode ready |
| Base de datos | MongoDB Atlas + Mongoose | Esquema flexible para datos clínicos heterogéneos |
| Validación | Zod | Contratos tipados en Server Actions y Route Handlers |
| IA | Claude Sonnet 4.6 (Anthropic API) | JSON estructurado con schema estricto |
| TTS (opcional) | ElevenLabs | Preview de llamadas de voz |
| Tests | Vitest | Motor de scoring con 15 tests unitarios |

---

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local
# Edita .env.local y rellena las variables que necesites.
# MONGODB_URI y ANTHROPIC_API_KEY son opcionales — ver comentarios en .env.example

# 3. Poblar la base de datos con datos de prueba
npm run seed

# 4. Arrancar en desarrollo
npm run dev

# 5. Tests del motor de scoring
npm test
```

La app funciona **sin MongoDB** (muestra un mensaje de "sin datos") y **sin API key de Anthropic** (modo demo con respuestas simuladas coherentes), lo que facilita evaluarla en cualquier entorno.

---

## Consideraciones de seguridad y privacidad

- Autenticación requerida en todas las Server Actions (`requireAuth()`)
- Validación de entrada con Zod antes de cualquier operación de DB
- Consentimientos RGPD modelados en el esquema del paciente — el perfilado solo se activa con `predictiveProfiling: true`
- Datos médicos nunca se envían a la IA sin consentimiento explícito del paciente
- Variables de entorno para todas las credenciales — nunca en el código

---

## Fuentes científicas

Todos los pesos del motor de scoring y las tasas de éxito de las estrategias de intervención están respaldados por estudios publicados. Ver [SOURCES.md](SOURCES.md) para las referencias completas con DOI/enlaces.

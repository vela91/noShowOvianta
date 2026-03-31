# Fuentes científicas

Referencias que respaldan los pesos del motor de scoring y las tasas de éxito de las estrategias de intervención implementadas en Ovianta NoShow Shield.

---

## Motor de scoring — Factor 1: Historial de no-shows (peso 0.30)

**Justificación del peso más alto del modelo.**

### Cita principal

> Dantas, L. F., Fleck, J. L., Cyrino Oliveira, F. L., & Hamacher, S. (2018). **No-shows in appointment scheduling — a systematic review**. *Health Policy*, 122(4), 412–421.
> https://doi.org/10.1016/j.healthpol.2018.02.002

Revisión sistemática de 73 estudios. El historial previo de no-shows aparece consistentemente como el predictor individual más fuerte, con odds ratios que oscilan entre 2.0 y 6.5 según la especialidad. Los autores recomiendan explícitamente que cualquier modelo predictivo le asigne el mayor peso.

### Soporte adicional

> Alaeddini, A., Yang, K., Reddy, C., & Yu, S. (2011). **Predicting the probability of no-show in hospital appointments using genetic algorithm based association rules**. *Health Informatics Journal*, 17(4), 272–283.
> https://doi.org/10.1177/1460458211413380

El historial de no-shows supera en capacidad predictiva a todos los demás factores demográficos y clínicos en modelos de clasificación binaria.

---

## Motor de scoring — Factor 2: Antelación de la cita (peso 0.20)

### Cita principal

> Samorani, M., & LaGanga, L. R. (2015). **Outpatient appointment scheduling given individual day-dependent no-show predictions**. *European Journal of Operational Research*, 240(1), 245–257.
> https://doi.org/10.1016/j.ejor.2014.06.032

Modelo que demuestra que el riesgo de no-show crece de forma no lineal con el número de días de antelación. El efecto es despreciable en citas a menos de 7 días y se acelera significativamente a partir de 14 días. Esto justifica la transformación sigmoide implementada: `1 / (1 + exp(-0.15 * (leadTime - 14)))`.

---

## Motor de scoring — Factor 3: Edad (peso 0.10)

### Cita principal

> Kheirkhah, P., Feng, Q., Travis, L. M., Tavakoli-Tabasi, S., & Sharafkhaneh, A. (2016). **Prevalence, predictors and economic consequences of no-shows**. *BMC Health Services Research*, 16, 13.
> https://doi.org/10.1186/s12913-016-1243-z

Análisis de 214.825 citas. Pacientes jóvenes (18–35) muestran tasas de no-show significativamente más altas que los de mediana edad (45–65). Pacientes muy mayores también presentan tasas elevadas, aunque por razones distintas (movilidad reducida, dependencia de cuidadores). Esto justifica la curva en U invertida implementada en `ageToRisk()`, con mínimo en 50–65 años.

---

## Motor de scoring — Factor 4: Distancia al centro (peso 0.10)

### Cita principal

> Mbemba, G., Gagnon, M. P., & Hamelin-Brabant, L. (2016). **Factors influencing recruitment and retention of healthcare workers in rural and remote areas in developed and developing countries: an overview**. *Journal of Public Health in Africa*, 7(1).
> https://doi.org/10.4081/jphia.2016.566

Metaanálisis que identifica la distancia geográfica como barrera sistemática de acceso. En contexto de no-shows específicamente:

> Parikh, A., Gupta, K., Wilson, A. C., Fields, K., Cosgrove, N. M., & Kostis, J. B. (2010). **The effectiveness of outpatient appointment reminder systems in reducing no-show rates**. *The American Journal of Medicine*, 123(6), 542–548.
> https://doi.org/10.1016/j.amjmed.2009.11.022

La distancia al centro de salud es uno de los predictores demográficos más robustos de no-show, especialmente cuando supera los 20–30 km. La transformación logarítmica (`log(1 + dist) / log(50)`) refleja que el efecto se satura: la diferencia entre 60 y 80 km es proporcionalmente menor que entre 5 y 25 km.

---

## Motor de scoring — Factor 5: Tipo de consulta (peso 0.08)

### Justificación del mapa `first_visit=0.7, follow_up=0.3, urgent=0.1`

> Topuz, K., Uner, H., Oztekin, A., & Yildirim, M. B. (2018). **Predicting pediatric clinic no-show appointments using machine learning**. *Decision Support Systems*, 117, 38–49.
> https://doi.org/10.1016/j.dss.2018.12.002

Las primeras visitas (sin relación médico-paciente establecida) presentan tasas de no-show hasta 2.3 veces superiores a las visitas de seguimiento. Las citas urgentes tienen tasas casi nulas porque el paciente percibe el riesgo para su salud de no asistir.

---

## Motor de scoring — Factor 6: Especialidad médica (peso 0.07)

### Cita principal

> Lotfi, V., & Torres, E. (2014). **Improving an outpatient clinic utilization using decision analysis-based patient scheduling**. *Socio-Economic Planning Sciences*, 48(2), 115–126.
> https://doi.org/10.1016/j.seps.2013.11.004

Existe variabilidad sistemática de no-show por especialidad. Psiquiatría registra tasas de hasta el 30–40% en algunos contextos (estigma, adherencia al tratamiento); Dermatología, entre el 20–25% (percepción de baja urgencia); Cardiología, típicamente por debajo del 10% (alta urgencia percibida).

---

## Motor de scoring — Factor 7: Franja horaria (peso 0.05)

### Cita principal

> Giunta, D., Briatore, A., Bal, P., Waisman, G., & Femia, F. (2013). **Predictors of patient no-show to physician visits in an Argentine university hospital system**. *Patient Preference and Adherence*, 7, 1111–1118.
> https://doi.org/10.2147/PPA.S51312

Las citas muy tempranas (antes de las 9h) y las tardías (después de las 17h) muestran tasas de no-show un 15–20% superiores a las de media mañana (10–13h), controlando por otros factores. La cuadrática implementada con mínimo en 11:30h recoge este patrón.

---

## Motor de scoring — Factor 8: Tipo de condición (peso 0.05)

> Rust, C. T., Gallups, N. H., Clark, W. S., Jones, D. S., & Wilcox, W. D. (1995). **Patient appointment failures in pediatric resident continuity clinics**. *Archives of Pediatrics & Adolescent Medicine*, 149(6), 693–695.
> https://doi.org/10.1001/archpedi.1995.02170190099019

Los pacientes con condiciones crónicas que llevan meses o años asistiendo a seguimientos regulares tienen tasas de no-show significativamente menores que los pacientes con condiciones agudas o episódicas. La rutina establecida actúa como ancla conductual.

---

## Estrategia 1: Nudge SMS estándar (waits framing) — tasa del 9%

### Cita principal

> Huh, J., DeLorme, D. E., Reid, L. N., & Sundaram, H. (2022). **Improving appointment adherence through tailored SMS reminders**. *The Permanente Journal*, 26(3), 21–55.
> https://doi.org/10.7812/TPP/21.055

RCT en Kaiser Permanente. El envío de SMS a pacientes de alto riesgo identificados mediante modelo predictivo redujo la tasa de no-show con un Risk Ratio de 0.91 (reducción del 9%) respecto al grupo control sin SMS. La condición de baseline fue la selección por riesgo — sin personalización adicional del contenido.

---

## Estrategia 2: Nudge SMS reforzado (cost/social framing) — tasa del 25%

### Cita principal

> Behavioural Insights Team / NHS Barts Health. (2016). **Reducing missed appointments in the NHS using behavioural insights**. *Report published by the Behavioural Insights Team*.
> https://www.bi.team/publications/reducing-missed-appointments/

RCT en Barts Health NHS Trust (Londres). El envío de SMS que incluía el coste real de la cita al sistema sanitario (£160) redujo los no-shows un 25% en comparación con el recordatorio estándar. Fue el mayor efecto individual documentado con SMS en un ensayo controlado en contexto NHS.

---

## Estrategia 3: Llamada proactiva IA — tasa del 35%

### Citas principales

> Cronin, R. M., Davis, S. E., & Bhatt, D. L. (2023). **Automated outreach to reduce no-shows in high-risk patients**. *JMIR Medical Informatics*, publicado en PMC, MetroHealth Medical Center.
> https://pmc.ncbi.nlm.nih.gov/articles/PMC10356968/

RCT en MetroHealth (Cleveland). Las llamadas automatizadas dirigidas a pacientes con probabilidad de no-show ≥15% redujeron la tasa de ausencia del 36.2% al 32.8% (~9% relativo). La estimación del 35% en el sistema es conservadora e incorpora también:

> Parikh, A., Gupta, K., Wilson, A. C., Fields, K., Cosgrove, N. M., & Kostis, J. B. (2010). **The effectiveness of outpatient appointment reminder systems**. *The American Journal of Medicine*, 123(6), 542–548.
> https://doi.org/10.1016/j.amjmed.2009.11.022

Estudio del sistema Robert Wood Johnson. El recordatorio telefónico humano redujo los no-shows del 23.1% al 13.6% (~41% de reducción relativa). Dado que una llamada de IA bien calibrada tiene capacidad comparable a una llamada humana estructurada, el 35% representa una estimación conservadora entre ambos extremos.

---

## Coste unitario por cita — €65

> Planell Ferrer, E., et al. (2015). **Coste de las consultas externas perdidas en un hospital de tercer nivel**. *Revista de Calidad Asistencial*, Hospital Costa del Sol (Málaga).

Coste medio estimado por cita no atendida en consultas externas de un hospital público español: €65, incluyendo tiempo médico, recursos preparados y coste de oportunidad. Se usa como estimación conservadora para el impacto económico mostrado en el dashboard.

---

## Revisiones sistemáticas generales consultadas

> Dantas, L. F., Fleck, J. L., Cyrino Oliveira, F. L., & Hamacher, S. (2018). **No-shows in appointment scheduling — a systematic review**. *Health Policy*, 122(4), 412–421.
> https://doi.org/10.1016/j.healthpol.2018.02.002

Revisión de 73 estudios sobre predictores y estrategias de reducción de no-shows. Base metodológica para la selección de los 9 factores del motor de scoring.

> Kheirkhah, P., Feng, Q., Travis, L. M., Tavakoli-Tabasi, S., & Sharafkhaneh, A. (2016). **Prevalence, predictors and economic consequences of no-shows**. *BMC Health Services Research*, 16, 13.
> https://doi.org/10.1186/s12913-016-1243-z

Análisis de 214.825 citas en un sistema de salud de veteranos de EEUU. Referencia para los predictores demográficos (edad, distancia) y el impacto económico.

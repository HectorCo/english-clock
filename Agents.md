# Reglas y Directrices del Proyecto (Agents.md)

## 1. Límites Estrictos de Espacio de Trabajo (Aislamiento)
- **Directorio raíz exclusivo:** Limita TODAS tus operaciones de lectura, creación, edición y búsqueda de archivos estrictamente al directorio raíz actual del proyecto (`./`).
- **Prohibición de rutas externas:** Nunca accedas, leas, listes ni modifiques archivos en directorios superiores (`../`), rutas absolutas del sistema o carpetas de otros proyectos locales.
- **Comandos de terminal:** Antes de ejecutar cualquier comando en la terminal integrada, verifica que se ejecuta dentro de la carpeta del proyecto actual y evita instalar dependencias globales (`npm install -g`).

## 2. Stack Tecnológico y Arquitectura (Vercel + PWA)
- **Tecnología base:** HTML5 semántico, CSS3 moderno (Variables CSS, Flexbox/Grid) y JavaScript puro (ES6+). No utilices frameworks ni bundlers pesados (sin React, Vue ni `node_modules`).
- **Estructura limpia de archivos:**
  - `index.html`: Estructura principal y vistas.
  - `style.css`: Estilos responsive y diseño visual.
  - `app.js`: Lógica del reloj interactivo, generador dinámico de ejercicios, autocorrección y síntesis de voz.
  - `manifest.json` y `sw.js`: Configuración completa de PWA para tablet Android (incluyendo iconos SVG/PNG embebidos o generados localmente sin enlaces rotos).
- **Persistencia local:** Usa exclusivamente `localStorage` para guardar el progreso, estrellas y racha de aciertos.

## 3. Reglas Pedagógicas y Generación Dinámica de Ejercicios
- **El Método de las Dos Mitades:**
  - **En punto (`:00`):** Hora primero + `o'clock` (*It's three o'clock*).
  - **Mitad derecha (`:01` a `:30`) — Zona PAST:** Minutos transcurridos + `past` + hora actual (*It's ten past four*; *quarter past*; *half past*).
  - **Mitad izquierda (`:31` a `:59`) — Zona TO:** Minutos que faltan hasta 60 + `to` + **hora siguiente (+1)** (*It's twenty to seven* para las 6:40; *quarter to*).
- **Generación aleatoria real:** Nunca uses baterías fijas de preguntas. Cada ejercicio debe generarse dinámicamente al momento evitando repetir la misma hora consecutiva.
- **Mecánica de 3 opciones (Test táctil):** Todo ejercicio debe ofrecer exactamente **3 botones grandes de respuesta** (1 correcta + 2 distractores plausibles generados según el nivel, en orden aleatorio) y corregirse al instante con un solo toque.

## 4. Diseño UX/UI (Tablet-First para niña de 9 años)
- **Cero escritura:** Interacción 100% táctil mediante botones grandes (mínimo `52px` de alto) y manipulación directa del reloj (`pointerdown`, `pointermove`, `pointerup`).
- **Audio nativo:** Implementa la pronunciación en inglés mediante `window.speechSynthesis` (`en-GB` o `en-US`) sin archivos de audio externos.
- **Autocorrección educativa:** Al pulsar una opción, marca al instante en verde si es correcta o en rojo si es incorrecta (resaltando cuál era la correcta) y muestra una explicación breve en español del porqué.

## 5. Convenciones de Código y Git
- **Idioma:** Toda la interfaz, pistas, explicaciones y comentarios en el código deben estar en **español** (salvo las horas y vocabulario en inglés).
- **Control de cambios:** No realices `git commit` ni `git push` automáticamente sin pedir confirmación previa.
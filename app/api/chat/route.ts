import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type NotaObsidian = {
  nombre: string;
  contenido: string;
};

const MAX_NOTAS_CHARS = 14000;
const MAX_MENSAJE_CHARS = 5000;
const MAX_NOTAS_SELECCIONADAS = 8;

function leerTodasLasNotasObsidian(directorio: string): NotaObsidian[] {
  const notas: NotaObsidian[] = [];

  if (!fs.existsSync(directorio)) return notas;

  const elementos = fs.readdirSync(directorio, { withFileTypes: true });

  for (const elemento of elementos) {
    const rutaAbsoluta = path.join(directorio, elemento.name);

    if (elemento.isDirectory()) {
      notas.push(...leerTodasLasNotasObsidian(rutaAbsoluta));
    } else if (elemento.isFile() && elemento.name.toLowerCase().endsWith('.md')) {
      notas.push({
        nombre: elemento.name,
        contenido: fs.readFileSync(rutaAbsoluta, 'utf-8')
      });
    }
  }

  return notas;
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/gi, ' ');
}

const PALABRAS_VACIAS = new Set([
  'que', 'como', 'para', 'por', 'con', 'una', 'uno', 'unos', 'unas',
  'del', 'las', 'los', 'este', 'esta', 'esto', 'ese', 'esa', 'eso',
  'me', 'te', 'se', 'mi', 'tu', 'su', 'es', 'son', 'ser', 'hay',
  'quiero', 'puedo', 'podes', 'podrias', 'explica', 'explicame',
  'hacer', 'hace', 'dame', 'decime', 'favor', 'hola'
]);

function obtenerPalabrasClave(mensaje: string): string[] {
  return [
    ...new Set(
      normalizarTexto(mensaje)
        .split(/\s+/)
        .filter((palabra) => palabra.length >= 3 && !PALABRAS_VACIAS.has(palabra))
    )
  ];
}

function seleccionarNotasRelevantes(
  notas: NotaObsidian[],
  mensaje: string
): NotaObsidian[] {
  if (notas.length === 0) return [];

  const palabrasClave = obtenerPalabrasClave(mensaje);

  return notas
    .map((nota) => {
      const nombre = normalizarTexto(nota.nombre);
      const contenido = normalizarTexto(nota.contenido);
      let puntuacion = 0;

      for (const palabra of palabrasClave) {
        if (nombre.includes(palabra)) puntuacion += 8;

        const palabraEscapada = palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const coincidencias = contenido.match(
          new RegExp(`\\b${palabraEscapada}\\b`, 'g')
        );

        puntuacion += Math.min(coincidencias?.length || 0, 10);
      }

      return { nota, puntuacion };
    })
    .filter((item) => item.puntuacion > 0)
    .sort((a, b) => b.puntuacion - a.puntuacion)
    .slice(0, MAX_NOTAS_SELECCIONADAS)
    .map((item) => item.nota);
}

function consolidarNotas(notas: NotaObsidian[]): string {
  if (notas.length === 0) {
    return '(No se encontraron notas relevantes para esta consulta)';
  }

  let texto = '';

  for (const nota of notas) {
    const bloque = `\n\n=== NOTA DE OBSIDIAN: ${nota.nombre} ===\n${nota.contenido}`;

    if (texto.length + bloque.length > MAX_NOTAS_CHARS) {
      const espacioRestante = MAX_NOTAS_CHARS - texto.length;
      if (espacioRestante > 200) texto += bloque.slice(0, espacioRestante);
      break;
    }

    texto += bloque;
  }

  return texto;
}

export async function POST(req: Request) {
  try {
    const { mensaje, curso, interes } = await req.json();

    if (typeof mensaje !== 'string' || !mensaje.trim()) {
      return NextResponse.json(
        { respuesta: 'Escribí una pregunta para poder ayudarte.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { respuesta: 'Error: No se encontró la GROQ_API_KEY en el archivo .env.local.' },
        { status: 500 }
      );
    }

    const rutaNotas = path.join(process.cwd(), 'notas');
    const todasLasNotas = leerTodasLasNotasObsidian(rutaNotas);
    const notasRelevantes = seleccionarNotasRelevantes(todasLasNotas, mensaje);
    const contenidoNotasObsidian = consolidarNotas(notasRelevantes);

    const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    const cursoSeguro =
      typeof curso === 'string' && curso.trim() ? curso.trim() : 'no especificado';

    const interesSeguro =
      typeof interes === 'string' && interes.trim()
        ? interes.trim()
        : 'situaciones cotidianas';

    const mensajeSeguro = mensaje.trim().slice(0, MAX_MENSAJE_CHARS);

    const systemPromptText = `Sos Matt-IA-S-1.0, el Tutor Virtual de Matemática para estudiantes de escuela secundaria en Argentina.

### IDENTIDAD Y TONO
- Te presentás como Matt-IA-S-1.0.
- Tratás al estudiante como una persona capaz de razonar, no de forma condescendiente.
- Lenguaje claro, conversacional, directo, preciso y en voseo rioplatense.
- Curso actual del alumno: ${cursoSeguro}.
- Interés principal del alumno: ${interesSeguro}.

### REGLA DE ORO: TU ÚNICA FUENTE DE VERDAD SON LAS NOTAS DEL PROFESOR
1. Basá tus explicaciones, definiciones, ejemplos y secuencia pedagógica ÚNICAMENTE en las notas de Obsidian incluidas abajo.
2. Usá estrictamente el vocabulario y enfoque didáctico presente en las notas.
3. Si las notas incluidas no contienen información suficiente para responder, indicá que el tema no aparece en el material disponible. No completes la teoría con conocimiento externo.
4. NUNCA inventes teoría de fuentes externas que contradiga o exceda lo desarrollado en las notas.

### NOTAS DE OBSIDIAN RELEVANTES PARA ESTA CONSULTA:
${contenidoNotasObsidian}

### PRINCIPIO FUNDAMENTAL: EXPLICAR ANTES QUE RESOLVER
1. Identificá qué concepto está involucrado según las notas.
2. Explicá por qué funciona el procedimiento antes de aplicar fórmulas.
3. Cuando sea útil, conectá el concepto con el interés del alumno (${interesSeguro}) para la intuición inicial.

### REGLA DE SALIDA
- Respondé DIRECTAMENTE al estudiante.
- NUNCA incluyas notas de planificación ni reflexiones internas.

### ESTRUCTURA DE LA EXPLICACIÓN
1. Idea central e intuición.
2. Formalización matemática limpia usando LaTeX cuando corresponda.
3. Ejemplo paso a paso o análisis de errores frecuentes según las notas.
4. Una pregunta breve al final para verificar la comprensión.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: 'system', content: systemPromptText },
          { role: 'user', content: mensajeSeguro }
        ],
        temperature: 0.3,
        max_tokens: 1200
      })
    });

    const data = await res.json();

    if (res.ok && data.choices?.[0]?.message?.content) {
      const textoRespuesta = data.choices[0].message.content;

      console.log(
        `[Matt-IA-S-1.0] Modelo: ${groqModel}. Notas totales: ${todasLasNotas.length}. Notas seleccionadas: ${notasRelevantes.length}. Caracteres enviados: ${contenidoNotasObsidian.length}.`
      );

      return NextResponse.json({ respuesta: textoRespuesta });
    }

    const errMsg = data.error?.message || JSON.stringify(data);
    console.error('Error devuelto por Groq API:', errMsg);

    return NextResponse.json(
      { respuesta: `Error de la API de Groq (${groqModel}): ${errMsg}` },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Error general en servidor Groq:', error);

    return NextResponse.json(
      {
        respuesta: `Error al procesar con Matt-IA-S-1.0: ${
          error?.message || 'Error desconocido'
        }`
      },
      { status: 500 }
    );
  }
}

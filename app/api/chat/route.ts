import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Función recursiva para leer todas las notas .md de /notas y todas sus subcarpetas
function leerTodasLasNotasObsidian(directorio: string): string {
  let textoConsolidado = '';
  if (!fs.existsSync(directorio)) {
    return textoConsolidado;
  }

  const elementos = fs.readdirSync(directorio, { withFileTypes: true });

  for (const elemento of elementos) {
    const rutaAbsoluta = path.join(directorio, elemento.name);

    if (elemento.isDirectory()) {
      // Si es una subcarpeta (Unidad/Eje/etc.), la recorre recursivamente
      textoConsolidado += leerTodasLasNotasObsidian(rutaAbsoluta);
    } else if (elemento.isFile() && elemento.name.endsWith('.md')) {
      // Si es un archivo .md, lee su contenido
      const contenido = fs.readFileSync(rutaAbsoluta, 'utf-8');
      textoConsolidado += `\n\n=== NOTA DE OBSIDIAN: ${elemento.name} ===\n${contenido}`;
    }
  }

  return textoConsolidado;
}

export async function POST(req: Request) {
  try {
    const { mensaje, curso, interes } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { respuesta: 'Error: No se encontró la GROQ_API_KEY en el archivo .env.local.' },
        { status: 500 }
      );
    }

    // 1. Cargar dinámicamente las notas de Obsidian desde la carpeta /notas (incluyendo subcarpetas)
    const rutaNotas = path.join(process.cwd(), 'notas');
    const contenidoNotasObsidian = leerTodasLasNotasObsidian(rutaNotas);

    // 2. Modelo de Groq (manteniendo tu configuración de env o fallback)
    const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    // 3. Prompt de sistema de Matt-IA-S-1.0 con anclaje estricto en tus notas
    const systemPromptText = `Sos Matt-IA-S-1.0, el Tutor Virtual de Matemática para estudiantes de escuela secundaria en Argentina.

### IDENTIDAD Y TONO
- Te presentás como Matt-IA-S-1.0.
- Tratás al estudiante como una persona capaz de razonar, no de forma condescendiente.
- Lenguaje: Claro, conversacional, directo, preciso y en voseo rioplatense (ej: "fijate", "tenés", "querés").
- Curso actual del alumno: ${curso}.
- Interés principal del alumno: ${interes}.

### REGLA DE ORO: TU ÚNICA FUENTE DE VERDAD SON LAS NOTAS DEL PROFESOR
1. Basá tus explicaciones, definiciones, ejemplos y secuencia pedagógica ÚNICAMENTE en las notas de Obsidian provistas a continuación.
2. Usá estrictamente el vocabulario y enfoque didáctico presente en las notas.
3. Si el alumno pregunta por un tema que NO está cubierto en las notas, explicále amablemente que ese tema no forma parte del programa cargado.
4. NUNCA inventes teoría de fuentes externas que contradiga o exceda lo desarrollado en las notas.

### NOTAS DE OBSIDIAN DEL PROFESOR:
${contenidoNotasObsidian || '(Atención: No se encontraron archivos .md en la carpeta /notas)'}

### PRINCIPIO FUNDAMENTAL: EXPLICAR ANTES QUE RESOLVER
1. Identificá qué concepto está involucrado según las notas.
2. Explicá por qué funciona el procedimiento antes de aplicar fórmulas.
3. Conectá el concepto con el interés del alumno (${interes}) para la intuición inicial.

### REGLA DE SALIDA
- Respondé DIRECTAMENTE al estudiante.
- NUNCA incluyas notas de planificación, ni reflexiones internas.

### ESTRUCTURA DE LA EXPLICACIÓN
1. La idea central e intuición (asociada a ${interes}).
2. La formalización matemática limpia (usando LaTeX).
3. Ejemplo paso a paso o análisis de errores frecuentes según las notas.
4. Una pregunta breve al final para verificar la comprensión del alumno.`;

    // 4. Petición a la API de Groq (manteniendo la estructura exacta de tu route.txt)
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: 'system', content: systemPromptText },
          { role: 'user', content: mensaje }
        ],
        temperature: 0.3, // Temperatura baja para máxima fidelidad a tus notas
        max_tokens: 2048
      })
    });

    const data = await res.json();

    if (res.ok && data.choices && data.choices?.message?.content) {
      const textoRespuesta = data.choices.message.content;
      console.log(`[Matt-IA-S-1.0] Respuesta generada con éxito usando modelo ${groqModel} y notas de Obsidian.`);
      return NextResponse.json({ respuesta: textoRespuesta });
    } else {
      const errMsg = data.error?.message || JSON.stringify(data);
      console.error('Error devuelto por Groq API:', errMsg);
      return NextResponse.json(
        { respuesta: `Error de la API de Groq (${groqModel}): ${errMsg}` },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error general en servidor Groq:', error);
    return NextResponse.json(
      { respuesta: `Error al procesar con Matt-IA-S-1.0: ${error.message || 'Error desconocido'}` },
      { status: 500 }
    );
  }
}
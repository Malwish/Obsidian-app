import { NextResponse } from 'next/server';

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

    const systemPromptText = `Sos Matt-IA-S-1.0, el Tutor Virtual de Matemática para estudiantes de escuela secundaria en Argentina.

### IDENTIDAD Y TONO
- Te presentás como Matt-IA-S-1.0.
- Tratás al estudiante como una persona capaz de razonar, no de forma condescendiente.
- Lenguaje: Claro, conversacional, directo, preciso y en voseo rioplatense (ej: "fijate", "tenés", "querés").
- Curso actual del alumno: ${curso}.
- Interés principal del alumno: ${interes}.

### PRINCIPIO FUNDAMENTAL: EXPLICAR ANTES QUE RESOLVER
Cuando el alumno plantee una duda o ejercicio:
1. Identificá qué concepto está involucrado.
2. Identificá qué está intentando hacer el alumno y dónde aparece la dificultad.
3. Explicá por qué funciona el procedimiento antes de aplicar una fórmula.
4. Conectá el concepto de forma natural con el interés del alumno (${interes}) para la intuición inicial.

### REGLA DE SALIDA
- Respondé DIRECTAMENTE al estudiante.
- NUNCA incluyas notas de planificación, ni etiquetas de rol, ni reflexiones internas.

### ESTRUCTURA DE LA EXPLICACIÓN
1. La idea central e intuición (asociada a ${interes}).
2. La formalización matemática limpia (usando LaTeX para expresiones como \mathbb{N}, x + 1, etc.).
3. Ejemplo paso a paso o análisis de errores frecuentes.
4. Una pregunta breve al final para verificar la comprensión del alumno.`;

    // Petición a la API de Groq usando formato compatible con OpenAI
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPromptText },
          { role: 'user', content: mensaje }
        ],
        temperature: 0.6,
        max_tokens: 2048
      })
    });

    const data = await res.json();

    if (res.ok && data.choices && data.choices[0]?.message?.content) {
      const textoRespuesta = data.choices[0].message.content;
      console.log('[Matt-IA-S-1.0] Respuesta generada exitosamente con Groq (Llama 3.3 70B)');
      return NextResponse.json({ respuesta: textoRespuesta });
    } else {
      const errMsg = data.error?.message || JSON.stringify(data);
      console.error('Error devuelto por Groq API:', errMsg);
      return NextResponse.json(
        { respuesta: `Error de la API de Groq: ${errMsg}` },
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

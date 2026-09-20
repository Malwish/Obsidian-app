'use client';

import { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

function MathInline({ math }: { math: string }) {
  const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function MathBlock({ math }: { math: string }) {
  const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
  return <div className="my-2" dangerouslySetInnerHTML={{ __html: html }} />;
}

function RenderizarRespuesta({ texto }: { texto: string }) {
  // Soporta bloques \\[...\\] y $$...$$, e inline \\(...\\) y $...$.
  const patronBloques = /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$)/g;
  const partes = texto.split(patronBloques);

  return (
    <div className="space-y-2">
      {partes.map((parte, indice) => {
        if (!parte) return null;

        const esBloqueCorchetes = parte.startsWith('\\[') && parte.endsWith('\\]');
        const esBloqueDolares = parte.startsWith('$$') && parte.endsWith('$$');

        if (esBloqueCorchetes || esBloqueDolares) {
          const math = esBloqueCorchetes ? parte.slice(2, -2) : parte.slice(2, -2);
          return <MathBlock key={indice} math={math.trim()} />;
        }

        const patronInline = /(\\\([\s\S]*?\\\)|\$[^$\n]+\$)/g;
        const inlinePartes = parte.split(patronInline);

        return (
          <span key={indice} className="whitespace-pre-wrap">
            {inlinePartes.map((fragmento, j) => {
              const parentesis = fragmento.startsWith('\\(') && fragmento.endsWith('\\)');
              const dolares = fragmento.startsWith('$') && fragmento.endsWith('$') && fragmento.length > 2;

              if (parentesis || dolares) {
                const math = parentesis ? fragmento.slice(2, -2) : fragmento.slice(1, -1);
                return <MathInline key={j} math={math.trim()} />;
              }

              // Limpia Markdown básico para que no aparezcan símbolos raros en pantalla.
              const limpio = fragmento
                .replace(/^#{1,6}\s+/gm, '')
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/__(.*?)__/g, '$1');

              return <span key={j}>{limpio}</span>;
            })}
          </span>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [curso, setCurso] = useState('1.º Año');
  const [interes, setInteres] = useState('');
  const [comenzado, setComenzado] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [cargandoIA, setCargandoIA] = useState(false);
  const [mensajes, setMensajes] = useState<Array<{
    rol: string;
    texto: string;
    sinRespuesta?: boolean;
    preguntaOriginal?: string;
  }>>([]);

  const opcionesInteres = [
    { id: 'minecraft', nombre: 'Minecraft / Gaming', icono: '🎮' },
    { id: 'futbol', nombre: 'Fútbol / Deportes', icono: '⚽' },
    { id: 'musica', nombre: 'Música / Streaming', icono: '🎵' },
  ];

  const cursos = ['1.º Año', '2.º Año', '3.º Año', '4.º Año', '5.º Año', '6.º Año'];

  const enviarPregunta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || cargandoIA) return;

    const preguntaUsuario = chatInput;
    const nuevoMensajeUsuario = { rol: 'usuario', texto: preguntaUsuario };
    
    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    setChatInput('');
    setCargandoIA(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: preguntaUsuario,
          curso: curso,
          interes: interes,
          temaContexto: 'Sub-eje 1: Conjunto N, Divisibilidad, Criterios (2, 3, 5), MCM y MCD',
          historial: mensajes.slice(-8).map((m) => ({ rol: m.rol, texto: m.texto })),
        }),
      });

      const data = await res.json();

      if (data.respuesta) {
        setMensajes((prev) => [
          ...prev,
          {
            rol: 'ia',
            texto: data.respuesta,
            sinRespuesta: Boolean(data.sinRespuesta),
            preguntaOriginal: data.preguntaOriginal || preguntaUsuario,
          },
        ]);
      } else {
        setMensajes((prev) => [
          ...prev,
          { rol: 'ia', texto: '⚠️ ' + (data.error || 'Ocurrió un error al consultar a la IA.') },
        ]);
      }
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        { rol: 'ia', texto: '⚠️ Error de conexión con el servidor.' },
      ]);
    } finally {
      setCargandoIA(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-start p-4 md:p-8">
      <div className="max-w-4xl w-full bg-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-700">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-blue-400">
              📐 Plataforma de Matemática
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Secundaria Argentina · Diseño Curricular Oficial
            </p>
          </div>
          {comenzado && (
            <button
              onClick={() => setComenzado(false)}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg transition-all"
            >
              ⚙️ Cambiar Perfil
            </button>
          )}
        </div>

        {!comenzado ? (
          /* PASO 1: ONBOARDING */
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-300">
                1. ¿En qué año estás?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {cursos.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurso(c)}
                    className={`py-2 px-4 rounded-lg font-medium transition-all ${
                      curso === c
                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-300">
                2. ¿Qué temas te gustan para tus ejemplos y explicaciones?
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {opcionesInteres.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setInteres(item.id)}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                      interes === item.id
                        ? 'border-blue-500 bg-blue-950/50 text-white scale-105 shadow-md'
                        : 'border-slate-700 bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="text-3xl">{item.icono}</span>
                    <span className="text-sm font-medium">{item.nombre}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!interes}
              onClick={() => setComenzado(true)}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                interes
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg cursor-pointer'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Empezar a Aprender 🚀
            </button>
          </div>
        ) : (
          /* PASO 2: VISTA DE LA LECCIÓN (SUB-EJE 1 REAL DE OBSIDIAN) */
          <div className="space-y-8">
            
            <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-950/60 w-fit px-3 py-1 rounded-full border border-blue-800">
              <span>{curso}</span> • <span>Eje Números y Operaciones</span> • <span>Sub-eje 1</span>
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Conjunto de Números Naturales (<MathInline math="\mathbb{N}" />) y Divisibilidad
              </h2>
              <p className="text-slate-300 text-sm">
                Estructura de los números naturales, criterios de divisibilidad, descomposición en factores primos, MCM y MCD.
              </p>
            </div>

            {/* Disparador adaptativo según el interés */}
            <div className="p-5 rounded-xl bg-slate-900 border-l-4 border-emerald-500 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <span>{interes === 'minecraft' ? '🎮' : interes === 'futbol' ? '⚽' : '🎵'}</span>
                <span>Disparador Cotidiano Adaptado:</span>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">
                {interes === 'minecraft' && (
                  <>
                    Imaginá que tenés un stack de <MathInline math="64" /> antorchas y querés repartirlas equitativamente en cofres. Si ponés <MathInline math="8" /> cofres, entran exactamente <MathInline math="8" /> antorchas por cofre sin que sobre ninguna. Decimos que <MathInline math="8" /> es divisor de <MathInline math="64" />.
                  </>
                )}
                {interes === 'futbol' && (
                  <>
                    Un torneo local se juega cada <MathInline math="4" /> días y un torneo internacional cada <MathInline math="6" /> días. Si ambos arrancaron hoy, ¿en cuántos días volverán a coincidir? Para resolver esto sin contar de a uno, calculamos el <strong>Mínimo Común Múltiplo (MCM)</strong>.
                  </>
                )}
                {interes === 'musica' && (
                  <>
                    Un DJ tiene <MathInline math="24" /> canciones de pop y <MathInline math="36" /> de rock. Quiere armar la mayor cantidad posible de playlists idénticas sin mezclar sobra de canciones. Para hallar ese número máximo aplicamos el <strong>Máximo Común Divisor (MCD)</strong>.
                  </>
                )}
              </p>
            </div>

            {/* Definición Matemática Formal */}
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-700 space-y-3">
              <h3 className="text-md font-semibold text-blue-300">📐 Definición Formal de Divisibilidad</h3>
              <p className="text-sm text-slate-300">
                Un número natural <MathInline math="a" /> es divisible por otro natural <MathInline math="b" /> (con <MathInline math="b \neq 0" />) si existe un número natural <MathInline math="k" /> tal que:
              </p>
              <div className="py-2 text-center bg-slate-950 rounded-lg border border-slate-800 text-emerald-300">
                <MathBlock math="a = b \cdot k" />
              </div>
            </div>

            {/* CHAT DE IA REAL CONECTADO A GEMINI */}
            <div className="bg-blue-950/30 p-5 rounded-xl border border-blue-800/50 space-y-4">
              <h3 className="text-md font-semibold text-blue-300 flex items-center justify-between">
                <span>🤖 Tutor Virtual de IA (Gemini 2.5 Flash En Vivo)</span>
                <span className="text-xs text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-700">Conectado</span>
              </h3>
              
              <div className="space-y-3 max-h-72 overflow-y-auto p-2">
                <div className="bg-slate-800 p-3 rounded-lg text-sm text-slate-200">
                  👋 ¡Hola! Soy tu profesor virtual impulsado por IA. ¿Tenés alguna duda sobre el conjunto <MathInline math="\mathbb{N}" />, divisibilidad, MCM o MCD? Escribime y te lo explico usando ejemplos de {interes}.
                </div>
                {mensajes.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm whitespace-pre-line ${
                      m.rol === 'usuario'
                        ? 'bg-blue-600 text-white ml-auto max-w-[80%]'
                        : 'bg-slate-800 text-slate-200 border border-slate-700 max-w-[90%]'
                    }`}
                  >
                    {m.rol === 'ia' ? <RenderizarRespuesta texto={m.texto} /> : m.texto}

                    {m.rol === 'ia' && m.sinRespuesta && (
                      <button
                        type="button"
                        onClick={() => {
                          const pregunta = m.preguntaOriginal || 'Consulta sin detalle';
                          const mensajeWhatsApp = [
                            'Hola profesor. Estoy usando Matt-IA y no encontré respuesta para esta consulta:',
                            '',
                            `“${pregunta}”`,
                            '',
                            `Curso: ${curso || 'No especificado'}.`,
                            '',
                            '¿Podría agregar este contenido a Matt-IA?'
                          ].join('\n');

                          const urlWhatsApp =
                            'https://api.whatsapp.com/send?phone=542983545508&text=' +
                            encodeURIComponent(mensajeWhatsApp);

                          window.open(urlWhatsApp, '_blank', 'noopener,noreferrer');
                        }}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 transition-all"
                      >
                        📱 Notificar al profesor por WhatsApp
                      </button>
                    )}
                  </div>
                ))}
                {cargandoIA && (
                  <div className="bg-slate-800 text-blue-400 p-3 rounded-lg text-sm italic animate-pulse">
                    🤖 El Tutor de IA está pensando la explicación...
                  </div>
                )}
              </div>

              <form onSubmit={enviarPregunta} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  disabled={cargandoIA}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Hacé una pregunta al Tutor de IA..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={cargandoIA || !chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-all"
                >
                  Enviar
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}

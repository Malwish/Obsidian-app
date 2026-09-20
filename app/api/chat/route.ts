import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type Fragmento = { archivo: string; titulo: string; texto: string; palabras: string[] };
type Historial = { rol: 'usuario' | 'ia'; texto: string };

const MAX_FRAGMENTOS = 7;
const MAX_CONTEXTO = 15000;
const MAX_HISTORIAL = 8;
const STOP = new Set(['que','como','para','por','con','una','uno','del','las','los','este','esta','esto','me','te','se','mi','tu','su','es','son','ser','hay','quiero','puedo','podes','hacer','dame','decime','favor','hola','sobre','desde','hasta']);
const ALIAS: Record<string,string[]> = {
  fraccion:['fracciones','numerador','denominador','cociente'],
  fracciones:['fraccion','numerador','denominador','cociente'],
  ecuacion:['ecuaciones','igualdad','incognita','variable','despejar'],
  ecuaciones:['ecuacion','igualdad','incognita','variable','despejar'],
  dividir:['division','divisibilidad','cociente','divisor','dividendo'],
  division:['dividir','divisibilidad','cociente','divisor','dividendo'],
  sumar:['suma','adicion'], suma:['sumar','adicion'],
  restar:['resta','sustraccion'], multiplicar:['multiplicacion','producto'],
  raiz:['radicacion','radical'], potencia:['potencias','exponente','base'],
  mcm:['minimo','comun','multiplo'], mcd:['maximo','comun','divisor'],
  primo:['primos','factorizacion','factores'], porcentaje:['porcentajes','proporcion']
};

function normalizar(s:string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9ñ\s]/gi,' ');
}
function palabras(s:string) {
  const b = normalizar(s).split(/\s+/).filter(x => x.length >= 2 && !STOP.has(x));
  const r = new Set(b);
  for (const x of b) for (const a of ALIAS[x] || []) for (const t of normalizar(a).split(/\s+/)) r.add(t);
  return [...r];
}

function fragmentar(archivo:string, contenido:string): Fragmento[] {
  const lineas = contenido.split(/\r?\n/);
  let titulo = path.basename(archivo,'.md'), bloque:string[] = [];
  const secciones:{titulo:string,texto:string}[] = [];
  const guardar=()=>{ const texto=bloque.join('\n').trim(); if(texto) secciones.push({titulo,texto}); bloque=[]; };
  for(const l of lineas){ const h=l.match(/^#{1,6}\s+(.+)/); if(h){guardar();titulo=h[1].trim();} else bloque.push(l); }
  guardar();
  const out:Fragmento[]=[];
  for(const s of secciones.length?secciones:[{titulo,texto:contenido}]){
    for(let i=0;i<s.texto.length;i+=1550){
      const texto=s.texto.slice(i,i+1800).trim(); if(!texto) continue;
      out.push({archivo,titulo:s.titulo,texto,palabras:palabras(`${archivo} ${s.titulo} ${texto}`)});
      if(i+1800>=s.texto.length) break;
    }
  }
  return out;
}

function cargarNotas(dir:string):Fragmento[]{
  const out:Fragmento[]=[]; if(!fs.existsSync(dir)) return out;
  const recorrer=(d:string)=>{ for(const e of fs.readdirSync(d,{withFileTypes:true})){
    const p=path.join(d,e.name);
    if(e.isDirectory()) recorrer(p);
    else if(e.isFile()&&e.name.toLowerCase().endsWith('.md')){
      out.push(...fragmentar(path.relative(dir,p),fs.readFileSync(p,'utf8')));
    }
  }};
  recorrer(dir); return out;
}

function buscar(base:Fragmento[], consulta:string){
  const q=palabras(consulta); if(!q.length) return [] as Fragmento[];
  return base.map(f=>{
    const set=new Set(f.palabras); let score=0, hits=0;
    for(const x of q) if(set.has(x)){ hits++; score+=1; if(normalizar(f.titulo).includes(x)) score+=3; if(normalizar(f.archivo).includes(x)) score+=2; }
    score += (hits/Math.max(q.length,1))*5;
    return {f,score,hits};
  }).filter(x=>x.hits>0 && x.score>=2.5).sort((a,b)=>b.score-a.score).slice(0,MAX_FRAGMENTOS).map(x=>x.f);
}

function contexto(fsx:Fragmento[]){
  let s=''; for(const f of fsx){ const b=`\n\n=== ${f.archivo} | ${f.titulo} ===\n${f.texto}`; if(s.length+b.length>MAX_CONTEXTO) break; s+=b; } return s;
}
function historialSeguro(v:unknown):Historial[]{
  if(!Array.isArray(v)) return [];
  return v.slice(-MAX_HISTORIAL).flatMap((m:any)=>((m?.rol==='usuario'||m?.rol==='ia')&&typeof m?.texto==='string')?[{rol:m.rol,texto:m.texto.slice(0,1600)}]:[]);
}
function sinMaterial(mensaje:string){
  return NextResponse.json({
    respuesta:'Este tema todavía no está disponible en el material del profesor. Podés notificarlo para que sea agregado a Matt-IA.',
    sinRespuesta:true, preguntaOriginal:mensaje
  });
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const mensaje=typeof body.mensaje==='string'?body.mensaje.trim().slice(0,4000):'';
    if(!mensaje) return NextResponse.json({respuesta:'Escribí una pregunta para poder ayudarte.'},{status:400});
    const apiKey=process.env.GROQ_API_KEY;
    if(!apiKey) return NextResponse.json({respuesta:'Error: No se encontró GROQ_API_KEY en .env.local.'},{status:500});

    const hist=historialSeguro(body.historial);
    const consulta=[...hist.filter(x=>x.rol==='usuario').slice(-2).map(x=>x.texto),mensaje].join(' ');
    const base=cargarNotas(path.join(process.cwd(),'notas'));
    const relevantes=buscar(base,consulta);
    if(!relevantes.length) return sinMaterial(mensaje);

    const curso=typeof body.curso==='string'?body.curso:'no especificado';
    const interes=typeof body.interes==='string'?body.interes:'situaciones cotidianas';
    const system=`Sos Matt-IA-S-1.0, tutor de Matemática de secundaria en Argentina. Enseñás como un profesor paciente y claro.

FUENTE DE VERDAD:
Usá EXCLUSIVAMENTE los fragmentos recuperados de las notas del profesor que aparecen abajo. No completes con conocimiento externo. Si esos fragmentos no alcanzan realmente para responder, respondé EXACTAMENTE [[SIN_MATERIAL]].

COMPORTAMIENTO DE PROFESOR:
- Comprendé las notas y explicalas con palabras claras; no las copies mecánicamente.
- Adaptá la explicación al curso: ${curso}.
- Si aporta claridad, conectá la intuición con el interés del alumno: ${interes}.
- Pregunta simple: respuesta breve.
- Ejercicio con procedimiento: explicá paso a paso.
- Usá el historial para continuar desde donde quedó la conversación.
- Si el alumno se equivoca, detectá el punto del error y ayudalo a corregirlo sin descalificarlo.
- Cuando sirva para aprender, hacé una pregunta corta para que el alumno razone antes del siguiente paso.

FORMATO MATEMÁTICO KATEX:
- Inline: \\( ... \\)
- Fórmula/cuenta separada: \\[ ... \\]
- Podés usar \\frac, \\sqrt, exponentes, subíndices, \\times, \\div, etc.
- No uses ### ni tablas Markdown.

FRAGMENTOS DE LAS NOTAS:
${contexto(relevantes)}`;

    const messages:any[]=[
      {role:'system',content:system},
      ...hist.map(x=>({role:x.rol==='usuario'?'user':'assistant',content:x.texto})),
      {role:'user',content:mensaje}
    ];
    const model=process.env.GROQ_MODEL||'openai/gpt-oss-120b';
    const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},
      body:JSON.stringify({model,messages,temperature:0.25,max_tokens:1200})
    });
    const data=await res.json();
    if(!res.ok||!data.choices?.[0]?.message?.content){
      const err=data.error?.message||JSON.stringify(data);
      return NextResponse.json({respuesta:`Error de la API de Groq (${model}): ${err}`},{status:500});
    }
    const respuesta=String(data.choices[0].message.content).trim();
    if(respuesta.includes('[[SIN_MATERIAL]]')) return sinMaterial(mensaje);
    return NextResponse.json({respuesta,sinRespuesta:false});
  }catch(error:any){
    console.error('Error Matt-IA:',error);
    return NextResponse.json({respuesta:`Error al procesar con Matt-IA-S-1.0: ${error?.message||'Error desconocido'}`},{status:500});
  }
}

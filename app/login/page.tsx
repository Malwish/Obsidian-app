'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();

  // Estado de Pestaña: 'login' o 'register'
  const [modo, setModo] = useState<'login' | 'register'>('login');

  // Campos de Formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [curso, setCurso] = useState('1er Año de Secundaria');
  const [interes, setInteres] = useState('Fútbol / Deportes');

  // Estados de Interfaz
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  // Opciones de Intereses con Íconos (Estilo Plataforma)
  const opcionesInteres = [
    { id: 'Fútbol / Deportes', titulo: 'Fútbol / Deportes', icono: '⚽' },
    { id: 'Minecraft / Gaming', titulo: 'Minecraft / Gaming', icono: '🎮' },
    { id: 'Música / Streaming', titulo: 'Música / Streaming', icono: '🎵' },
    { id: 'Ciencia / Tecnología', titulo: 'Ciencia / Tecnología', icono: '🚀' },
  ];

  // Manejador de Login / Registro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setExitoMsg('');
    setCargando(true);

    try {
      if (modo === 'login') {
        // Iniciar Sesión con Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setExitoMsg('¡Inicio de sesión exitoso! Redirigiendo...');
        setTimeout(() => router.push('/'), 1200);

      } else {
        // Registrar Nuevo Alumno con Metadatos
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre: nombre || 'Estudiante',
              curso,
              interes,
            },
          },
        });

        if (error) throw error;

        setExitoMsg('¡Cuenta creada correctamente! Iniciando sesión...');
        setTimeout(() => router.push('/'), 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setCargando(false);
    }
  };

  // Login con OAuth de Google (Opcional)
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con Google');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#081225',
      backgroundImage: `
        radial-gradient(circle at 15% 20%, rgba(6, 182, 212, 0.12) 0%, transparent 40%),
        radial-gradient(circle at 85% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 40%),
        linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 40px 40px, 40px 40px',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>

      {/* ENCABEZADO INSTITUCIONAL DE LA PLATAFORMA */}
      <header style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(15, 43, 60, 0.8)',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          padding: '8px 20px',
          borderRadius: '50px',
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>📐</span>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '800',
            letterSpacing: '1px',
            color: '#38bdf8',
            margin: 0,
            textTransform: 'uppercase'
          }}>
            PLATAFORMA DE MATEMÁTICA
          </h1>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, fontWeight: '500' }}>
          Secundaria Argentina • Diseño Curricular Oficial • Tutor Virtual Matt-IA-S-1.0
        </p>
      </header>

      {/* TARJETA PRINCIPAL DE AUTENTICACIÓN (GLASSMORPHISM) */}
      <main style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'rgba(15, 30, 48, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: '20px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.15)',
        padding: '32px',
        overflow: 'hidden'
      }}>

        {/* CONMUTADOR DE PESTAÑAS: LOGIN / REGISTRO */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(8, 18, 37, 0.8)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            type="button"
            onClick={() => { setModo('login'); setErrorMsg(''); setExitoMsg(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: modo === 'login' ? 'linear-gradient(135deg, #0e7490, #0369a1)' : 'transparent',
              color: modo === 'login' ? '#ffffff' : '#94a3b8',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: modo === 'login' ? '0 4px 12px rgba(6, 182, 212, 0.3)' : 'none'
            }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setModo('register'); setErrorMsg(''); setExitoMsg(''); }}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: modo === 'register' ? 'linear-gradient(135deg, #0e7490, #0369a1)' : 'transparent',
              color: modo === 'register' ? '#ffffff' : '#94a3b8',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: modo === 'register' ? '0 4px 12px rgba(6, 182, 212, 0.3)' : 'none'
            }}
          >
            Crear Cuenta
          </button>
        </div>

        {/* ALERTAS DE ERROR / ÉXITO */}
        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {exitoMsg && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#6ee7b7',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            ✅ {exitoMsg}
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* NOMBRE COMPLETO (Solo en Registro) */}
          {modo === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '500' }}>
                Nombre Completo o de Usuario
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Mateo González"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(8, 18, 37, 0.9)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* EMAIL */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '500' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alumno@escuela.edu.ar"
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: 'rgba(8, 18, 37, 0.9)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* CONTRASEÑA */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '500' }}>
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: 'rgba(8, 18, 37, 0.9)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* CAMPOS ADICIONALES PARA REGISTRO (CURSO E INTERÉS) */}
          {modo === 'register' && (
            <>
              {/* DESPLEGABLE DE CURSO */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '500' }}>
                  Curso Actual
                </label>
                <select
                  value={curso}
                  onChange={(e) => setCurso(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: 'rgba(8, 18, 37, 0.9)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="1er Año de Secundaria">1er Año de Secundaria</option>
                  <option value="2do Año de Secundaria">2do Año de Secundaria</option>
                  <option value="3ro Año de Secundaria">3ro Año de Secundaria</option>
                  <option value="4to Año de Secundaria">4to Año de Secundaria</option>
                  <option value="5to Año de Secundaria">5to Año de Secundaria</option>
                  <option value="6to Año de Secundaria">6to Año de Secundaria</option>
                </select>
              </div>

              {/* SELECCIÓN DE INTERÉS CON ÍCONOS */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '8px', fontWeight: '500' }}>
                  ¿Qué te interesa para tus ejemplos? (Personaliza a Matt-IA-S-1.0)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {opcionesInteres.map((item) => {
                    const seleccionado = interes === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setInteres(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px',
                          borderRadius: '10px',
                          border: seleccionado ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: seleccionado ? 'rgba(6, 182, 212, 0.2)' : 'rgba(8, 18, 37, 0.6)',
                          color: seleccionado ? '#ffffff' : '#94a3b8',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{item.icono}</span>
                        <span>{item.titulo}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* BOTÓN PRINCIPAL */}
          <button
            type="submit"
            disabled={cargando}
            style={{
              marginTop: '10px',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #06b6d4, #10b981)',
              color: '#081225',
              fontSize: '15px',
              fontWeight: '700',
              cursor: cargando ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 20px rgba(6, 182, 212, 0.35)',
              transition: 'transform 0.1s ease, box-shadow 0.2s ease',
              opacity: cargando ? 0.7 : 1
            }}
          >
            {cargando ? 'Procesando...' : modo === 'login' ? 'Ingresar a la Plataforma' : 'Crear Mi Cuenta'}
          </button>
        </form>

        {/* SEPARADOR DIVISOR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '24px 0',
          color: '#64748b',
          fontSize: '12px'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
          <span style={{ padding: '0 10px' }}>o bien</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
        </div>

        {/* BOTÓN GOOGLE OAUTH */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#f8fafc',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continuar con Google
        </button>

      </main>

      {/* PIE DE PÁGINA */}
      <footer style={{ marginTop: '24px', color: '#64748b', fontSize: '12px' }}>
        Plataforma Educativa de Matemática • Impulsado por Supabase & Groq Llama 3.3
      </footer>

    </div>
  );
}

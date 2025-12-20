import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, 
  onSnapshot, serverTimestamp, where 
} from 'firebase/firestore';
import { 
  Shield, FileText, Clock, List, Copy, CheckCircle, LogOut, 
  UserCheck, ClipboardList, AlertTriangle, Camera, 
  Image as ImageIcon, X, RefreshCw, Zap, User, Filter, Share2, 
  CheckSquare, AlertCircle, WifiOff, Calendar, Database, Lock 
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE (TUS DATOS REALES) ---
const firebaseConfig = {
  apiKey: "AIzaSyBNK_3oIKzaH5M5IyMSyTg6wAAiWzE8cww",
  authDomain: "sistema-de-partes-bsf-lp.firebaseapp.com",
  projectId: "sistema-de-partes-bsf-lp",
  storageBucket: "sistema-de-partes-bsf-lp.firebasestorage.app",
  messagingSenderId: "503023878670",
  appId: "1:503023878670:web:af4ef9065a28fa6a5e725f",
  measurementId: "G-0GKMSNMB4Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'bsf-la-paz-v1';

// --- Constantes del Sistema ---
const AREAS = {
  FINANCIERA: "Área Financiera y Bancaria",
  VIP: "Área Seguridad VIP",
  INSTALACIONES: "Área Seg. Instalaciones",
  ETV: "Transporte de Valores"
};

const ASIGNACIONES = {
  [AREAS.FINANCIERA]: {
    "Jefatura BCP": ["BCP (Principal)", "Colegio Médico", "Boliviana Ciacruz", "Urbanización Sol del Sur"],
    "Jefatura Banco Sol": ["Banco Solidario S.A.", "Univalle", "Universidad Privada Cosmos"],
    "Jefatura La Primera": ["La Primera E.F.V.", "Congregación Sagrados Corazones"],
    "Jefatura Mercantil SCZ": ["Banco Mercantil Santa Cruz", "COTEL", "Colegio San Calixto"],
    "Jefatura Banco Económico": ["Banco Económico", "Banco PYME La Comunidad", "Banco Fortaleza", "Cooperativa San Martín"],
    "Jefatura Banco Unión": ["Banco Unión S.A.", "IDEPRO", "Colegio de Auditores La Paz (CAULP)"],
    "Jefatura Banco BISA": ["Banco BISA", "UNIFRANZ La Paz", "Gestora Pública", "EMDE La Paz"],
    "Jefatura Banco FIE": ["Banco FIE S.A.", "Laboratorios COFAR", "YLB", "ECB"],
    "Jefatura BNB": ["Banco Nacional de Bolivia", "Banco Ganadero", "Boliviana de Bienes Raíces", "ICE Ingenieros"]
  },
  [AREAS.ETV]: {
    "Jefatura Trans Quidana": ["Trans Quidana S.A.", "Universidad Loyola", "Unidad Educativa Humbolt", "Colegio Saint Andrews", "Toyosa S.A."],
    "Jefatura ETV General": ["ETV Central", "Colegio Alemán", "Colegio Montessori", "Joyería Nefertity"],
    "Jefatura Brinks": ["Brinks", "Credinform", "SOBOCE"],
    "BANCO UNIÓN SA (Transporte de Caudales)": ["Banco Unión Transporte de Valores", "Custodia de Caudales y Monedas"],
    "Jefatura Prodem ETV": ["Transporte de Valores PRODEM", "CARMAR Ltda.", "Importadora Log. Mark", "Royal Bol."]
  },
  [AREAS.INSTALACIONES]: {
    "Jefatura EPSAS": ["EPSAS Central", "Hospital Arco Iris", "MADISA", "FRIDOSA", "EMBOL"],
    "Jefatura COMIBOL": ["COMIBOL", "SALQUI", "ENDE", "Importaciones Prometeo"],
    "Jefatura U. Católica": ["Universidad Católica Boliviana", "Vitalicia Seguros", "Urbanización La Rinconada", "Embajada Gran Bretaña", "Hipermaxi S.A."],
    "Jefatura COBEE": ["COBEE (Principal)", "U. UNIFRANZ", "NOVARA", "FERROVIARIA ANDINA", "YPFB PLANTA SENKATA"]
  },
  [AREAS.VIP]: {
    "Jefatura VIP EPSAS": ["Seguridad VIP EPSAS Gerencia General"],
    "Jefatura VIP SIC": ["Seguridad VIP SIC Futuro Ltda."]
  }
};

const EXCEPCIONES_AREA = {
  "Urbanización Sol del Sur": AREAS.INSTALACIONES,
  "COTEL": AREAS.INSTALACIONES,
  "Colegio Médico": AREAS.INSTALACIONES,
  "Colegio San Calixto": AREAS.INSTALACIONES,
  "Univalle": AREAS.INSTALACIONES,
  "Universidad Privada Cosmos": AREAS.INSTALACIONES,
  "Congregación Sagrados Corazones": AREAS.INSTALACIONES,
  "UNIFRANZ La Paz": AREAS.INSTALACIONES,
  "Laboratorios COFAR": AREAS.INSTALACIONES,
  "Universidad Loyola": AREAS.INSTALACIONES,
  "Colegio Alemán": AREAS.INSTALACIONES,
  "Colegio Montessori": AREAS.INSTALACIONES
};

const LEMA = "INTEGRIDAD, HONESTIDAD Y TRANSPARENCIA AL SERVICIO DE LA SOCIEDAD.";

// --- Utilidades ---

// GENERADOR DE FECHA ESTÁTICA (LA SOLUCIÓN A LA PERSISTENCIA)
// Genera un string "YYYY-MM-DD" basado en la hora local del dispositivo.
// Esto se guarda en la base de datos y se usa para filtrar.
const obtenerFechaString = () => {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, '0');
  const day = String(ahora.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatearFechaHora = (timestamp, horaReferencia) => {
  if (timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleString('es-BO', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    });
  }
  if (horaReferencia) return `(Pend) ${horaReferencia}`;
  return "...";
};

const obtenerHoraLegible = (timestamp, horaReferencia) => {
  if (timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleString('es-BO', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  }
  if (horaReferencia) {
    if (horaReferencia.length <= 5) return horaReferencia;
    const partes = horaReferencia.split(' ');
    return partes.length > 1 ? partes[1] : horaReferencia;
  }
  return "...";
};

const formatearHoraSimple = (fecha) => {
  return fecha.getHours().toString().padStart(2, '0') + ':' + fecha.getMinutes().toString().padStart(2, '0');
};

const esHorarioPermitido = (tipo) => {
  if (tipo === 'extraordinario') return { permitido: true };
  const ahora = new Date();
  const tiempoActual = ahora.getHours() * 60 + ahora.getMinutes(); 

  if (tipo === 'apertura') {
    if (tiempoActual >= 540 && tiempoActual <= 560) return { permitido: true };
    return { permitido: false, mensaje: "Horario Apertura (09:00 - 09:20)" };
  }
  if (tipo === 'cierre') {
    if (tiempoActual >= 960 && tiempoActual <= 980) return { permitido: true };
    return { permitido: false, mensaje: "Horario Cierre (16:00 - 16:20)" };
  }
  return { permitido: true };
};

// Auditoría de hora
const verificarAuditoria = (reporte) => {
    if (!reporte.timestamp || !reporte.tipo) return null;
    const date = new Date(reporte.timestamp.seconds * 1000);
    const h = date.getHours();
    const m = date.getMinutes();
    const tiempoReal = h * 60 + m;
    const LIMITE_APERTURA = 560; // 09:20
    const LIMITE_CIERRE = 980;   // 16:20

    if (reporte.tipo === 'apertura' && tiempoReal > LIMITE_APERTURA) {
        return { esTarde: true, horaReal: `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}` };
    }
    if (reporte.tipo === 'cierre' && tiempoReal > LIMITE_CIERRE) {
        return { esTarde: true, horaReal: `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}` };
    }
    return null;
};

// Motor de imagen
const procesarImagenSegura = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.4));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- Componente Principal ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, (u) => { 
      if (isMounted) {
        setUser(u); 
        setLoading(false); 
      }
    });

    const attemptAuth = async () => {
       try {
         if (!auth.currentUser) {
            await signInAnonymously(auth);
         }
       } catch (error) {
         console.error("Auth error:", error);
         if (isMounted) setLoading(false);
       }
    };
    attemptAuth();

    const failsafe = setTimeout(() => {
      if (isMounted && loading) setLoading(false);
    }, 5000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(failsafe);
    };
  }, []);

  const handleReconnect = () => {
    setLoading(true);
    signInAnonymously(auth).catch((e) => {
      console.error(e);
      setLoading(false);
      alert("No se pudo reconectar. Verifique su internet.");
    });
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-white flex-col gap-4">
      <RefreshCw className="animate-spin text-yellow-500" size={48} />
      <p className="font-bold animate-pulse uppercase tracking-widest text-xs">Cargando Sistema BSF...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50 border-b-2 border-yellow-600">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="text-yellow-500 w-8 h-8" />
            <div>
              <h1 className="font-bold text-lg leading-tight text-yellow-500">BATALLÓN DE SEGURIDAD FÍSICA</h1>
              <p className="text-[10px] text-slate-300 tracking-wider uppercase">Sistema de Parte Diario Digital</p>
            </div>
          </div>
          {view !== 'login' && (
            <button onClick={() => setView('login')} className="text-xs bg-slate-800 p-2 rounded hover:bg-slate-700 border border-slate-700 flex items-center gap-2">
              <LogOut size={16} /> <span className="hidden sm:inline">Salir</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow max-w-4xl mx-auto w-full p-4">
        {view === 'login' && <LoginScreen setView={setView} />}
        
        {view !== 'login' && !user && (
           <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-xl text-center p-6 animate-in fade-in">
             <WifiOff size={64} className="text-red-500 mb-4" />
             <h3 className="text-xl font-bold text-slate-800 mb-2">Conexión Interrumpida</h3>
             <p className="text-sm text-slate-500 mb-6">El sistema necesita reconectar con el servidor.</p>
             <button onClick={handleReconnect} className="bg-blue-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-800 transition-colors flex items-center gap-2">
               <RefreshCw size={20} /> RECONECTAR
             </button>
           </div>
        )}

        {view === 'form' && user && <ReportForm user={user} setView={setView} />}
        {view === 'dashboard' && user && <SupervisorDashboard user={user} />}
      </main>

      <footer className="bg-slate-900 text-slate-400 text-center p-6 text-xs mt-auto border-t border-slate-800">
        <p className="font-bold text-yellow-600 mb-2 italic">"{LEMA}"</p>
        <p className="opacity-50 uppercase tracking-tighter">© 2025 BSF - Comando Departamental de Policía La Paz</p>
      </footer>
    </div>
  );
}

function LoginScreen({ setView }) {
  return (
    <div className="flex flex-col gap-8 items-center justify-center py-10 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <div className="bg-white p-6 rounded-full shadow-2xl inline-block border-4 border-slate-900">
          <Shield size={80} className="text-blue-900" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Acceso al Sistema</h2>
        <div className="h-1.5 w-24 bg-yellow-500 mx-auto rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-4">
        <button onClick={() => setView('form')} className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-xl border-b-8 border-blue-900 hover:translate-y-[-4px] transition-all group active:scale-95">
          <div className="bg-blue-50 p-5 rounded-2xl mb-4 group-hover:bg-blue-900 group-hover:text-white transition-colors">
            <UserCheck size={48} className="text-blue-900 group-hover:text-white" />
          </div>
          <span className="font-black text-xl text-slate-800 text-center uppercase">Oficial de Seguridad</span>
          <p className="text-xs text-slate-400 mt-2 font-medium">Registrar apertura, cierre o novedad</p>
        </button>

        <button onClick={() => setView('dashboard')} className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-xl border-b-8 border-emerald-700 hover:translate-y-[-4px] transition-all group active:scale-95">
          <div className="bg-emerald-50 p-5 rounded-2xl mb-4 group-hover:bg-emerald-800 group-hover:text-white transition-colors">
            <ClipboardList size={48} className="text-emerald-800 group-hover:text-white" />
          </div>
          <span className="font-black text-xl text-slate-800 text-center uppercase">Supervisor / Jefe</span>
          <p className="text-xs text-slate-400 mt-2 font-medium">Verificar novedades y generar reportes</p>
        </button>
      </div>
    </div>
  );
}

function ReportForm({ user, setView }) {
  const [area, setArea] = useState(AREAS.FINANCIERA);
  const [jefatura, setJefatura] = useState('');
  const [entidad, setEntidad] = useState('');
  const [tipo, setTipo] = useState('apertura');
  const [novedad, setNovedad] = useState('SIN NOVEDAD');
  
  const [grado, setGrado] = useState(localStorage.getItem('bsf_grado') || '');
  const [nombre, setNombre] = useState(localStorage.getItem('bsf_nombre') || '');
  
  const [foto, setFoto] = useState(null); 
  const [enviando, setEnviando] = useState(false);
  const [reportesHoyDetalle, setReportesHoyDetalle] = useState([]);
  const [horaActual, setHoraActual] = useState(new Date());
  
  const [estadoHorario, setEstadoHorario] = useState({ enHorario: true });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        setHoraActual(now);
        setEstadoHorario(esHorarioPermitido(tipo));
    }, 1000);
    setEstadoHorario(esHorarioPermitido(tipo)); 
    return () => clearInterval(timer);
  }, [tipo]);

  useEffect(() => {
    localStorage.setItem('bsf_grado', grado);
    localStorage.setItem('bsf_nombre', nombre);
  }, [grado, nombre]);

  useEffect(() => {
    const jefaturas = Object.keys(ASIGNACIONES[area] || {});
    if (jefaturas.length > 0) setJefatura(jefaturas[0]);
    const h = new Date().getHours();
    let sugerencia = 'extraordinario';
    if (h >= 8 && h <= 10) sugerencia = 'apertura';
    else if (h >= 15 && h <= 17) sugerencia = 'cierre';
    setTipo(sugerencia);
  }, [area]);

  useEffect(() => {
    const entidadesJefatura = ASIGNACIONES[area][jefatura] || [];
    if (entidadesJefatura.length > 0) {
       let primeraPendiente = entidadesJefatura[0];
       if (tipo !== 'extraordinario' && reportesHoyDetalle.length > 0) {
           const pendiente = entidadesJefatura.find(e => 
               !reportesHoyDetalle.some(r => r.entidad === e && r.tipo === tipo)
           );
           if (pendiente) primeraPendiente = pendiente;
       }
       setEntidad(primeraPendiente);
    }
  }, [jefatura, area, tipo, reportesHoyDetalle]);

  useEffect(() => {
    if (!user || !jefatura) return;
    // CONSULTA BLINDADA: Filtra por la etiqueta de fecha "YYYY-MM-DD"
    const fechaHoyString = obtenerFechaString();
    const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'reports_v3'), 
        where('jefatura', '==', jefatura),
        where('fecha_local', '==', fechaHoyString) // Filtro preciso
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => d.data());
      setReportesHoyDetalle(docs);
    });
    return () => unsubscribe();
  }, [user, jefatura]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const img = await procesarImagenSegura(file);
        setFoto(img);
      } catch (error) { alert("Error al procesar foto"); }
    }
  };

  const enviarParte = async () => {
    if (!user) { alert("Error: Usuario no autenticado."); return; }
    if (!navigator.onLine) { alert("ERROR DE RED: Sin internet."); return; }
    if (!grado || !nombre || !foto) { alert("ATENCIÓN: Faltan datos."); return; }
    
    // VERIFICACIÓN DE DUPLICADO ROBUSTA
    // Revisa si en la memoria local ya existe ese reporte
    const yaReportado = reportesHoyDetalle.some(r => r.entidad === entidad && r.tipo === tipo && tipo !== 'extraordinario');
    if (yaReportado) {
        alert(`YA REPORTADO: Ya existe un registro de ${tipo.toUpperCase()} para ${entidad} hoy.`);
        return;
    }

    if (!estadoHorario.enHorario) {
      // Solo aviso visual, no bloquea
    }

    setEnviando(true);
    const areaFinal = EXCEPCIONES_AREA[entidad] || area;
    const horaRef = formatearHoraSimple(new Date()); 
    const fechaLocalString = obtenerFechaString(); // "2024-05-21"

    const dbPromise = addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports_v3'), {
        area: areaFinal, 
        jefatura, 
        entidad, 
        tipo, 
        novedad, 
        foto, 
        grado, 
        nombre,
        horaReferencia: horaRef,
        fecha_local: fechaLocalString, // CAMPO CLAVE PARA PERSISTENCIA
        timestamp: serverTimestamp(),
        userId: user.uid
    });

    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000)); 

    try {
      await Promise.race([dbPromise, timeoutPromise]);
      setEnviando(false);
      alert("REPORTE REGISTRADO CORRECTAMENTE.");
      setNovedad('SIN NOVEDAD');
      if (tipo !== 'extraordinario') {
        const list = ASIGNACIONES[area][jefatura] || [];
        const pendientes = list.filter(e => e !== entidad && !reportesHoyDetalle.some(r => r.entidad === e && r.tipo === tipo));
        if (pendientes.length > 0) {
            setEntidad(pendientes[0]);
        }
      } else {
        setFoto(null);
      }
    } catch (e) {
      console.error(e);
      setEnviando(false);
      alert("Error técnico al intentar guardar.");
    }
  };

  const entidadesJefatura = ASIGNACIONES[area][jefatura] || [];
  const entidadesReportadasHoy = reportesHoyDetalle.filter(r => r.tipo === tipo).map(r => r.entidad);
  const progreso = entidadesJefatura.length > 0 ? (entidadesReportadasHoy.length / entidadesJefatura.length) * 100 : 0;
  
  const isReportado = (ent) => reportesHoyDetalle.some(r => r.entidad === ent && r.tipo === tipo);

  return (
    <div className="max-w-md mx-auto space-y-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-xl border-t-8 border-blue-900">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
          <FileText className="text-blue-900" /> FORMULARIO DE PARTE
        </h3>

        {!estadoHorario.enHorario && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
                <div>
                    <h4 className="text-amber-800 font-bold uppercase text-xs">Aviso: Fuera de Horario</h4>
                    <p className="text-amber-700 text-xs mt-1">{estadoHorario.mensaje}</p>
                </div>
            </div>
        )}

        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Responsable del Servicio</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Grado" value={grado} onChange={e => setGrado(e.target.value)} className="w-1/3 p-3 border rounded-lg text-sm font-bold uppercase" />
              <input type="text" placeholder="Nombre Completo" value={nombre} onChange={e => setNombre(e.target.value)} className="w-2/3 p-3 border rounded-lg text-sm uppercase" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(AREAS).map(([key, val]) => (
              <button key={key} onClick={() => setArea(val)} className={`p-2 text-[10px] font-bold rounded-lg border uppercase ${area === val ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-400 border-slate-200'}`}>{val}</button>
            ))}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Jefatura / Entidad</label>
            <select value={jefatura} onChange={e => setJefatura(e.target.value)} className="w-full p-3 border rounded-lg text-sm font-bold bg-white mb-2">
              {Object.keys(ASIGNACIONES[area] || {}).map(j => <option key={j} value={j}>{j}</option>)}
            </select>
            
            <div className="relative">
                <select value={entidad} onChange={e => setEntidad(e.target.value)} className="w-full p-3 border rounded-lg text-sm bg-white appearance-none pr-8">
                {ASIGNACIONES[area][jefatura]?.map(e => {
                    const reportado = isReportado(e);
                    return <option key={e} value={e}>{reportado ? '✅' : '⚠️'} {e} {reportado ? '(LISTO)' : ''}</option>;
                })}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-slate-400">▼</div>
            </div>
            {EXCEPCIONES_AREA[entidad] && <p className="text-[9px] text-blue-600 mt-1 font-bold">* Se registrará en: {EXCEPCIONES_AREA[entidad]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Tipo de Parte</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full p-3 border rounded-lg text-sm font-black uppercase bg-white">
                <option value="apertura">Apertura</option>
                <option value="cierre">Cierre</option>
                <option value="extraordinario">Extraordinario</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Hora Actual</label>
              <div className="p-3 bg-slate-100 rounded-lg text-sm font-mono flex items-center gap-2 font-bold text-blue-900">
                <Clock size={16} /> {horaActual.toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Informe de Novedades</label>
            <textarea value={novedad} onChange={e => setNovedad(e.target.value)} className="w-full p-3 border rounded-lg text-sm min-h-[80px] uppercase font-medium" />
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50">
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFile} />
            {!foto ? (
              <button onClick={() => fileInputRef.current.click()} className="w-full py-4 flex flex-col items-center gap-2 text-blue-900 font-black uppercase tracking-tighter hover:bg-blue-50 rounded-lg transition-colors">
                <Camera size={32} />
                Capturar Evidencia Fotográfica
              </button>
            ) : (
              <div className="relative">
                <img src={foto} className="w-full h-48 object-cover rounded-lg shadow-inner bg-black" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 text-center">FOTO EN MEMORIA</div>
                <button onClick={() => setFoto(null)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700"><X size={16}/></button>
              </div>
            )}
          </div>

          <button 
            onClick={enviarParte} 
            disabled={enviando || (isReportado(entidad) && tipo !== 'extraordinario')} 
            className={`w-full py-5 rounded-2xl font-black text-white shadow-2xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 
                ${enviando ? 'bg-slate-400 cursor-not-allowed opacity-50' : isReportado(entidad) && tipo !== 'extraordinario' ? 'bg-green-600 cursor-not-allowed' : !estadoHorario.enHorario ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-900 hover:bg-blue-800'} active:scale-95`}
          >
            {enviando ? <RefreshCw className="animate-spin" /> : isReportado(entidad) && tipo !== 'extraordinario' ? <CheckCircle size={20} /> : !estadoHorario.enHorario ? <AlertTriangle size={20} /> : <Zap />}
            {enviando ? 'ENVIANDO...' : isReportado(entidad) && tipo !== 'extraordinario' ? 'YA ENVIADO (LISTO)' : !estadoHorario.enHorario ? 'ENVIAR (FUERA DE HORARIO)' : 'ENVIAR PARTE OFICIAL'}
          </button>
        </div>
      </div>

      {tipo !== 'extraordinario' && (
        <div className="bg-white p-4 rounded-2xl shadow-lg border-l-4 border-yellow-500">
          <h4 className="text-xs font-black uppercase text-slate-700 mb-2 flex justify-between">
            <span className="flex items-center gap-2"><CheckSquare size={14}/> Avance de {tipo}: {entidadesReportadasHoy.length} de {entidadesJefatura.length}</span>
            <span>{Math.round(progreso)}%</span>
          </h4>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-yellow-500 h-full transition-all duration-500" style={{ width: `${progreso}%` }}></div>
          </div>
          {entidadesJefatura.length === entidadesReportadasHoy.length && (
              <p className="text-center text-[10px] text-green-600 font-bold mt-2">¡JEFATURA COMPLETADA!</p>
          )}
        </div>
      )}
    </div>
  );
}

function SupervisorDashboard({ user }) {
  const [reportes, setReportes] = useState([]);
  const [fecha, setFecha] = useState(obtenerFechaString()); // INICIO CON FECHA STRING
  const [modalFoto, setModalFoto] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [verTodosHistorial, setVerTodosHistorial] = useState(false); 

  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports_v3');
    
    // Consulta optimizada usando el campo string 'fecha_local'
    let q = query(colRef, orderBy('timestamp', 'desc'));
    if (!verTodosHistorial) {
        q = query(colRef, where('fecha_local', '==', fecha), orderBy('timestamp', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setReportes(docs);
    });
    return () => unsubscribe();
  }, [user, fecha, verTodosHistorial]);

  const reportesFiltrados = reportes.filter(r => filtroTipo === 'todos' ? true : r.tipo === filtroTipo);

  const copiarParte = (r) => {
    const hora = obtenerHoraLegible(r.timestamp, r.horaReferencia);
    const titulo = r.tipo === 'extraordinario' ? "REPORTE EXTRAORDINARIO" : `PARTE INDIVIDUAL (${r.tipo.toUpperCase()})`;
    
    const texto = `*${titulo}*\n` +
      `*Jefatura:* ${r.jefatura}\n` +
      `*Entidad:* ${r.entidad}\n` +
      `*Resp:* ${r.grado} ${r.nombre}\n` +
      `*Hora:* ${hora}\n` +
      `*Novedad:* ${r.novedad}\n` +
      `"${LEMA}"`;
      
    const el = document.createElement('textarea'); el.value = texto; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    alert("Reporte individual copiado.");
  };

  const generarResumenComandante = () => {
    let titulo = "PARTE GENERAL";
    if (filtroTipo === 'apertura') titulo = "REPORTE DE APERTURA DE ENTIDADES";
    else if (filtroTipo === 'cierre') titulo = "REPORTE DE CIERRE DE ENTIDADES";
    else if (filtroTipo === 'extraordinario') titulo = "REPORTES EXTRAORDINARIOS";

    let texto = `*${titulo} - ${fecha}*\n\n`;
    
    // Obtener los reportes filtrados
    const reportesDelDia = reportes.filter(r => r.tipo === (filtroTipo === 'todos' ? r.tipo : filtroTipo));

    // Iterar por TODAS las asignaciones esperadas (Base Teórica)
    [AREAS.FINANCIERA, AREAS.VIP, AREAS.INSTALACIONES, AREAS.ETV].forEach(areaName => {
      // Filtrar Jefaturas de esta Área
      const jefaturasDelArea = Object.entries(ASIGNACIONES[areaName] || {});
      
      if (filtroTipo === 'extraordinario') {
         // Para extraordinarios solo mostramos lo que hubo
         const reportsInArea = reportesDelDia.filter(r => (EXCEPCIONES_AREA[r.entidad] || r.area) === areaName);
         if (reportsInArea.length > 0) {
            texto += `*${areaName}.*\n`;
            reportsInArea.forEach(r => {
                const hora = obtenerHoraLegible(r.timestamp, r.horaReferencia);
                const resp = r.grado ? ` - Resp: ${r.grado} ${r.nombre.split(' ')[0]}` : '';
                texto += `Con novedad (${hora}): ${r.novedad} (${r.entidad}${resp}).\n`;
            });
            texto += `\n`;
         }
         return;
      }

      texto += `*${areaName}.*\n`;
      let areaTieneContenido = false;
      let novedadesDelArea = [];

      jefaturasDelArea.forEach(([nombreJefatura, listaEntidades]) => {
          listaEntidades.forEach(entidad => {
              if (EXCEPCIONES_AREA[entidad] && EXCEPCIONES_AREA[entidad] !== areaName) return;
              
              const reporte = reportesDelDia.find(r => r.entidad === entidad);
              
              if (reporte) {
                  areaTieneContenido = true;
                  const esSinNovedad = !reporte.novedad || reporte.novedad.toUpperCase().includes("SIN NOVEDAD") || reporte.novedad.toUpperCase() === "S/N";
                  if (!esSinNovedad) {
                      const hora = obtenerHoraLegible(reporte.timestamp, reporte.horaReferencia);
                      const resp = reporte.grado ? ` - Resp: ${reporte.grado} ${reporte.nombre.split(' ')[0]}` : '';
                      novedadesDelArea.push(`Con novedad (${hora}): ${reporte.novedad} (${entidad}${resp}).`);
                  }
              } else {
                  if (filtroTipo !== 'todos') { 
                      texto += `(FALTA REPORTE): ${entidad}\n`;
                  }
              }
          });
      });
      
      Object.entries(EXCEPCIONES_AREA).forEach(([entidad, areaDestino]) => {
          if (areaDestino === areaName) {
              const reporte = reportesDelDia.find(r => r.entidad === entidad);
              if (reporte) {
                  areaTieneContenido = true;
                  const esSinNovedad = !reporte.novedad || reporte.novedad.toUpperCase().includes("SIN NOVEDAD") || reporte.novedad.toUpperCase() === "S/N";
                  if (!esSinNovedad) {
                      const hora = obtenerHoraLegible(reporte.timestamp, reporte.horaReferencia);
                      novedadesDelArea.push(`Con novedad (${hora}): ${reporte.novedad} (${entidad}).`);
                  }
              } else if (filtroTipo !== 'todos') {
                  texto += `(FALTA REPORTE): ${entidad}\n`;
              }
          }
      });

      if (areaTieneContenido) {
          if (novedadesDelArea.length === 0) {
              texto += `Sin novedad.\n`;
          } else {
              novedadesDelArea.forEach(n => texto += `${n}\n`);
          }
      } else {
          if (filtroTipo !== 'todos') texto += `(Pendiente de reportes)\n`;
          else texto += `Sin novedades registradas.\n`;
      }

      texto += `\n`;
    });
    
    texto += `*TOTAL REPORTES RECIBIDOS:* ${reportesFiltrados.length}\n"${LEMA}"`;
    const el = document.createElement('textarea'); el.value = texto; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); alert(`Copiado: ${titulo}`);
  };

  const totalEntidadesEsperadas = Object.values(ASIGNACIONES).reduce((acc, curr) => acc + Object.values(curr).flat().length, 0);
  const jefaturasTotales = new Set(Object.values(ASIGNACIONES).flatMap(area => Object.keys(area)));
  const jefaturasReportadas = new Set(reportesFiltrados.map(r => r.jefatura));
  const oficialesFaltantes = [...jefaturasTotales].filter(j => !jefaturasReportadas.has(j));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {modalFoto && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setModalFoto(null)}>
          <div className="relative w-full max-w-lg">
            <img src={modalFoto} className="w-full h-auto rounded-lg shadow-2xl border-2 border-white" />
            <button className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg" onClick={() => setModalFoto(null)}><X size={24} className="text-red-600" /></button>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-xl border-l-8 border-emerald-700 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Central de Novedades</h2><p className="text-slate-400 text-xs font-bold">Resumen Diario de Seguridad</p></div>
        <div className="flex flex-col gap-2 items-end w-full sm:w-auto">
          <div className="flex gap-2 w-full items-center">
            <button 
                onClick={() => setVerTodosHistorial(!verTodosHistorial)} 
                className={`p-2 rounded-xl border font-bold text-xs ${verTodosHistorial ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500'}`}
                title="Ver historial completo sin filtro de fecha"
            >
                <Database size={16} />
            </button>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} disabled={verTodosHistorial} className="p-2 border rounded-xl font-bold bg-slate-50 text-xs w-full disabled:opacity-50" />
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="p-2 border rounded-xl font-bold bg-slate-50 text-xs uppercase w-full">
              <option value="todos">Todos</option>
              <option value="apertura">Apertura</option>
              <option value="cierre">Cierre</option>
              <option value="extraordinario">Novedad</option>
            </select>
          </div>
          <button onClick={generarResumenComandante} className="bg-slate-800 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold shadow-md w-full hover:bg-slate-700 transition-colors uppercase">
            <Copy size={14} /> Copiar Resumen
          </button>
        </div>
      </div>

      {(filtroTipo === 'apertura' || filtroTipo === 'cierre') && (
        <div className={`p-4 rounded-xl shadow-md border-l-4 flex flex-col gap-2 ${oficialesFaltantes.length > 0 ? 'bg-red-50 border-red-500 text-red-800' : 'bg-green-50 border-green-500 text-green-800'}`}>
            <div className="flex justify-between items-center">
                <div>
                    <h4 className="font-bold uppercase text-xs">Control de Oficiales ({filtroTipo})</h4>
                    <p className="text-xs mt-1">Reportados: <b>{jefaturasTotales.size - oficialesFaltantes.length}</b> / Total Oficiales: <b>{jefaturasTotales.size}</b></p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-black">{Math.round(((jefaturasTotales.size - oficialesFaltantes.length) / jefaturasTotales.size) * 100)}%</span>
                </div>
            </div>
            {oficialesFaltantes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-red-200">
                    <p className="text-[10px] font-bold mb-1">OFICIALES PENDIENTES:</p>
                    <div className="flex flex-wrap gap-1">
                        {oficialesFaltantes.map(j => (
                            <span key={j} className="text-[9px] bg-white px-2 py-1 rounded border border-red-200 text-red-600">{j}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      <div className="grid gap-4">
        {reportesFiltrados.length === 0 ? <div className="text-center py-20 bg-white rounded-2xl text-slate-300 font-bold uppercase border-2 border-dashed">Sin reportes para este filtro</div> : 
        reportesFiltrados.map(r => (
          <div key={r.id} className="bg-white p-4 rounded-2xl shadow-md border-r-4 border-slate-200 flex items-center gap-4 hover:shadow-lg transition-shadow relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${r.tipo === 'apertura' ? 'bg-blue-500' : r.tipo === 'cierre' ? 'bg-slate-500' : 'bg-red-500'}`}></div>
            <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden cursor-pointer flex-shrink-0 border border-slate-200" onClick={() => setModalFoto(r.foto)}>
              <img src={r.foto} className="w-full h-full object-cover" />
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${r.tipo === 'apertura' ? 'bg-blue-100 text-blue-800' : r.tipo === 'cierre' ? 'bg-slate-100 text-slate-800' : 'bg-red-100 text-red-800'}`}>{r.tipo}</span>
                <span className="text-[10px] font-mono text-slate-500 font-bold flex items-center gap-1">
                  <Clock size={10} />
                  {obtenerHoraLegible(r.timestamp, r.horaReferencia)}
                  {/* AUDITORÍA: Si la hora del servidor y la local difieren, mostrar alerta */}
                  {verificarAuditoria(r) && (
                      <span className="ml-2 bg-red-100 text-red-700 px-1 rounded text-[8px] border border-red-200 flex items-center">
                          <AlertTriangle size={8} className="mr-0.5"/>
                          REAL: {verificarAuditoria(r).horaReal}
                      </span>
                  )}
                </span>
              </div>
              <h4 className="font-black text-xs text-slate-900 truncate uppercase mt-1">{r.entidad}</h4>
              <p className="text-[9px] text-slate-500 font-bold italic truncate">Resp: {r.grado} {r.nombre}</p>
              <p className={`text-[10px] font-medium leading-tight mt-1 ${r.novedad?.toUpperCase() !== 'SIN NOVEDAD' ? 'text-red-600 font-black bg-red-50 p-1 rounded' : 'text-slate-600'}`}>{r.novedad}</p>
            </div>
            <button onClick={() => copiarParte(r)} className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-700 hover:text-white transition-colors self-center shadow-sm" title="Copiar reporte individual">
              <Share2 size={18}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

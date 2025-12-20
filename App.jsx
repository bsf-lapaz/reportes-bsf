import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, 
  onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { 
  Shield, FileText, Clock, List, Copy, CheckCircle, LogOut, 
  UserCheck, ClipboardList, AlertTriangle, Camera, 
  Image as ImageIcon, X, RefreshCw, Zap, User, Filter, Share2, 
  CheckSquare, AlertCircle, WifiOff, Database, Lock 
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
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
const COLLECTION_PATH = 'reports_v3'; // Ruta única para no mezclar datos

// --- Constantes ---
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

// --- Utilidades de Fecha (SOLUCIÓN DEL PROBLEMA) ---
// Usamos la fecha del dispositivo local para TODO.
const obtenerFechaLocal = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatearHoraSimple = (fecha) => {
  return fecha.getHours().toString().padStart(2, '0') + ':' + fecha.getMinutes().toString().padStart(2, '0');
};

const obtenerHoraLegible = (timestamp, horaReferencia) => {
  // Prioridad a la hora guardada manualmente (referencia) para evitar saltos de zona horaria
  if (horaReferencia && horaReferencia.includes(':')) return horaReferencia;
  if (timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleString('es-BO', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  }
  return "...";
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
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
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
    const initAuth = async () => {
      try { await signInAnonymously(auth); } 
      catch (error) { console.error("Auth:", error); setLoading(false); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      setLoading(false); 
    });
    return () => unsubscribe();
  }, []);

  const handleReconnect = () => window.location.reload();

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="text-yellow-500 w-8 h-8" />
            <div>
              <h1 className="font-bold text-lg leading-tight">BATALLÓN DE SEGURIDAD FÍSICA</h1>
              <p className="text-[10px] text-slate-300">Sistema de Parte Diario</p>
            </div>
          </div>
          {view !== 'login' && <button onClick={() => setView('login')} className="text-xs bg-slate-800 p-2 rounded"><LogOut size={16}/></button>}
        </div>
      </header>

      <main className="flex-grow max-w-4xl mx-auto w-full p-4 pb-20">
        {view === 'login' && <LoginScreen setView={setView} />}
        {view !== 'login' && !user && (
           <div className="p-8 text-center bg-white rounded-xl shadow">
             <WifiOff className="mx-auto text-red-500 mb-4" size={48}/>
             <h3 className="font-bold text-lg">Sin Conexión</h3>
             <button onClick={handleReconnect} className="mt-4 bg-blue-900 text-white px-6 py-2 rounded-lg">Reintentar</button>
           </div>
        )}
        {view === 'form' && user && <ReportForm user={user} />}
        {view === 'dashboard' && user && <SupervisorDashboard user={user} />}
      </main>
    </div>
  );
}

function LoginScreen({ setView }) {
  return (
    <div className="flex flex-col gap-6 py-10 items-center animate-in fade-in">
      <div className="text-center bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
        <Shield size={60} className="text-blue-900 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-900 uppercase">Bienvenido</h2>
        <div className="h-1 w-20 bg-yellow-500 mx-auto my-2"></div>
        
        <div className="space-y-4">
          <button onClick={() => setView('form')} className="w-full p-4 bg-blue-50 hover:bg-blue-900 hover:text-white rounded-xl flex items-center gap-4 transition-all group border border-blue-100">
            <div className="bg-white p-2 rounded-full group-hover:bg-blue-800"><UserCheck className="text-blue-900 group-hover:text-white"/></div>
            <div className="text-left"><span className="block font-bold text-lg">Oficial de Seguridad</span><span className="text-xs opacity-70">Enviar Reportes</span></div>
          </button>
          <button onClick={() => setView('dashboard')} className="w-full p-4 bg-emerald-50 hover:bg-emerald-800 hover:text-white rounded-xl flex items-center gap-4 transition-all group border border-emerald-100">
            <div className="bg-white p-2 rounded-full group-hover:bg-emerald-700"><ClipboardList className="text-emerald-800 group-hover:text-white"/></div>
            <div className="text-left"><span className="block font-bold text-lg">Supervisor / Jefe</span><span className="text-xs opacity-70">Ver Novedades</span></div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportForm({ user }) {
  const [area, setArea] = useState(AREAS.FINANCIERA);
  const [jefatura, setJefatura] = useState('');
  const [entidad, setEntidad] = useState('');
  const [tipo, setTipo] = useState('apertura');
  const [novedad, setNovedad] = useState('SIN NOVEDAD');
  
  const [grado, setGrado] = useState(localStorage.getItem('bsf_grado') || '');
  const [nombre, setNombre] = useState(localStorage.getItem('bsf_nombre') || '');
  const [foto, setFoto] = useState(null); 
  const [enviando, setEnviando] = useState(false);
  const [misReportes, setMisReportes] = useState([]); 
  const [horaActual, setHoraActual] = useState(new Date());
  
  const [estadoHorario, setEstadoHorario] = useState({ permitido: true });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => { setHoraActual(new Date()); setEstadoHorario(esHorarioPermitido(tipo)); }, 1000);
    setEstadoHorario(esHorarioPermitido(tipo));
    return () => clearInterval(t);
  }, [tipo]);

  useEffect(() => {
    localStorage.setItem('bsf_grado', grado);
    localStorage.setItem('bsf_nombre', nombre);
  }, [grado, nombre]);

  useEffect(() => {
    const jefaturas = Object.keys(ASIGNACIONES[area] || {});
    if (jefaturas.length > 0) setJefatura(jefaturas[0]);
    const h = new Date().getHours();
    if (h >= 8 && h <= 10) setTipo('apertura');
    else if (h >= 15 && h <= 17) setTipo('cierre');
    else setTipo('extraordinario');
  }, [area]);

  useEffect(() => {
    const entidadesJefatura = ASIGNACIONES[area][jefatura] || [];
    if (entidadesJefatura.length > 0) {
       let primeraPendiente = entidadesJefatura[0];
       if (tipo !== 'extraordinario' && misReportes.length > 0) {
           const pendiente = entidadesJefatura.find(e => !misReportes.some(r => r.entidad === e && r.tipo === tipo));
           if (pendiente) primeraPendiente = pendiente;
       }
       setEntidad(primeraPendiente);
    }
  }, [jefatura, area, tipo, misReportes]);

  // LEER DATOS CON FILTRO LOCAL (SOLUCIÓN PERSISTENCIA)
  useEffect(() => {
    // Traemos TODA la colección y filtramos en el celular para evitar errores de fecha/zona horaria
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_PATH), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const hoyString = obtenerFechaLocal(); // Fecha del celular: "2024-05-22"
      const todos = snap.docs.map(d => d.data());
      // Filtramos aquí: solo lo que tenga la fecha de hoy (texto exacto)
      const misDelDia = todos.filter(d => d.fecha_string === hoyString && d.jefatura === jefatura);
      setMisReportes(misDelDia);
    });
    return () => unsubscribe();
  }, [jefatura]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try { setFoto(await procesarImagenSegura(file)); } catch (e) { alert("Error foto"); }
    }
  };

  const yaReportado = misReportes.some(r => r.entidad === entidad && r.tipo === tipo && tipo !== 'extraordinario');

  const enviarParte = async () => {
    if (!navigator.onLine) { alert("Sin internet."); return; }
    if (!grado || !nombre || !foto) { alert("Faltan datos obligatorios."); return; }
    
    // BLOQUEO DE DUPLICADOS REAL (Ya validado con la lista local)
    if (yaReportado) { alert("Ya registrado hoy."); return; }

    setEnviando(true);
    const areaFinal = EXCEPCIONES_AREA[entidad] || area;
    const horaRef = formatearHoraSimple(new Date()); 
    const fechaString = obtenerFechaLocal(); // Guardamos "2024-05-22" fijo

    const docData = {
        area: areaFinal, 
        jefatura, 
        entidad, 
        tipo, 
        novedad, 
        foto, 
        grado, 
        nombre,
        horaReferencia: horaRef,
        fecha_string: fechaString, // ESTA ES LA CLAVE DE LA PERSISTENCIA
        timestamp: serverTimestamp(),
        userId: user.uid
    };

    const dbPromise = addDoc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_PATH), docData);
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1500)); 

    try {
      await Promise.race([dbPromise, timeoutPromise]);
      setEnviando(false);
      alert("REPORTE REGISTRADO.");
      setNovedad('SIN NOVEDAD');
      if (tipo === 'extraordinario') setFoto(null);
    } catch (e) {
      console.error(e);
      alert("Error al guardar.");
      setEnviando(false);
    }
  };

  const listaEntidades = ASIGNACIONES[area][jefatura] || [];
  const completados = listaEntidades.filter(e => misReportes.some(r => r.entidad === e && r.tipo === tipo)).length;
  const progreso = (completados / listaEntidades.length) * 100;

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="bg-white p-5 rounded-2xl shadow-lg border-t-4 border-blue-900">
         {!estadoHorario.permitido && (
            <div className="bg-amber-50 text-amber-800 p-3 rounded mb-4 text-xs flex items-center gap-2 border border-amber-200">
               <AlertCircle size={16}/> <span><b>AVISO:</b> Fuera de horario ({estadoHorario.mensaje}).</span>
            </div>
         )}
         
         <div className="space-y-3">
             <div className="flex gap-2">
                <input className="w-1/3 p-2 border rounded text-xs font-bold uppercase" placeholder="Grado" value={grado} onChange={e=>setGrado(e.target.value)} />
                <input className="w-2/3 p-2 border rounded text-xs uppercase" placeholder="Nombre Completo" value={nombre} onChange={e=>setNombre(e.target.value)} />
             </div>

             <div className="grid grid-cols-2 gap-2">
                {Object.entries(AREAS).map(([k,v]) => (
                   <button key={k} onClick={()=>setArea(v)} className={`text-[10px] p-2 rounded border font-bold uppercase ${area===v ? 'bg-blue-900 text-white' : 'bg-slate-50 text-slate-500'}`}>{v.split(' ')[1]}</button>
                ))}
             </div>

             <div className="bg-slate-50 p-2 rounded border">
                <label className="text-[10px] font-bold text-slate-500 block">Jefatura</label>
                <select className="w-full p-2 bg-white border rounded text-xs font-bold" value={jefatura} onChange={e=>setJefatura(e.target.value)}>
                   {Object.keys(ASIGNACIONES[area]||{}).map(j=><option key={j} value={j}>{j}</option>)}
                </select>
             </div>

             <div className={`p-2 rounded border ${yaReportado ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-200'}`}>
                <label className="text-[10px] font-bold text-slate-500 block">Entidad ({completados}/{listaEntidades.length})</label>
                <select className="w-full p-2 bg-white border rounded text-xs" value={entidad} onChange={e=>setEntidad(e.target.value)}>
                   {listaEntidades.map(e => {
                      const listo = misReportes.some(r => r.entidad === e && r.tipo === tipo);
                      return <option key={e} value={e}>{listo ? '✅' : '⬜'} {e} {listo ? '(LISTO)' : ''}</option>
                   })}
                </select>
             </div>

             <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] font-bold text-slate-500">Tipo</label><select className="w-full p-2 border rounded text-xs font-bold" value={tipo} onChange={e=>setTipo(e.target.value)}><option value="apertura">APERTURA</option><option value="cierre">CIERRE</option><option value="extraordinario">EXTRAORDINARIO</option></select></div>
                <div><label className="text-[10px] font-bold text-slate-500">Hora</label><div className="w-full p-2 bg-slate-100 border rounded text-xs font-mono text-center font-bold">{horaActual.toLocaleTimeString()}</div></div>
             </div>

             <div><label className="text-[10px] font-bold text-slate-500">Novedad</label><textarea className="w-full p-2 border rounded text-xs" value={novedad} onChange={e=>setNovedad(e.target.value)}/></div>

             <div className="border-2 border-dashed rounded p-3 text-center">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFile} />
                {!foto ? <button onClick={()=>fileInputRef.current.click()} className="text-xs font-bold text-blue-800 flex flex-col items-center"><Camera size={24}/> TOMAR FOTO</button> : 
                <div className="relative"><img src={foto} className="h-32 mx-auto rounded bg-black"/><button onClick={()=>setFoto(null)} className="absolute top-0 right-0 bg-red-600 text-white p-1 rounded-full"><X size={12}/></button></div>}
             </div>

             <button onClick={enviarParte} disabled={enviando || (yaReportado && tipo !== 'extraordinario')} className={`w-full py-4 rounded font-bold text-white text-xs uppercase shadow-lg ${enviando ? 'bg-slate-400' : yaReportado && tipo !== 'extraordinario' ? 'bg-green-600' : 'bg-blue-900'}`}>
                {enviando ? 'GUARDANDO...' : yaReportado && tipo !== 'extraordinario' ? 'YA REGISTRADO' : 'ENVIAR REPORTE'}
             </button>
         </div>
      </div>
      {tipo !== 'extraordinario' && <div className="h-1 bg-slate-200 rounded overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{width: `${progreso}%`}}></div></div>}
    </div>
  );
}

function SupervisorDashboard({ user }) {
  const [reportes, setReportes] = useState([]);
  const [fecha, setFecha] = useState(obtenerFechaLocal());
  const [filtro, setFiltro] = useState('todos');
  const [verTodoHistorial, setVerTodoHistorial] = useState(false);
  const [modalFoto, setModalFoto] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_PATH), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setReportes(docs);
    });
    return () => unsubscribe();
  }, []);

  // FILTRO SEGURO EN MEMORIA
  const reportesVisibles = reportes.filter(r => {
     if (!verTodoHistorial && r.fecha_string !== fecha) return false;
     if (filtro !== 'todos' && r.tipo !== filtro) return false;
     return true;
  });

  const copiar = (texto) => {
    const el = document.createElement('textarea'); el.value = texto; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    alert("Copiado.");
  };

  const generarResumen = () => {
    let titulo = "PARTE GENERAL";
    if (filtro === 'apertura') titulo = "REPORTE DE APERTURA DE ENTIDADES";
    else if (filtro === 'cierre') titulo = "REPORTE DE CIERRE DE ENTIDADES";
    else if (filtro === 'extraordinario') titulo = "REPORTES EXTRAORDINARIOS";

    let t = `*${titulo} - ${fecha}*\n\n`;
    [AREAS.FINANCIERA, AREAS.VIP, AREAS.INSTALACIONES, AREAS.ETV].forEach(areaName => {
        const reportesArea = reportesVisibles.filter(r => (EXCEPCIONES_AREA[r.entidad] || r.area) === areaName);
        if(reportesArea.length === 0 && filtro !== 'todos') return;
        
        t += `*${areaName}*\n`;
        if(reportesArea.length === 0) {
            if (filtro === 'todos') t += "(Pendiente de reportes)\n";
            else t += "Sin novedades.\n";
        } else {
           const conNovedad = reportesArea.filter(r => r.novedad?.toUpperCase() !== 'SIN NOVEDAD' && r.novedad !== 'S/N');
           if (conNovedad.length === 0) t += "Sin novedad.\n";
           else {
               conNovedad.forEach(r => {
                  const hora = obtenerHoraLegible(r.timestamp, r.horaReferencia);
                  const resp = r.grado ? ` - Resp: ${r.grado} ${r.nombre.split(' ')[0]}` : '';
                  t += `Con novedad (${hora}): ${r.novedad} (${r.entidad}${resp})\n`;
               });
           }
        }
        t += "\n";
    });
    t += `*TOTAL REPORTES RECIBIDOS:* ${reportesVisibles.length}\n"${LEMA}"`;
    copiar(t);
  };

  // Cálculo de faltantes usando jefaturas (20 oficiales)
  const jefaturasTotales = new Set(Object.values(ASIGNACIONES).flatMap(area => Object.keys(area)));
  const jefaturasReportadas = new Set(reportesVisibles.map(r => r.jefatura));
  const oficialesFaltantes = [...jefaturasTotales].filter(j => !jefaturasReportadas.has(j));

  return (
    <div className="space-y-4 animate-in fade-in">
      {modalFoto && <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={()=>setModalFoto(null)}><img src={modalFoto} className="max-w-full max-h-full rounded border-2 border-white"/><button className="absolute top-4 right-4 bg-white p-2 rounded-full"><X/></button></div>}
      
      <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-emerald-600">
         <h2 className="font-bold text-lg text-slate-800">Panel de Control</h2>
         <div className="flex flex-col gap-2 mt-2">
            <div className="flex gap-2">
               <button onClick={()=>setVerTodoHistorial(!verTodoHistorial)} className={`p-2 border rounded ${verTodoHistorial ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Database size={16}/></button>
               <input type="date" className="p-2 border rounded text-xs flex-grow font-bold" value={fecha} onChange={e=>setFecha(e.target.value)} disabled={verTodoHistorial}/>
            </div>
            <select className="p-2 border rounded text-xs uppercase font-bold" value={filtro} onChange={e=>setFiltro(e.target.value)}>
               <option value="todos">VER TODOS</option>
               <option value="apertura">SOLO APERTURA</option>
               <option value="cierre">SOLO CIERRE</option>
               <option value="extraordinario">SOLO NOVEDADES</option>
            </select>
            <button onClick={generarResumen} className="bg-slate-800 text-white p-3 rounded font-bold text-xs flex justify-center gap-2 shadow"><Copy size={14}/> COPIAR PARTE GENERAL</button>
         </div>
         <p className="text-[10px] text-right mt-2 text-slate-400">Total visibles: {reportesVisibles.length}</p>
      </div>
      
      {(filtro === 'apertura' || filtro === 'cierre') && (
        <div className={`p-4 rounded-xl shadow border-l-4 ${oficialesFaltantes.length > 0 ? 'bg-red-50 border-red-500 text-red-800' : 'bg-green-50 border-green-500 text-green-800'}`}>
            <p className="font-bold text-xs uppercase">Faltan {oficialesFaltantes.length} de {jefaturasTotales.size} Oficiales</p>
            {oficialesFaltantes.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{oficialesFaltantes.map(j => <span key={j} className="text-[9px] bg-white border px-1 rounded">{j}</span>)}</div>}
        </div>
      )}

      <div className="space-y-3">
         {reportesVisibles.map(r => (
            <div key={r.id} className="bg-white p-3 rounded-xl shadow border-l-4 border-slate-300 flex gap-3 items-start">
               <div className="w-12 h-12 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer" onClick={()=>setModalFoto(r.foto)}>
                  <img src={r.foto} className="w-full h-full object-cover" />
               </div>
               <div className="flex-grow min-w-0">
                  <div className="flex justify-between">
                     <span className={`text-[9px] font-bold px-2 rounded ${r.tipo==='apertura'?'bg-blue-100 text-blue-800':r.tipo==='cierre'?'bg-slate-100':'bg-red-100 text-red-800'}`}>{r.tipo.toUpperCase()}</span>
                     <span className="text-[10px] font-mono text-slate-400">{r.horaReferencia}</span>
                  </div>
                  <h4 className="font-bold text-xs truncate mt-1">{r.entidad}</h4>
                  <p className="text-[9px] italic text-slate-500">{r.grado} {r.nombre}</p>
                  <p className="text-[10px] text-slate-700 mt-1 leading-tight">{r.novedad}</p>
               </div>
               <button onClick={()=>copiar(`*${r.tipo.toUpperCase()}*\n${r.entidad}\n${r.novedad}\n${r.horaReferencia}`)} className="text-emerald-600"><Share2 size={18}/></button>
            </div>
         ))}
         {reportesVisibles.length === 0 && <div className="text-center py-10 text-slate-400 text-xs">No hay datos para mostrar.</div>}
      </div>
    </div>
  );
}

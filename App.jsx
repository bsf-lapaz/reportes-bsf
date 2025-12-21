import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, 
  onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { 
  Shield, FileText, Clock, List, Copy, CheckCircle, LogOut, 
  UserCheck, ClipboardList, AlertTriangle, Camera, 
  Image as ImageIcon, X, RefreshCw, Zap, User, Database, Lock, Wifi, WifiOff, Share2, AlertCircle, CheckSquare 
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

// RUTA TÉCNICA OBLIGATORIA PARA PERSISTENCIA EN GOOGLE
const COLLECTION_NAME = 'reportes_oficiales_v7'; 

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
const obtenerFechaString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatearHoraSimple = (fecha) => {
  return fecha.getHours().toString().padStart(2, '0') + ':' + fecha.getMinutes().toString().padStart(2, '0');
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
  const [dbStatus, setDbStatus] = useState('Conectando...');
  const [reportesGlobales, setReportesGlobales] = useState([]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setDbStatus('Iniciando Auth...');
        await signInAnonymously(auth);
      } catch (error) { 
        console.error("Auth Error:", error);
        setDbStatus(`ERROR AUTH: ${error.code}`);
        setLoading(false);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => { 
      setUser(u); 
      if(u) setDbStatus('Autenticado. Conectando...');
      setLoading(false); 
    });
    return () => unsubscribe();
  }, []);

  // CARGA DE DATOS (Solo después de que el usuario esté listo)
  useEffect(() => {
    if (!user) return;

    // RUTA COMPLETA REQUERIDA POR LAS REGLAS DE SEGURIDAD
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME);
    
    // Consulta plana para evitar errores de índice
    const unsubscribe = onSnapshot(reportsRef, (snap) => {
      const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setReportesGlobales(docs);
      setDbStatus(`SISTEMA ONLINE | Registros: ${docs.length}`);
    }, (error) => {
      console.error("Database Error:", error);
      setDbStatus(`ERROR DB: ${error.code}`);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white flex-col gap-4"><RefreshCw className="animate-spin" /><span>Cargando Sistema BSF...</span></div>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col relative pb-16">
      {/* BARRA DE ESTADO CRÍTICA */}
      <div className={`fixed bottom-0 w-full p-2 text-[10px] text-center z-[60] font-mono font-bold ${dbStatus.includes('ERROR') ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-900 text-green-400'}`}>
         {dbStatus}
      </div>

      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="text-yellow-500 w-8 h-8" />
            <div>
              <h1 className="font-bold text-lg leading-tight uppercase tracking-tighter">Batallón de Seguridad Física</h1>
              <p className="text-[10px] text-slate-400 tracking-widest font-bold">LA PAZ - BOLIVIA</p>
            </div>
          </div>
          {view !== 'login' && <button onClick={() => setView('login')} className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition-colors"><LogOut size={18}/></button>}
        </div>
      </header>

      <main className="flex-grow max-w-4xl mx-auto w-full p-4">
        {view === 'login' && <LoginScreen setView={setView} />}
        {view === 'form' && user && <ReportForm user={user} reportesGlobales={reportesGlobales} setDbStatus={setDbStatus} />}
        {view === 'dashboard' && user && <SupervisorDashboard user={user} reportesGlobales={reportesGlobales} />}
      </main>
    </div>
  );
}

function LoginScreen({ setView }) {
  return (
    <div className="flex flex-col gap-6 py-10 items-center animate-in fade-in duration-700">
      <div className="text-center bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm border-b-8 border-slate-900">
        <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Shield size={64} className="text-blue-900" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Bienvenido</h2>
        <div className="h-1.5 w-16 bg-yellow-500 mx-auto my-3 rounded-full"></div>
        <p className="text-xs text-slate-500 font-bold mb-8 uppercase tracking-widest">Control de Parte Diario</p>
        
        <div className="space-y-4">
          <button onClick={() => setView('form')} className="w-full p-5 bg-blue-50 hover:bg-blue-900 hover:text-white rounded-2xl flex items-center gap-4 transition-all group border border-blue-100 shadow-sm active:scale-95">
            <div className="bg-white p-2 rounded-xl group-hover:bg-blue-800 shadow-sm"><UserCheck className="text-blue-900 group-hover:text-white"/></div>
            <div className="text-left"><span className="block font-black text-sm uppercase">Oficial</span><span className="text-[10px] opacity-60 font-bold uppercase">Registrar Partes</span></div>
          </button>
          <button onClick={() => setView('dashboard')} className="w-full p-5 bg-emerald-50 hover:bg-emerald-800 hover:text-white rounded-2xl flex items-center gap-4 transition-all group border border-emerald-100 shadow-sm active:scale-95">
            <div className="bg-white p-2 rounded-xl group-hover:bg-emerald-700 shadow-sm"><ClipboardList className="text-emerald-800 group-hover:text-white"/></div>
            <div className="text-left"><span className="block font-black text-sm uppercase">Supervisor</span><span className="text-[10px] opacity-60 font-bold uppercase">Ver Novedades</span></div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportForm({ user, reportesGlobales, setDbStatus }) {
  const [area, setArea] = useState(AREAS.FINANCIERA);
  const [jefatura, setJefatura] = useState('');
  const [entidad, setEntidad] = useState('');
  const [tipo, setTipo] = useState('apertura');
  const [novedad, setNovedad] = useState('SIN NOVEDAD');
  const [grado, setGrado] = useState(localStorage.getItem('bsf_grado') || '');
  const [nombre, setNombre] = useState(localStorage.getItem('bsf_nombre') || '');
  const [foto, setFoto] = useState(null); 
  const [enviando, setEnviando] = useState(false);
  const [horaActual, setHoraActual] = useState(new Date());
  const fileInputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setHoraActual(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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

  const hoyString = obtenerFechaString();
  const misReportesHoy = (reportesGlobales || []).filter(r => r.fecha_string === hoyString && r.jefatura === jefatura);

  useEffect(() => {
    const entidadesJefatura = ASIGNACIONES[area][jefatura] || [];
    if (entidadesJefatura.length > 0) {
       let primeraPendiente = entidadesJefatura[0];
       if (tipo !== 'extraordinario') {
           const pendiente = entidadesJefatura.find(e => !misReportesHoy.some(r => r.entidad === e && r.tipo === tipo));
           if (pendiente) primeraPendiente = pendiente;
       }
       setEntidad(primeraPendiente);
    }
  }, [jefatura, area, tipo, misReportesHoy.length]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try { setFoto(await procesarImagenSegura(file)); } catch (e) { alert("Error al procesar foto."); }
    }
  };

  const yaReportado = misReportesHoy.some(r => r.entidad === entidad && r.tipo === tipo && tipo !== 'extraordinario');

  const enviarParte = async () => {
    if (!navigator.onLine) { alert("Sin conexión a internet."); return; }
    if (!grado || !nombre || !foto) { alert("Complete todos los campos y capture una fotografía."); return; }
    if (yaReportado) { alert("Este parte ya fue enviado hoy."); return; }

    setEnviando(true);
    setDbStatus("Sincronizando con Google...");
    
    const areaFinal = EXCEPCIONES_AREA[entidad] || area;
    const horaRef = formatearHoraSimple(new Date()); 
    const fechaString = obtenerFechaString();

    const docData = {
        area: areaFinal, jefatura, entidad, tipo, novedad, foto, grado, nombre,
        horaReferencia: horaRef,
        fecha_string: fechaString,
        timestamp: serverTimestamp(),
        userId: user.uid
    };

    try {
      // Escritura forzada a la ruta artifacts
      const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME);
      await addDoc(reportsRef, docData);
      
      alert("REPORTE REGISTRADO EN LA BASE DE DATOS."); 
      setNovedad('SIN NOVEDAD');
      if (tipo === 'extraordinario') setFoto(null);
      setDbStatus("Registro exitoso.");
    } catch (e) {
      console.error(e);
      setDbStatus(`ERROR AL GUARDAR: ${e.code}`);
      alert(`ERROR TÉCNICO: ${e.message}\nConsulte al administrador del sistema.`);
    }
    setEnviando(false);
  };

  const listaEntidades = ASIGNACIONES[area][jefatura] || [];
  const completados = listaEntidades.filter(e => misReportesHoy.some(r => r.entidad === e && r.tipo === tipo)).length;
  const progreso = (completados / listaEntidades.length) * 100;

  return (
    <div className="space-y-4 max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-blue-900">
         <div className="space-y-4">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-widest">Responsable del Servicio</label>
                <div className="flex gap-2">
                    <input className="w-1/3 p-3 border rounded-xl text-xs font-bold uppercase shadow-sm" placeholder="Grado" value={grado} onChange={e=>setGrado(e.target.value)} />
                    <input className="w-2/3 p-3 border rounded-xl text-xs uppercase shadow-sm" placeholder="Nombre Completo" value={nombre} onChange={e=>setNombre(e.target.value)} />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-2">
                {Object.entries(AREAS).map(([k,v]) => (
                   <button key={k} onClick={()=>setArea(v)} className={`text-[9px] p-3 rounded-xl border font-black uppercase transition-all shadow-sm ${area===v ? 'bg-blue-900 text-white border-blue-900 scale-105' : 'bg-white text-slate-400 border-slate-200'}`}>{v.split(' ')[1] || v}</button>
                ))}
             </div>

             <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1 ml-1">Jefatura / Unidad</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase shadow-sm" value={jefatura} onChange={e=>setJefatura(e.target.value)}>
                   {Object.keys(ASIGNACIONES[area]||{}).map(j=><option key={j} value={j}>{j}</option>)}
                </select>
             </div>

             <div className={`p-4 rounded-2xl border-2 transition-all ${yaReportado ? 'bg-green-50 border-green-400' : 'bg-slate-50 border-slate-200'}`}>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Entidad ({completados}/{listaEntidades.length})</label>
                <select className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-inner" value={entidad} onChange={e=>setEntidad(e.target.value)}>
                   {(ASIGNACIONES[area][jefatura]||[]).map(e => {
                      const listo = misReportesHoy.some(r => r.entidad === e && r.tipo === tipo);
                      return <option key={e} value={e}>{listo ? '✅' : '⬜'} {e} {listo ? '(LISTO)' : ''}</option>
                   })}
                </select>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-1 ml-1">Tipo</label><select className="w-full p-3 border rounded-xl text-xs font-black uppercase shadow-sm bg-white" value={tipo} onChange={e=>setTipo(e.target.value)}><option value="apertura">APERTURA</option><option value="cierre">CIERRE</option><option value="extraordinario">EXTRAORDINARIO</option></select></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-1 ml-1">Reloj</label><div className="w-full p-3 bg-slate-900 text-green-400 rounded-xl text-xs font-mono text-center font-bold shadow-lg border border-slate-800">{horaActual.toLocaleTimeString()}</div></div>
             </div>

             <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-1 ml-1">Novedad</label><textarea className="w-full p-3 border rounded-xl text-xs shadow-inner bg-slate-50 min-h-[80px]" value={novedad} onChange={e=>setNovedad(e.target.value)}/></div>

             <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50">
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFile} />
                {!foto ? <button onClick={()=>fileInputRef.current.click()} className="text-xs font-black text-blue-900 flex flex-col items-center gap-2 py-4"><Camera size={40}/> CAPTURAR FOTO</button> : 
                <div className="relative group"><img src={foto} className="w-full h-48 object-cover rounded-xl shadow-2xl"/><button onClick={()=>setFoto(null)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-lg"><X size={16}/></button></div>}
             </div>

             <button onClick={enviarParte} disabled={enviando || (yaReportado && tipo !== 'extraordinario')} className={`w-full py-5 rounded-2xl font-black text-white text-xs uppercase shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${enviando ? 'bg-slate-400' : yaReportado && tipo !== 'extraordinario' ? 'bg-green-600' : 'bg-blue-900 hover:bg-blue-800'}`}>
                {enviando ? <RefreshCw className="animate-spin"/> : yaReportado && tipo !== 'extraordinario' ? <CheckCircle size={18}/> : <Zap size={18}/>}
                {enviando ? 'ENVIANDO A LA NUBE...' : yaReportado && tipo !== 'extraordinario' ? 'REPORTE YA ENVIADO' : 'ENVIAR REPORTE OFICIAL'}
             </button>
         </div>
      </div>
      {tipo !== 'extraordinario' && (
          <div className="bg-white p-3 rounded-2xl shadow-lg border-l-4 border-yellow-500 flex items-center justify-between px-4">
              <span className="text-[10px] font-black uppercase text-slate-500">Avance de {tipo}</span>
              <div className="w-1/2 bg-slate-100 h-2 rounded-full overflow-hidden mx-4"><div className="h-full bg-yellow-500 transition-all duration-1000" style={{width: `${progreso}%`}}></div></div>
              <span className="text-[10px] font-black text-blue-900">{Math.round(progreso)}%</span>
          </div>
      )}
    </div>
  );
}

function SupervisorDashboard({ reportesGlobales }) {
  const [fecha, setFecha] = useState(obtenerFechaString());
  const [filtro, setFiltro] = useState('todos');
  const [verTodoHistorial, setVerTodoHistorial] = useState(false);
  const [modalFoto, setModalFoto] = useState(null);

  const reportesVisibles = (reportesGlobales || []).filter(r => {
     if (!r || r.tipo === 'PRUEBA_SISTEMA') return false;
     if (!verTodoHistorial && r.fecha_string !== fecha) return false;
     if (filtro !== 'todos' && r.tipo !== filtro) return false;
     return true;
  }).sort((a,b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
      return timeB - timeA;
  });

  const copiar = (texto) => {
    const el = document.createElement('textarea'); el.value = texto; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); alert("Copiado al portapapeles.");
  };

  const generarResumen = () => {
    let t = `*REPORTE BSF - ${fecha}*\n\n`;
    [AREAS.FINANCIERA, AREAS.VIP, AREAS.INSTALACIONES, AREAS.ETV].forEach(areaName => {
        const reportesArea = reportesVisibles.filter(r => (EXCEPCIONES_AREA[r.entidad] || r.area) === areaName);
        if(reportesArea.length === 0 && filtro !== 'todos') return;
        t += `*${areaName}*\n`;
        if(reportesArea.length === 0) t += "Sin novedades registradas.\n";
        else {
           reportesArea.forEach(r => {
              const esNovedad = r.novedad?.toUpperCase() !== 'SIN NOVEDAD';
              t += `${esNovedad ? '⚠ NOVEDAD' : '✓'} (${r.horaReferencia}): ${r.novedad} (${r.entidad} - ${r.grado} ${r.nombre.split(' ')[0]})\n`;
           });
        }
        t += "\n";
    });
    t += `"${LEMA}"`;
    copiar(t);
  };

  const jefaturasTotales = new Set(Object.values(ASIGNACIONES).flatMap(area => Object.keys(area)));
  const jefaturasReportadas = new Set(reportesVisibles.map(r => r.jefatura));
  const oficialesFaltantes = [...jefaturasTotales].filter(j => !jefaturasReportadas.has(j));

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {modalFoto && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4" onClick={()=>setModalFoto(null)}>
              <img src={modalFoto} className="max-w-full max-h-[80vh] rounded-2xl border-4 border-white shadow-2xl shadow-blue-900/40" />
              <button className="absolute top-10 right-10 bg-white p-3 rounded-full text-red-600 shadow-xl"><X size={32}/></button>
          </div>
      )}
      
      <div className="bg-white p-6 rounded-3xl shadow-xl border-l-8 border-emerald-600">
         <div className="flex justify-between items-start mb-4">
             <h2 className="font-black text-xl text-slate-800 uppercase tracking-tighter">Central de Novedades</h2>
             <button onClick={()=>window.location.reload()} className="p-2 bg-slate-100 rounded-lg text-slate-500"><RefreshCw size={18}/></button>
         </div>
         <div className="flex flex-col gap-3">
            <div className="flex gap-2 items-center">
               <button onClick={()=>setVerTodoHistorial(!verTodoHistorial)} className={`p-3 border rounded-xl transition-colors ${verTodoHistorial ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`} title="Ver Historial Completo"><Database size={20}/></button>
               <input type="date" className="p-3 border border-slate-200 rounded-xl text-xs flex-grow font-black shadow-inner" value={fecha} onChange={e=>setFecha(e.target.value)} disabled={verTodoHistorial}/>
            </div>
            <select className="p-3 border border-slate-200 rounded-xl text-xs uppercase font-black bg-white shadow-sm" value={filtro} onChange={e=>setFiltro(e.target.value)}>
               <option value="todos">VER TODOS LOS PARTES</option>
               <option value="apertura">FILTRAR SOLO APERTURA</option>
               <option value="cierre">FILTRAR SOLO CIERRE</option>
               <option value="extraordinario">FILTRAR SOLO NOVEDADES</option>
            </select>
            <button onClick={generarResumen} className="bg-slate-900 text-white p-4 rounded-2xl font-black text-xs flex justify-center items-center gap-2 shadow-xl hover:bg-slate-800 transition-transform active:scale-95 uppercase tracking-widest"><Copy size={16}/> Copiar Parte General</button>
         </div>
      </div>
      
      {(filtro === 'apertura' || filtro === 'cierre') && (
        <div className={`p-5 rounded-3xl shadow-xl border-b-4 transition-all ${oficialesFaltantes.length > 0 ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
            <div className="flex justify-between items-center mb-3">
                <p className="font-black text-[11px] uppercase text-slate-700 tracking-wider">Control de Personal ({filtro})</p>
                <span className="text-xl font-black text-slate-800">{jefaturasTotales.size - oficialesFaltantes.length}/{jefaturasTotales.size}</span>
            </div>
            {oficialesFaltantes.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                    {oficialesFaltantes.map(j => <span key={j} className="text-[9px] bg-white border border-red-200 px-2 py-1 rounded-lg font-bold text-red-600 shadow-sm">{j}</span>)}
                </div>
            ) : <p className="text-[10px] font-black text-green-700 text-center uppercase tracking-widest">¡PERSONAL COMPLETO!</p>}
        </div>
      )}

      <div className="space-y-4">
         {reportesVisibles.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-3xl shadow-lg border-r-8 border-slate-200 flex gap-4 items-center hover:translate-x-1 transition-all">
               <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer border-2 border-slate-50 shadow-inner" onClick={()=>setModalFoto(r.foto)}>
                  <img src={r.foto} className="w-full h-full object-cover" loading="lazy" />
               </div>
               <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start">
                     <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase shadow-sm ${r.tipo==='apertura'?'bg-blue-900 text-white':r.tipo==='cierre'?'bg-slate-500 text-white':'bg-red-600 text-white'}`}>{r.tipo}</span>
                     <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-50 px-2 rounded-lg">{r.horaReferencia}</span>
                  </div>
                  <h4 className="font-black text-xs truncate mt-2 uppercase text-slate-800 tracking-tight">{r.entidad}</h4>
                  <p className="text-[9px] italic text-slate-500 font-bold uppercase truncate">{r.grado} {r.nombre}</p>
                  <p className={`text-[10px] font-bold mt-1 leading-tight p-1 rounded-lg ${r.novedad?.toUpperCase() !== 'SIN NOVEDAD' ? 'bg-red-50 text-red-700' : 'text-slate-600'}`}>{r.novedad}</p>
               </div>
               <button onClick={()=>copiar(`*${r.tipo.toUpperCase()}*\n${r.entidad}\nResp: ${r.grado} ${r.nombre}\nHora: ${r.horaReferencia}\nNovedad: ${r.novedad}\n"${LEMA}"`)} className="p-3 bg-slate-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Share2 size={20}/></button>
            </div>
         ))}
         {reportesVisibles.length === 0 && (
             <div className="text-center py-20 bg-white rounded-3xl border-4 border-dashed border-slate-100">
                 <Database size={48} className="mx-auto text-slate-100 mb-4" />
                 <p className="text-slate-300 font-black uppercase text-sm tracking-widest">Sin datos para mostrar</p>
                 <p className="text-[10px] text-slate-200 font-bold mt-2">Verifique la fecha o presione el botón de historial</p>
             </div>
         )}
      </div>
    </div>
  );
}

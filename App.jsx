import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, 
  onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { 
  Shield, FileText, Clock, List, Copy, CheckCircle, LogOut, 
  UserCheck, ClipboardList, AlertTriangle, Camera, 
  Image as ImageIcon, X, RefreshCw, Zap, User, Database, Lock, Wifi, WifiOff, Share2, AlertCircle, CheckSquare 
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE (EXTRAPOLADA DE ENTORNO) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyBNK_3oIKzaH5M5IyMSyTg6wAAiWzE8cww",
      authDomain: "sistema-de-partes-bsf-lp.firebaseapp.com",
      projectId: "sistema-de-partes-bsf-lp",
      storageBucket: "sistema-de-partes-bsf-lp.firebasestorage.app",
      messagingSenderId: "503023878670",
      appId: "1:503023878670:web:af4ef9065a28fa6a5e725f"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Uso de App ID dinámico según reglas del sistema
const appId = typeof __app_id !== 'undefined' ? __app_id : 'bsf-la-paz-v1';
const COLLECTION_NAME = 'reportes_oficiales_v8'; 

const AREAS = {
  FINANCIERA: "Área Financiera y Bancaria",
  VIP: "Área Seguridad VIP",
  INSTALACIONES: "Área Seg. Instalaciones",
  ETV: "Transporte de Valores"
};

// 12 Agencias registradas según requerimiento
const ASIGNACIONES = {
  [AREAS.FINANCIERA]: {
    "Jefatura BCP": ["BCP (Principal)", "Agencia Camacho", "Agencia Miraflores", "Agencia Calacoto", "Agencia El Alto", "Agencia San Pedro", "Agencia Obrajes", "Agencia Sopocachi", "Agencia Villa Fátima", "Agencia Achumani", "Agencia Pampahasi", "Agencia Irpavi"],
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
    "BANCO UNIÓN SA (Caudales)": ["Banco Unión Transporte de Valores", "Custodia de Caudales"],
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
  "Colegio San Calixto": AREAS.INSTALACIONES
};

const LEMA = "INTEGRIDAD, HONESTIDAD Y TRANSPARENCIA AL SERVICIO DE MA SOCIEDAD.";

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
  const [dbStatus, setDbStatus] = useState('Sincronizando...');
  const [reportesGlobales, setReportesGlobales] = useState([]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { 
        console.error("Auth Error:", error);
        setDbStatus(`ERROR AUTH: ${error.code}`);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // CARGA DE DATOS (REGLA 2: Sin filtros complejos para evitar cuelgues)
  useEffect(() => {
    if (!user) return;
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME);
    
    // Escuchamos la colección completa y filtramos en JavaScript (Lado Laptop)
    const unsubscribe = onSnapshot(reportsRef, (snap) => {
      const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setReportesGlobales(docs);
      setDbStatus(`SISTEMA ONLINE | ${docs.length} registros`);
    }, (error) => {
      console.error("Snapshot Error:", error);
      setDbStatus(`ERROR DE CONEXIÓN: ${error.code}`);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-white flex-col gap-4">
      <RefreshCw className="animate-spin text-yellow-500" size={48} />
      <span className="font-black uppercase tracking-widest text-xs">Cargando BSF...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col relative pb-16">
      <div className={`fixed bottom-0 w-full p-2 text-[10px] text-center z-[60] font-mono font-bold ${dbStatus.includes('ERROR') ? 'bg-red-600 text-white' : 'bg-slate-900 text-green-400'}`}>
         {dbStatus}
      </div>

      <header className="bg-slate-900 text-white p-4 shadow-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="text-yellow-500 w-8 h-8" />
            <div>
              <h1 className="font-black text-lg leading-tight uppercase tracking-tighter">Batallón de Seguridad Física</h1>
              <p className="text-[9px] text-slate-400 font-bold tracking-widest">LA PAZ - BOLIVIA</p>
            </div>
          </div>
          {view !== 'login' && <button onClick={() => setView('login')} className="bg-slate-800 p-2 rounded-xl border border-slate-700 hover:bg-red-900 transition-colors"><LogOut size={18}/></button>}
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
    <div className="flex flex-col gap-8 py-10 items-center animate-in fade-in duration-700">
      <div className="text-center bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-sm border-b-[12px] border-slate-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-yellow-500"></div>
        <div className="bg-slate-50 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-4 border-white">
            <Shield size={72} className="text-blue-900" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Acceso</h2>
        <p className="text-[10px] text-slate-400 font-black mb-10 uppercase tracking-[0.2em]">Parte Diario Digital</p>
        
        <div className="space-y-4">
          <button onClick={() => setView('form')} className="w-full p-6 bg-blue-50 hover:bg-blue-900 hover:text-white rounded-[24px] flex items-center gap-5 transition-all group border border-blue-100 shadow-sm active:scale-95">
            <div className="bg-white p-3 rounded-2xl group-hover:bg-blue-800 shadow-md transition-colors"><UserCheck className="text-blue-900 group-hover:text-white" size={24}/></div>
            <div className="text-left"><span className="block font-black text-sm uppercase tracking-tight">Oficial</span><span className="text-[9px] opacity-60 font-bold uppercase tracking-widest">Enviar Reportes</span></div>
          </button>
          <button onClick={() => setView('dashboard')} className="w-full p-6 bg-emerald-50 hover:bg-emerald-800 hover:text-white rounded-[24px] flex items-center gap-5 transition-all group border border-emerald-100 shadow-sm active:scale-95">
            <div className="bg-white p-3 rounded-2xl group-hover:bg-emerald-700 shadow-md transition-colors"><ClipboardList className="text-emerald-800 group-hover:text-white" size={24}/></div>
            <div className="text-left"><span className="block font-black text-sm uppercase tracking-tight">Supervisor</span><span className="text-[9px] opacity-60 font-bold uppercase tracking-widest">Ver Novedades</span></div>
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
  const [horaReloj, setHoraReloj] = useState(new Date());
  const fileInputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setHoraReloj(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    localStorage.setItem('bsf_grado', grado);
    localStorage.setItem('bsf_nombre', nombre);
  }, [grado, nombre]);

  useEffect(() => {
    const jefas = Object.keys(ASIGNACIONES[area] || {});
    if (jefas.length > 0) setJefatura(jefas[0]);
    const h = new Date().getHours();
    if (h >= 8 && h <= 11) setTipo('apertura');
    else if (h >= 15 && h <= 18) setTipo('cierre');
    else setTipo('extraordinario');
  }, [area]);

  const hoyStr = obtenerFechaString();
  const misPartesHoy = (reportesGlobales || []).filter(r => r.fecha_string === hoyStr && r.jefatura === jefatura);

  useEffect(() => {
    const ents = ASIGNACIONES[area][jefatura] || [];
    if (ents.length > 0) {
       let prox = ents[0];
       if (tipo !== 'extraordinario') {
           const pend = ents.find(e => !misPartesHoy.some(r => r.entidad === e && r.tipo === tipo));
           if (pend) prox = pend;
       }
       setEntidad(prox);
    }
  }, [jefatura, area, tipo, misPartesHoy.length]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try { setFoto(await procesarImagenSegura(file)); } catch (e) { alert("Error en procesamiento de imagen."); }
    }
  };

  const yaEnv = misPartesHoy.some(r => r.entidad === entidad && r.tipo === tipo && tipo !== 'extraordinario');

  const enviar = async () => {
    if (!navigator.onLine) { alert("SIN CONEXIÓN: No se puede enviar a la nube."); return; }
    if (!grado || !nombre || !foto) { alert("FALTA INFORMACIÓN: Grado, Nombre y Fotografía son obligatorios."); return; }
    if (yaEnv) { alert("AVISO: Esta entidad ya fue reportada para este turno."); return; }

    setEnviando(true);
    setDbStatus("Sincronizando con Google...");
    
    const docData = {
        area: EXCEPCIONES_AREA[entidad] || area,
        jefatura, entidad, tipo, novedad, foto, grado, nombre,
        horaReferencia: formatearHoraSimple(new Date()),
        fecha_string: hoyStr,
        timestamp: serverTimestamp(),
        userId: user.uid
    };

    try {
      const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', COLLECTION_NAME);
      
      // Implementamos un timeout manual para no quedar colgados
      const sendTask = addDoc(reportsRef, docData);
      const timeoutTask = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));

      await Promise.race([sendTask, timeoutTask]);
      
      alert("CONFIRMADO: Reporte almacenado en la nube."); 
      setNovedad('SIN NOVEDAD');
      if (tipo === 'extraordinario') setFoto(null);
      setDbStatus("Sincronizado.");
    } catch (e) {
      console.error(e);
      setDbStatus(`ERROR: ${e.message === 'Timeout' ? 'Servidor lento' : e.code}`);
      alert(`FALLO DE ENVÍO: ${e.message}. El reporte NO se guardó en el servidor.`);
    } finally {
      setEnviando(false);
    }
  };

  const ents = ASIGNACIONES[area][jefatura] || [];
  const listos = ents.filter(e => misPartesHoy.some(r => r.entidad === e && r.tipo === tipo)).length;
  const perc = (listos / ents.length) * 100;

  return (
    <div className="space-y-4 max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-[32px] shadow-2xl border-t-[10px] border-blue-900">
         <div className="space-y-4">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-2">
                <input className="w-1/3 p-3 border rounded-xl text-xs font-black uppercase shadow-sm focus:ring-2 ring-blue-500 outline-none" placeholder="Grado" value={grado} onChange={e=>setGrado(e.target.value)} />
                <input className="w-2/3 p-3 border rounded-xl text-xs font-black uppercase shadow-sm focus:ring-2 ring-blue-500 outline-none" placeholder="Nombre Completo" value={nombre} onChange={e=>setNombre(e.target.value)} />
             </div>

             <div className="grid grid-cols-2 gap-2">
                {Object.entries(AREAS).map(([k,v]) => (
                   <button key={k} onClick={()=>setArea(v)} className={`text-[9px] p-3 rounded-xl border font-black uppercase transition-all shadow-sm ${area===v ? 'bg-blue-900 text-white border-blue-900 scale-105' : 'bg-white text-slate-400 border-slate-200'}`}>{v.split(' ')[1] || v}</button>
                ))}
             </div>

             <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1 block">Jefatura Responsable</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase" value={jefatura} onChange={e=>setJefatura(e.target.value)}>
                   {Object.keys(ASIGNACIONES[area]||{}).map(j=><option key={j} value={j}>{j}</option>)}
                </select>
             </div>

             <div className={`p-4 rounded-2xl border-2 transition-all ${yaEnv ? 'bg-green-50 border-green-400' : 'bg-slate-50 border-slate-200'}`}>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Entidad a Reportar ({listos}/{ents.length})</label>
                <select className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-black" value={entidad} onChange={e=>setEntidad(e.target.value)}>
                   {ents.map(e => {
                      const l = misPartesHoy.some(r => r.entidad === e && r.tipo === tipo);
                      return <option key={e} value={e}>{l ? '✅' : '⬜'} {e} {l ? '(COMPLETADO)' : ''}</option>
                   })}
                </select>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1 block">Turno</label><select className="w-full p-3 border rounded-xl text-xs font-black uppercase bg-white shadow-sm" value={tipo} onChange={e=>setTipo(e.target.value)}><option value="apertura">APERTURA</option><option value="cierre">CIERRE</option><option value="extraordinario">NOVEDAD</option></select></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1 block">Hora Actual</label><div className="w-full p-3 bg-slate-900 text-green-400 rounded-xl text-xs font-mono text-center font-black shadow-lg border border-slate-800 tracking-wider">{horaReloj.toLocaleTimeString()}</div></div>
             </div>

             <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 ml-1 block">Descripción de Novedad</label><textarea className="w-full p-4 border rounded-xl text-xs shadow-inner bg-slate-50 min-h-[90px] font-bold" value={novedad} onChange={e=>setNovedad(e.target.value)}/></div>

             <div className="border-2 border-dashed border-slate-300 rounded-[24px] p-6 text-center bg-slate-50 group hover:border-blue-400 transition-colors">
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFile} />
                {!foto ? <button onClick={()=>fileInputRef.current.click()} className="text-xs font-black text-blue-900 flex flex-col items-center gap-3 py-2"><Camera size={44}/> CAPTURAR EVIDENCIA FOTOGRÁFICA</button> : 
                <div className="relative group"><img src={foto} className="w-full h-52 object-cover rounded-2xl shadow-2xl border-4 border-white"/><button onClick={()=>setFoto(null)} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><X size={20}/></button></div>}
             </div>

             <button onClick={enviar} disabled={enviando || yaEnv} className={`w-full py-6 rounded-[24px] font-black text-white text-xs uppercase shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${enviando ? 'bg-slate-400' : yaEnv ? 'bg-green-600' : 'bg-blue-900 hover:bg-blue-800'}`}>
                {enviando ? <RefreshCw className="animate-spin" size={20}/> : yaEnv ? <CheckCircle size={20}/> : <Zap size={20}/>}
                {enviando ? 'Sincronizando Datos...' : yaEnv ? 'REPORTE YA ENVIADO' : 'ENVIAR REPORTE A LA NUBE'}
             </button>
             <p className="text-[9px] text-center font-black text-slate-400 tracking-tighter uppercase italic">{LEMA}</p>
         </div>
      </div>
      {tipo !== 'extraordinario' && (
          <div className="bg-white p-4 rounded-2xl shadow-xl border-l-8 border-yellow-500 flex items-center justify-between px-6">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Avance del Turno</span>
              <div className="flex-grow bg-slate-100 h-2.5 rounded-full overflow-hidden mx-6 shadow-inner"><div className="h-full bg-yellow-500 transition-all duration-1000 ease-out" style={{width: `${perc}%`}}></div></div>
              <span className="text-xs font-black text-blue-900">{Math.round(perc)}%</span>
          </div>
      )}
    </div>
  );
}

function SupervisorDashboard({ reportesGlobales }) {
  const [fecha, setFecha] = useState(obtenerFechaString());
  const [filtro, setFiltro] = useState('todos');
  const [verHistorial, setVerHistorial] = useState(false);
  const [modalFoto, setModalFoto] = useState(null);

  // FILTRADO Y ORDENAMIENTO EN MEMORIA (REGLA 2)
  const visibles = (reportesGlobales || []).filter(r => {
     if (!r || r.tipo === 'PRUEBA_SISTEMA') return false;
     if (!verHistorial && r.fecha_string !== fecha) return false;
     if (filtro !== 'todos' && r.tipo !== filtro) return false;
     return true;
  }).sort((a,b) => {
      const ta = a.timestamp?.seconds || 0;
      const tb = b.timestamp?.seconds || 0;
      return tb - ta; // Descendente por tiempo
  });

  const copiar = (txt) => {
    const el = document.createElement('textarea'); el.value = txt; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); alert("Copiado al portapapeles.");
  };

  const generarParte = () => {
    let t = `*REPORTE BSF - ${fecha}*\n\n`;
    [AREAS.FINANCIERA, AREAS.VIP, AREAS.INSTALACIONES, AREAS.ETV].forEach(an => {
        const ra = visibles.filter(r => (EXCEPCIONES_AREA[r.entidad] || r.area) === an);
        if(ra.length === 0 && filtro !== 'todos') return;
        t += `*${an}*\n`;
        if(ra.length === 0) t += "Sin novedades registradas.\n";
        else {
           ra.forEach(r => {
              const nov = r.novedad?.toUpperCase() !== 'SIN NOVEDAD';
              t += `${nov ? '⚠ NOVEDAD' : '✓'} (${r.horaReferencia}): ${r.novedad} (${r.entidad} - ${r.grado} ${r.nombre.split(' ')[0]})\n`;
           });
        }
        t += "\n";
    });
    t += `"${LEMA}"`;
    copiar(t);
  };

  const jefas = new Set(Object.values(ASIGNACIONES).flatMap(a => Object.keys(a)));
  const reps = new Set(visibles.map(r => r.jefatura));
  const falty = [...jefas].filter(j => !reps.has(j));

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {modalFoto && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setModalFoto(null)}>
              <div className="relative max-w-2xl w-full">
                <img src={modalFoto} className="w-full h-auto rounded-3xl border-8 border-white/10 shadow-2xl" />
                <button className="absolute -top-12 right-0 text-white flex items-center gap-2 font-black uppercase text-xs p-2"><X size={32}/> CERRAR</button>
              </div>
          </div>
      )}
      
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border-l-[12px] border-emerald-600">
         <div className="flex justify-between items-start mb-6">
             <div>
                <h2 className="font-black text-2xl text-slate-800 uppercase tracking-tighter">Panel de Gestión</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Supervisión de novedades</p>
             </div>
             <button onClick={()=>window.location.reload()} className="p-3 bg-slate-50 rounded-2xl text-slate-500 shadow-sm border border-slate-100 hover:rotate-180 transition-transform duration-500"><RefreshCw size={24}/></button>
         </div>

         <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-center">
               <button onClick={()=>setVerHistorial(!verHistorial)} className={`p-4 rounded-2xl transition-all shadow-md ${verHistorial ? 'bg-blue-900 text-white' : 'bg-slate-50 text-slate-400'}`} title="Ver Historial Completo"><Database size={24}/></button>
               <div className="relative flex-grow">
                 <Calendar className="absolute left-4 top-4 text-slate-400" size={18} />
                 <input type="date" className="w-full p-4 pl-12 border border-slate-100 rounded-2xl text-xs font-black shadow-inner bg-slate-50" value={fecha} onChange={e=>setFecha(e.target.value)} disabled={verHistorial}/>
               </div>
            </div>
            <select className="p-4 border border-slate-100 rounded-2xl text-xs uppercase font-black bg-white shadow-sm" value={filtro} onChange={e=>setFiltro(e.target.value)}>
               <option value="todos">PARTES DE TODOS LOS TURNOS</option>
               <option value="apertura">FILTRAR POR APERTURA</option>
               <option value="cierre">FILTRAR POR CIERRE</option>
               <option value="extraordinario">FILTRAR POR NOVEDADES</option>
            </select>
            <button onClick={generarParte} className="bg-slate-900 text-white p-5 rounded-[24px] font-black text-xs flex justify-center items-center gap-3 shadow-2xl hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest border-b-4 border-slate-700"><Copy size={20}/> Generar Parte Consolidado</button>
         </div>
      </div>
      
      {(filtro === 'apertura' || filtro === 'cierre') && (
        <div className={`p-6 rounded-[32px] shadow-2xl border-b-8 transition-all ${falty.length > 0 ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
            <div className="flex justify-between items-center mb-4">
                <p className="font-black text-xs uppercase text-slate-700 tracking-wider">Control de Personal en Servicio</p>
                <div className="flex flex-col items-end">
                    <span className="text-2xl font-black text-slate-800">{jefas.size - falty.length}/{jefas.size}</span>
                    <span className="text-[9px] font-black opacity-40 uppercase">Oficiales</span>
                </div>
            </div>
            {falty.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                    {falty.map(j => <span key={j} className="text-[10px] bg-white border-2 border-red-100 px-3 py-1.5 rounded-xl font-black text-red-600 shadow-sm uppercase tracking-tighter">{j}</span>)}
                </div>
            ) : <div className="p-2 bg-green-500 text-white rounded-xl text-center font-black text-[10px] uppercase tracking-widest shadow-lg animate-pulse">¡Servicio Completo!</div>}
        </div>
      )}

      <div className="space-y-4">
         {visibles.map(r => (
            <div key={r.id} className="bg-white p-5 rounded-[32px] shadow-xl border-r-[10px] border-slate-100 flex gap-5 items-center hover:translate-x-2 transition-all duration-300 group">
               <div className="w-20 h-20 bg-slate-50 rounded-3xl overflow-hidden flex-shrink-0 cursor-pointer border-4 border-white shadow-lg group-hover:scale-110 transition-transform" onClick={()=>setModalFoto(r.foto)}>
                  <img src={r.foto} className="w-full h-full object-cover" loading="lazy" />
               </div>
               <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-start">
                     <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase shadow-md ${r.tipo==='apertura'?'bg-blue-900 text-white':r.tipo==='cierre'?'bg-slate-500 text-white':'bg-red-600 text-white'}`}>{r.tipo}</span>
                     <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 shadow-inner">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-[11px] font-mono text-slate-500 font-black">{r.horaReferencia}</span>
                     </div>
                  </div>
                  <h4 className="font-black text-sm truncate mt-3 uppercase text-slate-800 tracking-tighter">{r.entidad}</h4>
                  <p className="text-[10px] italic text-slate-400 font-black uppercase truncate mt-0.5 tracking-tight">{r.grado} {r.nombre}</p>
                  <p className={`text-[11px] font-bold mt-2 leading-relaxed p-2 rounded-2xl ${r.novedad?.toUpperCase() !== 'SIN NOVEDAD' ? 'bg-red-50 text-red-700 border border-red-100 shadow-sm' : 'text-slate-600 bg-slate-50 border border-slate-100'}`}>{r.novedad}</p>
               </div>
               <button onClick={()=>copiar(`*${r.tipo.toUpperCase()}*\n${r.entidad}\nResponsable: ${r.grado} ${r.nombre}\nHora: ${r.horaReferencia}\nNovedad: ${r.novedad}\n"${LEMA}"`)} className="p-4 bg-slate-50 text-emerald-600 rounded-[20px] hover:bg-emerald-600 hover:text-white transition-all shadow-md border border-slate-100 active:scale-90"><Share2 size={24}/></button>
            </div>
         ))}
         {visibles.length === 0 && (
             <div className="text-center py-24 bg-white rounded-[40px] border-4 border-dashed border-slate-50 shadow-inner">
                 <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Database size={56} className="text-slate-200" />
                 </div>
                 <p className="text-slate-400 font-black uppercase text-sm tracking-[0.3em]">Base de Datos Vacía</p>
                 <p className="text-[10px] text-slate-300 font-bold mt-3 uppercase tracking-widest">Sincronizando con el servidor central...</p>
             </div>
         )}
      </div>
    </div>
  );
}

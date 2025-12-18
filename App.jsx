import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, 
  onSnapshot, Timestamp, where, serverTimestamp 
} from 'firebase/firestore';
import { Shield, FileText, Clock, List, Copy, CheckCircle, LogOut, Landmark, Building2, Truck, UserCheck, ClipboardList, AlertTriangle, Camera, Image as ImageIcon, X, RefreshCw, Zap, User, Filter, Share2 } from 'lucide-react';

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
// Identificador fijo para tu aplicación
const appId = 'bsf-la-paz-v1';

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
    "Jefatura U. Católica": ["Universidad Católica Boliviana", "Vitalicia Seguros", "Urbanización La Rinconada", "Embajada Gran Bretaña", "Hipermaxi S.A."]
  },
  [AREAS.VIP]: {
    "Jefatura VIP EPSAS": ["Seguridad VIP EPSAS Gerencia General"],
    "Jefatura VIP SIC": ["Seguridad VIP SIC Futuro Ltda."]
  }
};

// Excepciones para corregir el área automáticamente
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
const formatearFecha = (timestamp) => {
  if (!timestamp) return "Procesando...";
  return new Date(timestamp.seconds * 1000).toLocaleString('es-BO', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
  });
};

const obtenerFechaHoy = () => new Date().toISOString().split('T')[0];

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

// Motor de imagen optimizado (evita pantalla blanca)
const procesarImagenSegura = (file) => {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      resolve(dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("Error imagen.")); };
    img.src = blobUrl;
  });
};

// --- Componente Principal ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) { console.error("Error auth:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-bold">Cargando Sistema BSF...</div>;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="text-yellow-500 w-8 h-8" />
            <div>
              <h1 className="font-bold text-lg leading-tight text-yellow-500">BATALLÓN DE SEGURIDAD FÍSICA</h1>
              <p className="text-[10px] text-slate-300 tracking-wider uppercase">Sistema de Parte Diario</p>
            </div>
          </div>
          {view !== 'login' && (
            <button onClick={() => setView('login')} className="text-xs bg-slate-800 p-2 rounded hover:bg-slate-700 border border-slate-700"><LogOut size={16} /></button>
          )}
        </div>
      </header>
      <main className="flex-grow max-w-4xl mx-auto w-full p-4">
        {view === 'login' && <LoginScreen setView={setView} />}
        {view === 'form' && user && <ReportForm user={user} setView={setView} />}
        {view === 'dashboard' && user && <SupervisorDashboard user={user} />}
      </main>
      <footer className="bg-slate-900 text-slate-400 text-center p-6 text-xs mt-auto">
        <p className="font-bold text-yellow-600 mb-2">"{LEMA}"</p>
        <p>© 2025 Batallón de Seguridad Física - La Paz</p>
      </footer>
    </div>
  );
}

function LoginScreen({ setView }) {
  return (
    <div className="flex flex-col gap-8 items-center justify-center py-10 animate-fade-in">
      <div className="text-center space-y-2"><h2 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">Seleccione su Función</h2><div className="h-1 w-20 bg-yellow-500 mx-auto"></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <button onClick={() => setView('form')} className="flex flex-col items-center p-8 bg-white rounded-lg shadow-md border-l-4 border-blue-900 hover:shadow-xl transition-all group">
          <div className="bg-blue-50 p-4 rounded-full mb-4 group-hover:bg-blue-900 group-hover:text-white transition-colors"><Shield size={40} className="text-blue-900 group-hover:text-white" /></div>
          <span className="font-bold text-lg text-slate-800 text-center leading-tight">JEFE / OFICIAL DE SEGURIDAD</span>
        </button>
        <button onClick={() => setView('dashboard')} className="flex flex-col items-center p-8 bg-white rounded-lg shadow-md border-l-4 border-emerald-700 hover:shadow-xl transition-all group">
          <div className="bg-emerald-50 p-4 rounded-full mb-4 group-hover:bg-emerald-800 group-hover:text-white transition-colors"><List size={40} className="text-emerald-800 group-hover:text-white" /></div>
          <span className="font-bold text-lg text-slate-800 text-center leading-tight">SUPERVISOR DE SERVICIO</span>
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
  
  // Datos del Oficial
  const [grado, setGrado] = useState(localStorage.getItem('bsf_grado') || '');
  const [nombre, setNombre] = useState(localStorage.getItem('bsf_nombre') || '');

  const [foto, setFoto] = useState(null); 
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [horarioValido, setHorarioValido] = useState({ permitido: true });
  const [reportesHoyDetalle, setReportesHoyDetalle] = useState([]);
  const fileInputRef = useRef(null);

  // Persistir datos del oficial
  useEffect(() => {
    localStorage.setItem('bsf_grado', grado);
    localStorage.setItem('bsf_nombre', nombre);
  }, [grado, nombre]);

  useEffect(() => {
    const jefaturas = Object.keys(ASIGNACIONES[area] || {});
    if (jefaturas.length > 0) setJefatura(jefaturas[0]);
    const hora = new Date().getHours();
    let sugerencia = 'extraordinario';
    if (hora >= 8 && hora <= 10) sugerencia = 'apertura';
    else if (hora >= 15 && hora <= 17) sugerencia = 'cierre';
    setTipo(sugerencia);
  }, [area]);

  useEffect(() => {
    setHorarioValido(esHorarioPermitido(tipo));
    const interval = setInterval(() => setHorarioValido(esHorarioPermitido(tipo)), 15000);
    return () => clearInterval(interval);
  }, [tipo]);

  useEffect(() => {
    if (jefatura && ASIGNACIONES[area][jefatura]) setEntidad(ASIGNACIONES[area][jefatura][0]);
  }, [jefatura, area]);

  useEffect(() => {
    if (!jefatura) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'reports_v3'), where('jefatura', '==', jefatura));
    const unsub = onSnapshot(q, (snap) => {
      const hoy = obtenerFechaHoy();
      const docsHoy = snap.docs.map(d => d.data()).filter(d => d.timestamp && new Date(d.timestamp.seconds * 1000).toISOString().split('T')[0] === hoy);
      setReportesHoyDetalle(docsHoy);
    });
    return () => unsub();
  }, [jefatura]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setProcesandoFoto(true);
      try {
        const imagenMiniatura = await procesarImagenSegura(file);
        setFoto(imagenMiniatura);
      } catch (error) { alert("Error al procesar la imagen."); }
      setProcesandoFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const yaReportado = reportesHoyDetalle.some(r => r.entidad === entidad && r.tipo === tipo && tipo !== 'extraordinario');
  const faltaFoto = !foto;
  const faltaDatos = !grado.trim() || !nombre.trim();
  const botonEnviarDeshabilitado = enviando || yaReportado || !horarioValido.permitido || faltaFoto || faltaDatos;

  const generarReporte = async () => {
    if (botonEnviarDeshabilitado) return;
    setEnviando(true);
    
    // CORRECCIÓN AUTOMÁTICA DE ÁREA
    const areaFinal = EXCEPCIONES_AREA[entidad] || area;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports_v3'), {
        area: areaFinal, // Se guarda el área correcta
        jefatura, entidad, tipo, novedad, foto, 
        grado, nombre, 
        timestamp: serverTimestamp(), userId: user.uid
      });
      
      setNovedad('SIN NOVEDAD');
      alert(`Reporte para "${entidad}" enviado exitosamente.\nResponsable: ${grado} ${nombre}`);
      
      // AUTO-AVANCE SOLO SI NO ES EXTRAORDINARIO
      if (tipo !== 'extraordinario') {
        const entidadesJefatura = ASIGNACIONES[area][jefatura] || [];
        const currentIndex = entidadesJefatura.indexOf(entidad);
        if (currentIndex >= 0 && currentIndex < entidadesJefatura.length - 1) {
          setEntidad(entidadesJefatura[currentIndex + 1]);
        }
      }
    } catch (e) { alert("Error al guardar."); }
    setEnviando(false);
  };

  const entidadesJefatura = ASIGNACIONES[area][jefatura] || [];
  const entidadesReportadasHoy = reportesHoyDetalle.filter(r => r.tipo === tipo).map(r => r.entidad);
  const progreso = (entidadesReportadasHoy.length / entidadesJefatura.length) * 100;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg mx-auto border-t-4 border-blue-900">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
          <FileText size={20} className="text-blue-900" /> REGISTRO DE PARTE DIARIO
        </h3>

        {!horarioValido.permitido && (
          <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4 rounded text-xs text-red-600">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} /><p className="font-bold uppercase tracking-tight">HORARIO NO HABILITADO</p></div>
            <p>{tipo === 'apertura' ? 'Apertura solo 09:00 a 09:20.' : 'Cierre solo 16:00 a 16:20.'} Use <b>EXTRAORDINARIO</b> fuera de hora.</p>
          </div>
        )}

        <div className="bg-blue-50 p-3 rounded border border-blue-100 mb-4">
          <label className="block text-[10px] font-bold text-blue-800 uppercase mb-2 flex items-center gap-1"><User size={12}/> Responsable del Servicio</label>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1"><input type="text" placeholder="Grado" value={grado} onChange={(e) => setGrado(e.target.value)} className="w-full p-2 border border-blue-300 rounded text-xs font-bold" /></div>
            <div className="col-span-2"><input type="text" placeholder="Nombre Completo" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border border-blue-300 rounded text-xs" /></div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(AREAS).map(([key, label]) => (
              <button key={key} onClick={() => setArea(label)} className={`p-2 text-[10px] font-bold rounded border uppercase whitespace-normal h-auto min-h-[40px] leading-tight ${area === label ? 'bg-blue-900 text-white border-blue-900' : 'bg-slate-50 text-slate-500'}`}>{label}</button>
            ))}
          </div>

          <div className="bg-slate-50 p-3 rounded border border-slate-200">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Su Jefatura</label>
            <select value={jefatura} onChange={(e) => setJefatura(e.target.value)} className="w-full p-2 border border-slate-300 rounded bg-white text-xs font-bold text-slate-800">
              {Object.keys(ASIGNACIONES[area] || {}).map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <div className={`p-3 rounded border border-blue-200 ${yaReportado ? 'bg-green-50 border-green-300' : 'bg-blue-50'}`}>
            <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Entidad a Reportar</label>
            <select value={entidad} onChange={(e) => setEntidad(e.target.value)} className="w-full p-2 border border-blue-300 rounded bg-white text-xs text-slate-800">
              {entidadesJefatura.map(e => <option key={e} value={e}>{e} {reportesHoyDetalle.some(r => r.entidad === e && r.tipo === tipo) ? '✅' : ''}</option>)}
              <option value="OTRA">OTRA JEFATURA</option>
            </select>
            {EXCEPCIONES_AREA[entidad] && <p className="text-[9px] text-blue-600 mt-1 font-bold">* Se registrará en: {EXCEPCIONES_AREA[entidad]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1"><label className="block text-[10px] font-bold text-slate-500 uppercase">Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full p-2 border rounded text-xs font-bold"><option value="apertura">APERTURA</option><option value="cierre">CIERRE</option><option value="extraordinario">EXTRAORDINARIO</option></select></div>
             <div className="space-y-1"><label className="block text-[10px] font-bold text-slate-500 uppercase">Hora</label><div className="p-2 bg-slate-100 border rounded text-xs font-mono text-slate-500 flex items-center gap-2"><Clock size={14}/> {new Date().toLocaleTimeString('es-BO', {hour:'2-digit', minute:'2-digit'})}</div></div>
          </div>

          <div className="space-y-1"><label className="block text-[10px] font-bold text-slate-500 uppercase">Novedades</label><textarea value={novedad} onChange={(e) => setNovedad(e.target.value)} disabled={yaReportado} className="w-full p-2 border border-slate-300 rounded text-xs min-h-[60px]" /></div>

          <div className={`p-4 rounded-lg border-2 ${foto ? 'border-green-200 bg-green-50' : 'border-blue-100 bg-blue-50'}`}>
            <input type="file" accept="image/*" capture="environment" id="cameraInput" className="hidden" ref={fileInputRef} onChange={handleFileChange}/>
            {!foto ? (
              <label htmlFor="cameraInput" className={`w-full py-4 bg-blue-700 text-white rounded font-bold flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-95 ${procesandoFoto ? 'opacity-50' : ''}`}>
                {procesandoFoto ? <RefreshCw className="animate-spin" size={20}/> : <Camera size={20} />}
                <span className="text-xs uppercase">{procesandoFoto ? 'Procesando...' : 'Tomar Foto de Evidencia'}</span>
              </label>
            ) : (
              <div className="flex items-center gap-3">
                <img src={foto} alt="Vista" className="w-16 h-16 rounded border border-slate-300 object-cover bg-black" />
                <div className="flex-grow">
                  <p className="text-[10px] font-bold text-green-700 leading-tight">FOTO EN MEMORIA</p>
                  <p className="text-[9px] text-slate-500 mb-2">Lista para enviarse con este reporte.</p>
                  <button onClick={() => setFoto(null)} className="text-[9px] uppercase font-bold text-red-600 underline">Cambiar Foto</button>
                </div>
              </div>
            )}
          </div>

          <button onClick={generarReporte} disabled={botonEnviarDeshabilitado} className={`w-full py-4 font-bold rounded shadow-lg flex items-center justify-center gap-2 uppercase tracking-wide text-white transition-all text-xs ${botonEnviarDeshabilitado ? 'bg-slate-400 opacity-70' : 'bg-blue-900 hover:bg-blue-800'}`}>
            {enviando ? 'ENVIANDO...' : yaReportado ? 'YA REPORTADO' : faltaFoto ? 'FALTA FOTO' : faltaDatos ? 'FALTAN DATOS' : 'ENVIAR PARTE'}
          </button>
        </div>
      </div>
      
      {tipo !== 'extraordinario' ? (
        <div className="bg-white p-4 rounded-lg shadow max-w-lg mx-auto">
          <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-xs uppercase"><ClipboardList size={16} /> Lista de Control ({tipo})</h4>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-4"><div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progreso}%` }}></div></div>
          <ul className="space-y-1">
            {entidadesJefatura.map(e => {
              const isDone = reportesHoyDetalle.some(r => r.entidad === e && r.tipo === tipo);
              return <li key={e} className={`p-2 rounded flex justify-between items-center text-[10px] font-bold ${isDone ? 'bg-green-50 text-green-800' : 'bg-slate-50 text-slate-500'}`}><span>{e}</span>{isDone ? <CheckCircle size={14} className="text-green-600"/> : <span>Pendiente</span>}</li>
            })}
          </ul>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-lg shadow max-w-lg mx-auto border-t-2 border-yellow-500">
          <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-xs uppercase"><Zap size={16} className="text-yellow-600" /> Reportes Extraordinarios de Hoy</h4>
          {reportesHoyDetalle.filter(r => r.tipo === 'extraordinario').length === 0 ? <p className="text-[10px] text-slate-400 italic">No hay reportes extraordinarios registrados hoy para esta jefatura.</p> : 
            <ul className="space-y-1">{reportesHoyDetalle.filter(r => r.tipo === 'extraordinario').map((r, i) => <li key={i} className="p-2 bg-yellow-50 text-yellow-800 rounded text-[10px] font-bold flex justify-between"><span>{r.entidad}</span><span className="text-[9px] opacity-70">{formatearFecha(r.timestamp).split(',')[1]}</span></li>)}</ul>
          }
        </div>
      )}
    </div>
  );
}

function SupervisorDashboard() {
  const [reportes, setReportes] = useState([]);
  const [fecha, setFecha] = useState(obtenerFechaHoy());
  const [fotoSeleccionada, setFotoSeleccionada] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'reports_v3'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setReportes(data.filter(d => {
        if (!d.timestamp) return true;
        const dFecha = new Date(d.timestamp.seconds * 1000).toISOString().split('T')[0];
        return dFecha === fecha;
      }));
    });
    return () => unsub();
  }, [fecha]);

  const reportesFiltrados = reportes.filter(r => filtroTipo === 'todos' ? true : r.tipo === filtroTipo);

  const generarResumenComandante = () => {
    const grupos = { [AREAS.FINANCIERA]: [], [AREAS.VIP]: [], [AREAS.INSTALACIONES]: [], [AREAS.ETV]: [] };
    reportesFiltrados.forEach(r => { 
      if(grupos[r.area]) grupos[r.area].push(r); 
      else if (grupos[AREAS.FINANCIERA]) grupos[AREAS.FINANCIERA].push(r); 
    });
    
    // Títulos Corregidos
    let titulo = "PARTE GENERAL";
    if (filtroTipo === 'apertura') titulo = "REPORTE DE APERTURA DE ENTIDADES";
    else if (filtroTipo === 'cierre') titulo = "REPORTE DE CIERRE DE ENTIDADES";
    else if (filtroTipo === 'extraordinario') titulo = "REPORTES EXTRAORDINARIOS";

    let texto = `*${titulo} - ${fecha}*\n\n`;
    [AREAS.FINANCIERA, AREAS.VIP, AREAS.INSTALACIONES, AREAS.ETV].forEach(areaName => {
      const reportsInArea = grupos[areaName];
      if (filtroTipo !== 'todos' && (!reportsInArea || reportsInArea.length === 0)) return;
      texto += `*${areaName}.*\n`;
      if (!reportsInArea || reportsInArea.length === 0) {
         if (filtroTipo === 'todos') texto += `(Pendiente de reportes)\n\n`;
         else texto += `Sin novedades.\n\n`;
      } else {
        const conNovedad = reportsInArea.filter(r => { const nov = r.novedad ? r.novedad.toUpperCase().trim() : ""; return !nov.includes("SIN NOVEDAD") && nov !== "S/N" && nov !== "."; });
        if (conNovedad.length === 0) texto += `Sin novedad.\n\n`;
        else { 
            conNovedad.forEach((r, i) => {
                const hora = formatearFecha(r.timestamp).split(',')[1]?.trim() || '';
                const responsable = r.grado && r.nombre ? ` - Resp: ${r.grado} ${r.nombre}` : '';
                texto += `Con novedad (${hora}): ${r.novedad} (${r.entidad}${responsable}).\n`;
            }); 
            texto += `\n`; 
        }
      }
    });
    texto += `*TOTAL REPORTES:* ${reportesFiltrados.length}\n_${LEMA}_`;
    copiarAlPortapapeles(texto, `Copiado: ${titulo}`);
  };

  const copiarReporteIndividual = (r) => {
    const hora = formatearFecha(r.timestamp).split(',')[1]?.trim() || '';
    // Título corregido para individual
    const titulo = r.tipo === 'extraordinario' ? "REPORTE EXTRAORDINARIO" : `PARTE INDIVIDUAL (${r.tipo.toUpperCase()})`;
    
    let texto = `*${titulo}*\n` +
      `*Jefatura:* ${r.jefatura}\n` +
      `*Entidad:* ${r.entidad}\n`;
    if (r.grado && r.nombre) texto += `*Responsable:* ${r.grado} ${r.nombre}\n`;
    texto += `*Hora:* ${hora}\n` +
      `*Área:* ${r.area}\n` +
      `*Novedad:* ${r.novedad}\n` +
      `_${LEMA}_`;
    copiarAlPortapapeles(texto, "Reporte individual copiado.");
  };

  const copiarAlPortapapeles = (texto, mensaje) => {
    const el = document.createElement('textarea'); el.value = texto; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); alert(mensaje);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {fotoSeleccionada && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-90 flex items-center justify-center p-4" onClick={() => setFotoSeleccionada(null)}>
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <button className="absolute top-2 right-2 text-white bg-red-600 rounded-full p-2" onClick={(e) => {e.stopPropagation(); setFotoSeleccionada(null);}}><X size={24}/></button>
            <img src={fotoSeleccionada.foto} alt="Evidencia" className="max-h-[80vh] w-auto rounded shadow-lg border-2 border-white object-contain"/>
            <div className="bg-white p-3 mt-2 rounded text-center w-full max-w-md">
              <p className="font-bold text-lg">{fotoSeleccionada.entidad}</p>
              <p className="text-sm text-slate-500 mb-1">{formatearFecha(fotoSeleccionada.timestamp)}</p>
              {fotoSeleccionada.grado && <p className="text-xs font-bold text-blue-800">Resp: {fotoSeleccionada.grado} {fotoSeleccionada.nombre}</p>}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm border-l-4 border-emerald-700">
        <div><h2 className="text-xl font-bold text-slate-800">CENTRAL DE NOVEDADES</h2><p className="text-slate-500 text-sm">Consolidación de Partes Diarios</p></div>
        <div className="flex flex-col gap-2 mt-4 md:mt-0 items-end">
          <div className="flex gap-2">
             <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="p-2 border rounded text-slate-700 text-xs" />
             <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="p-2 border rounded text-slate-700 text-xs font-bold uppercase bg-slate-50">
               <option value="todos">VER TODOS</option>
               <option value="apertura">SOLO APERTURA</option>
               <option value="cierre">SOLO CIERRE</option>
               <option value="extraordinario">SOLO EXTRAORDINARIOS</option>
             </select>
          </div>
          <button onClick={generarResumenComandante} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold shadow-md w-full justify-center"><Copy size={16} /> COPIAR {filtroTipo === 'todos' ? 'GENERAL' : filtroTipo === 'extraordinario' ? 'EXTRAORDINARIOS' : filtroTipo.toUpperCase()}</button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase"><tr><th className="p-3 text-left">Hora</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-left">Resp.</th><th className="p-3 text-left">Entidad</th><th className="p-3 text-left">Novedad</th><th className="p-3 text-center">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {reportesFiltrados.length === 0 ? <tr><td colSpan="7" className="p-8 text-center text-slate-400">No hay reportes para este filtro.</td></tr> :
              reportesFiltrados.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-slate-500 font-bold">{r.timestamp ? formatearFecha(r.timestamp).split(',')[1] : '...'}</td>
                  <td className="p-3 font-bold text-slate-600 uppercase text-[10px]">{r.tipo}</td>
                  <td className="p-3 text-slate-700 text-[10px]">{r.grado ? `${r.grado} ${r.nombre.split(' ')[0]}` : '-'}</td>
                  <td className="p-3 font-medium text-slate-900">{r.entidad}</td>
                  <td className={`p-3 truncate max-w-xs ${!r.novedad.toUpperCase().includes('SIN NOVEDAD') ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{r.novedad}</td>
                  <td className="p-3 text-center flex justify-center gap-1">
                    {r.foto && <button onClick={() => setFotoSeleccionada(r)} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-colors" title="Ver Evidencia"><ImageIcon size={14} /></button>}
                    <button onClick={() => copiarReporteIndividual(r)} className="p-2 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-600 hover:text-white transition-colors" title="Copiar Este Reporte"><Copy size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResumenCard({ titulo, count, icon }) {
  return (
    <div className="bg-white p-3 rounded shadow-sm border-b-4 border-slate-200 flex justify-between items-center">
      <div><span className="text-[10px] font-bold text-slate-400 uppercase">{titulo}</span><div className="text-xl font-bold text-slate-800">{count}</div></div>{icon}
    </div>
  );
}
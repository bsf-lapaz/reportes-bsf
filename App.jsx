import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// --- TUS CREDENCIALES EXACTAS ---
const firebaseConfig = {
  apiKey: "AIzaSyBNK_3oIKzaH5M5IyMSyTg6wAAiWzE8cww",
  authDomain: "sistema-de-partes-bsf-lp.firebaseapp.com",
  projectId: "sistema-de-partes-bsf-lp",
  storageBucket: "sistema-de-partes-bsf-lp.firebasestorage.app",
  messagingSenderId: "503023878670",
  appId: "1:503023878670:web:af4ef9065a28fa6a5e725f",
  measurementId: "G-0GKMSNMB4Q"
};

// Inicialización mínima
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('Iniciando...');
  const [datosNube, setDatosNube] = useState([]);
  const [user, setUser] = useState(null);

  // Función para escribir en el registro (log) de pantalla
  const log = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  useEffect(() => {
    log("1. Iniciando sistema...");
    
    // Paso A: Autenticación
    signInAnonymously(auth)
      .then((userCred) => {
        log(`2. Autenticación EXITOSA. ID: ${userCred.user.uid}`);
        setUser(userCred.user);
        setStatus("Conectado y Listo");
      })
      .catch((error) => {
        log(`ERROR CRÍTICO AUTH: ${error.code} - ${error.message}`);
        setStatus("Fallo de Autenticación");
        alert("Error: No se pudo entrar. Revisa si 'Anónimo' está habilitado en Firebase.");
      });
  }, []);

  // Paso B: Escuchar la base de datos (Lectura)
  useEffect(() => {
    // Usamos una colección de prueba simple
    const q = collection(db, "prueba_conexion_bsf");
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      setDatosNube(docs);
      log(`4. Lectura de DB: ${docs.length} registros encontrados.`);
    }, (error) => {
      console.error(error);
      log(`ERROR CRÍTICO LECTURA: ${error.code}`);
      if (error.code === 'permission-denied') {
        alert("ALERTA: Google bloqueó la lectura. FALTAN PERMISOS EN 'RULES'.");
      }
    });

    return () => unsubscribe();
  }, []);

  // Paso C: Escribir (Guardar)
  const probarGuardado = async () => {
    if (!user) { alert("Espera a que se conecte el usuario."); return; }
    
    log("3. Intentando escribir en la nube...");
    try {
      await addDoc(collection(db, "prueba_conexion_bsf"), {
        mensaje: "Prueba Exitosa",
        fecha: new Date().toString(),
        timestamp: serverTimestamp(),
        autor: user.uid
      });
      log("¡ESCRITURA CONFIRMADA! Google aceptó el dato.");
      alert("¡FUNCIONA! El sistema guarda correctamente.");
    } catch (e) {
      console.error(e);
      log(`ERROR CRÍTICO ESCRITURA: ${e.code} - ${e.message}`);
      alert(`FALLO AL GUARDAR: ${e.code}. \nRevisa las Reglas de Firebase.`);
    }
  };

  return (
    <div className="p-6 font-mono text-sm bg-gray-100 min-h-screen">
      <h1 className="text-xl font-bold mb-4 text-blue-900">DIAGNÓSTICO TÉCNICO BSF</h1>
      
      <div className="bg-white p-4 rounded shadow mb-4 border-l-4 border-blue-500">
        <p className="mb-2"><strong>Estado:</strong> {status}</p>
        <button 
          onClick={probarGuardado}
          className="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700 shadow-lg active:scale-95 transition-transform"
        >
          PROBAR CONEXIÓN AHORA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PANEL DE LOGS (Lo que pasa internamente) */}
        <div className="bg-black text-green-400 p-4 rounded h-64 overflow-auto shadow-inner border border-gray-800">
          <h3 className="text-white border-b border-gray-700 mb-2 font-bold">REGISTRO DE EVENTOS (LOGS)</h3>
          {logs.length === 0 && <p className="opacity-50">Esperando eventos...</p>}
          {logs.map((l, i) => <div key={i} className="mb-1 border-b border-gray-900 pb-1">{l}</div>)}
        </div>

        {/* PANEL DE DATOS (Lo que hay en la nube) */}
        <div className="bg-white p-4 rounded h-64 overflow-auto shadow border border-gray-300">
          <h3 className="font-bold border-b mb-2 text-slate-700">DATOS EN LA NUBE ({datosNube.length})</h3>
          {datosNube.length === 0 ? <p className="text-gray-400 italic">La base de datos está vacía o no se puede leer.</p> : 
            datosNube.map((d, i) => (
              <div key={i} className="mb-2 p-2 bg-green-50 border border-green-200 text-xs rounded">
                <span className="font-bold text-green-700">✓ {d.mensaje}</span>
                <br/>
                <span className="text-gray-500">{d.fecha}</span>
              </div>
            ))
          }
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded">
        <strong>¿Qué debe pasar?</strong>
        <ul className="list-disc pl-5 mt-1">
           <li>Al entrar, en la caja negra debe decir "Autenticación EXITOSA".</li>
           <li>Al tocar el botón azul, debe decir "ESCRITURA CONFIRMADA".</li>
           <li>Inmediatamente después, debe aparecer un cuadrito verde a la derecha.</li>
        </ul>
        <p className="mt-2"><strong>Si sale letras rojas:</strong> Mándame una foto de lo que dice la caja negra.</p>
      </div>
    </div>
  );
}

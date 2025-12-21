import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// TUS CREDENCIALES EXACTAS
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

export default function App() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('Iniciando...');
  const [datos, setDatos] = useState([]);

  // Función para registrar pasos
  const addLog = (msg) => setLogs(prev => [`${new Date().toLocaleTimeString()} - ${msg}`, ...prev]);

  useEffect(() => {
    // 1. PRUEBA DE AUTENTICACIÓN
    addLog("Intentando autenticación anónima...");
    signInAnonymously(auth)
      .then((user) => {
        addLog(`✅ Autenticado correctamente. ID: ${user.user.uid}`);
        setStatus("Autenticado");
      })
      .catch((error) => {
        addLog(`❌ ERROR AUTH: ${error.code} - ${error.message}`);
        setStatus("Error de Auth");
      });
  }, []);

  useEffect(() => {
    // 2. PRUEBA DE LECTURA (Escuchar cambios)
    const q = collection(db, "test_conexion_simple");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
      setDatos(docs);
      addLog(`📡 Lectura recibida: ${docs.length} documentos encontrados.`);
    }, (error) => {
      addLog(`❌ ERROR LECTURA: ${error.code} - ${error.message}`);
      if (error.code === 'permission-denied') {
        alert("ALERTA CRÍTICA: Permiso denegado. Las reglas de Firebase están bloqueando la conexión.");
      }
    });
    return () => unsubscribe();
  }, []);

  const probarEscritura = async () => {
    addLog("Intentando escribir en la base de datos...");
    try {
      await addDoc(collection(db, "test_conexion_simple"), {
        mensaje: "Prueba de conexión",
        fecha: new Date().toString(),
        timestamp: serverTimestamp()
      });
      addLog("✅ ESCRITURA EXITOSA. El dato se envió a Google.");
      alert("¡ÉXITO! La conexión funciona. El problema era el código anterior.");
    } catch (e) {
      console.error(e);
      addLog(`❌ ERROR ESCRITURA: ${e.code} - ${e.message}`);
      alert(`FALLO: ${e.code}. \nRevisa las Reglas de Firebase.`);
    }
  };

  return (
    <div className="p-8 font-sans max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-blue-900">PRUEBA DE CONEXIÓN BSF</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-lg border-l-8 border-blue-600 mb-6">
        <p className="font-bold text-gray-700">Estado del Sistema: <span className="text-blue-600">{status}</span></p>
        <button 
          onClick={probarEscritura}
          className="mt-4 w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          PRESIONAR PARA PROBAR GUARDADO
        </button>
      </div>

      <div className="grid gap-6">
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto shadow-inner">
          <h3 className="text-white border-b border-gray-700 mb-2 font-bold sticky top-0 bg-black pb-1">BITÁCORA TÉCNICA (LOGS)</h3>
          {logs.length === 0 && <p className="opacity-50">Esperando acciones...</p>}
          {logs.map((l, i) => <div key={i} className="mb-1 border-b border-gray-900 pb-1">{l}</div>)}
        </div>

        <div className="bg-gray-100 p-4 rounded-lg h-64 overflow-y-auto border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-2 border-b pb-1">DATOS EN LA NUBE ({datos.length})</h3>
          {datos.length === 0 ? <p className="text-gray-400 italic text-sm">La base de datos está vacía o no se puede leer.</p> : 
            datos.map((d) => (
              <div key={d.id} className="mb-2 p-3 bg-white border-l-4 border-green-500 rounded shadow-sm text-sm">
                <span className="font-bold text-green-700">✓ {d.mensaje}</span>
                <br/>
                <span className="text-gray-500 text-xs">{d.fecha}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

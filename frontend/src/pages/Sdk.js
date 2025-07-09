import React, { useEffect, useRef, useState } from "react";
// import EZUIKit from "../lib/ezuikit-js/ezuikit.js"; // <-- Eliminado, ahora se usa window.EZUIKit
import axios from "axios";

// Asegúrate de tener en public/index.html:
// <script src="/lib/ezuikit-js/ezuikit.js"></script>

const defaultValues = {
  accessToken: "",
  deviceSerial: "",
  channelNo: 1,
  streamType: "live", // live o playback
  startTime: "", // formato: yyyyMMddTHHmmssZ
  endTime: "",   // formato: yyyyMMddTHHmmssZ
};

function SdkPage() {
  const [form, setForm] = useState(defaultValues);
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);
  const [appKey, setAppKey] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [playerStatus, setPlayerStatus] = useState("");
  const [diagnosticInfo, setDiagnosticInfo] = useState({});

  useEffect(() => {
    return () => {
      if (player && player.destroy) {
        try {
          player.destroy();
        } catch (error) {
          console.warn('Error destroying player:', error);
        }
      }
    };
  }, [player]);

  // Función para obtener información de diagnóstico
  const getDiagnosticInfo = () => {
    const info = {
      sdkLoaded: !!window.EZUIKit,
      userAgent: navigator.userAgent,
      webAssemblySupported: typeof WebAssembly !== 'undefined',
      canvasSupported: !!document.createElement('canvas').getContext,
      webGLSupported: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
          return false;
        }
      })(),
      apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000',
      timestamp: new Date().toISOString()
    };
    setDiagnosticInfo(info);
    return info;
  };

  useEffect(() => {
    getDiagnosticInfo();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  function buildUrl() {
    const { deviceSerial, channelNo, streamType, startTime, endTime } = form;
    let urlBase = verificationCode
      ? `ezopen://${verificationCode}@isaopen.ezviz.com/${deviceSerial}/${channelNo}`
      : `ezopen://isaopen.ezviz.com/${deviceSerial}/${channelNo}`;
    if (streamType === "live") {
      return `${urlBase}.live`;
    } else {
      if (!startTime || !endTime) return "";
      // Convertir formato de fecha si es necesario
      const formattedStartTime = startTime.replace(/[^\d]/g, '');
      const formattedEndTime = endTime.replace(/[^\d]/g, '');
      return `${urlBase}.rec?begin=${formattedStartTime}&end=${formattedEndTime}`;
    }
  }

  const validateInputs = () => {
    if (!form.accessToken) {
      setError("El AccessToken es requerido");
      return false;
    }
    if (!form.deviceSerial) {
      setError("El número de serie del dispositivo es requerido");
      return false;
    }
    if (!/^[A-Z0-9]+$/.test(form.deviceSerial)) {
      setError("El número de serie debe contener solo letras mayúsculas y números");
      return false;
    }
    if (form.channelNo < 1 || form.channelNo > 64) {
      setError("El número de canal debe estar entre 1 y 64");
      return false;
    }
    if (form.streamType === "playback") {
      if (!form.startTime || !form.endTime) {
        setError("Las fechas de inicio y fin son requeridas para playback");
        return false;
      }
      const start = new Date(form.startTime.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'));
      const end = new Date(form.endTime.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'));
      if (start >= end) {
        setError("La fecha de inicio debe ser anterior a la fecha de fin");
        return false;
      }
    }
    return true;
  };

  const handleInitPlayer = async (e) => {
    e.preventDefault();
    setError("");
    setPlayerStatus("Inicializando...");
    
    if (!validateInputs()) {
      setPlayerStatus("");
      return;
    }

    // Verificar que EZUIKit esté disponible
    if (!window.EZUIKit) {
      setError("Error: El SDK EZUIKit no está cargado. Verifica que el archivo ezuikit.js esté disponible.");
      setPlayerStatus("Error");
      return;
    }

    const url = buildUrl();
    setGeneratedUrl(url);
    
    if (!url) {
      setError("No se pudo construir la URL de reproducción");
      setPlayerStatus("");
      return;
    }

    setIsLoading(true);

    // Destruir player anterior si existe
    if (player && player.destroy) {
      try {
        player.destroy();
        setPlayer(null);
      } catch (error) {
        console.warn('Error destroying previous player:', error);
      }
    }

    // Limpiar contenedor de video
    if (videoRef.current) {
      videoRef.current.innerHTML = "";
    }

    try {
      setPlayerStatus("Creando reproductor...");
      // Usar window.EZUIKit en vez de import
      const EZUIKit = window.EZUIKit;
      
      // Configuración mejorada del reproductor
      const p = new EZUIKit.EZUIKitPlayer({
        id: "video-container",
        accessToken: form.accessToken,
        url,
        width: 600,
        height: 400,
        template: "simple",
        audio: true,
        decoderPath: "/lib/ezuikit-js/ezuikit_static/",
        env: { 
          domain: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/ezviz/proxy`,
          staticPath: "/lib/ezuikit-js/ezuikit_static"
        },
        // Configuraciones adicionales para mejorar la estabilidad
        autoPlay: false,
        decoderType: "auto",
        disableRenderPrivateData: true,
        streamInfoCBType: 1,
        iType: 2,
        iMaxSplit: 1,
        iCurrentSplit: 1,
        szBasePath: "",
        downloadRecord: true,
        oStyle: {
          border: "none",
          background: "#000000"
        },
        decodeEngine: 1,
        handleSuccess: () => {
          console.log("Reproducción iniciada exitosamente");
          setPlayerStatus("Reproduciendo");
          setError("");
        },
        handleError: (err) => {
          console.error("Error en el reproductor:", err);
          setPlayerStatus("Error");
          
          // Manejo específico de errores comunes
          if (err && err.type === 'handleRunTimeInfoError') {
            switch(err.data?.nErrorCode) {
              case 5:
                setError("Código de verificación incorrecto. Por favor, verifica el código de 6 dígitos de la cámara.");
                break;
              case 7:
                setError("El dispositivo está offline o no responde.");
                break;
              case 2009:
                setError("El dispositivo ha excedido el número máximo de conexiones.");
                break;
              case 2003:
                setError("Dispositivo offline. Verifica que la cámara esté conectada a internet.");
                break;
              case 2007:
                setError("Número de serie del dispositivo inválido.");
                break;
              default:
                setError(`Error del reproductor (${err.data?.nErrorCode}): ${err.data?.szErrorDescribe || err.message || 'Error desconocido'}`);
            }
          } else if (err && err.message) {
            if (err.message.includes('401')) {
              setError("Error de autenticación. Verifica que el AccessToken sea válido y no haya expirado.");
            } else if (err.message.includes('wasm')) {
              setError("Error al cargar WebAssembly. Intenta recargar la página o usar un navegador diferente.");
            } else if (err.message.includes('network')) {
              setError("Error de red. Verifica tu conexión a internet.");
            } else {
              setError(`Error: ${err.message}`);
            }
          } else {
            setError("Error desconocido en el reproductor. Verifica la consola del navegador para más detalles.");
          }
        }
      });

      setPlayer(p);
      setPlayerStatus("Conectando...");
    } catch (error) {
      console.error("Error al inicializar el reproductor:", error);
      setError(`Error al inicializar: ${error.message}`);
      setPlayerStatus("Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    
    if (!appKey || !appSecret) {
      setError("App Key y App Secret son requeridos");
      return;
    }

    setTokenLoading(true);
    setError("");
    
    try {
      const params = new URLSearchParams();
      params.append('appKey', appKey);
      params.append('appSecret', appSecret);
      
      const res = await axios.post(
        'https://isaopen.ezvizlife.com/api/lapp/token/get', // Endpoint para Sudamérica
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      if (res.data && res.data.data && res.data.data.accessToken) {
        setForm({ ...form, accessToken: res.data.data.accessToken });
        setError("");
        alert("AccessToken generado exitosamente!");
      } else {
        setError(`Error: ${res.data.msg || 'No se pudo obtener el AccessToken'}`);
      }
    } catch (err) {
      console.error("Error al obtener AccessToken:", err);
      if (err.response) {
        setError(`Error: ${err.response.data?.msg || err.response.statusText}`);
      } else {
        setError("Error de conexión. Verifica tu conexión a internet.");
      }
    } finally {
      setTokenLoading(false);
    }
  };

  const handleStop = () => {
    if (player && player.stop) {
      try {
        player.stop();
        setPlayerStatus("Detenido");
      } catch (error) {
        console.error("Error al detener:", error);
      }
    }
  };

  const handleCapture = () => {
    if (player && player.capturePicture) {
      try {
        player.capturePicture("captura_" + new Date().getTime());
      } catch (error) {
        console.error("Error al capturar:", error);
        setError("Error al capturar imagen");
      }
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Prueba SDK EZVIZ (Local)</h1>
      
      {/* Formulario para generar AccessToken */}
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-3">Generar AccessToken</h2>
        <form onSubmit={handleGenerateToken} className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">App Key: </label>
              <input
                type="text"
                value={appKey}
                onChange={e => setAppKey(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Tu App Key de EZVIZ"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">App Secret: </label>
              <input
                type="password"
                value={appSecret}
                onChange={e => setAppSecret(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Tu App Secret de EZVIZ"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            disabled={tokenLoading}
          >
            {tokenLoading ? "Generando..." : "Generar AccessToken"}
          </button>
        </form>
      </div>

      {/* Formulario principal */}
      <form onSubmit={handleInitPlayer} className="mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Código de Verificación (opcional): 
              <span className="text-xs text-gray-500 ml-1">6 dígitos de la etiqueta</span>
            </label>
            <input
              type="text"
              name="verificationCode"
              value={verificationCode}
              onChange={e => setVerificationCode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="123456"
              maxLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">AccessToken: </label>
            <input
              type="text"
              name="accessToken"
              value={form.accessToken}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="at.xxxxxx..."
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Device Serial: </label>
            <input
              type="text"
              name="deviceSerial"
              value={form.deviceSerial}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded uppercase"
              placeholder="ABCD1234"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Channel No: </label>
            <input
              type="number"
              name="channelNo"
              value={form.channelNo}
              onChange={handleChange}
              min={1}
              max={64}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de stream: </label>
            <select 
              name="streamType" 
              value={form.streamType} 
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="live">En vivo</option>
              <option value="playback">Playback (grabación)</option>
            </select>
          </div>
        </div>

        {form.streamType === "playback" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Fecha/Hora Inicio: 
                <span className="text-xs text-gray-500 ml-1">(yyyyMMddTHHmmssZ)</span>
              </label>
              <input
                type="text"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                placeholder="20240101T120000Z"
                className="w-full p-2 border border-gray-300 rounded"
                required={form.streamType === "playback"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Fecha/Hora Fin: 
                <span className="text-xs text-gray-500 ml-1">(yyyyMMddTHHmmssZ)</span>
              </label>
              <input
                type="text"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                placeholder="20240101T130000Z"
                className="w-full p-2 border border-gray-300 rounded"
                required={form.streamType === "playback"}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button 
            type="submit" 
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            disabled={isLoading}
          >
            {isLoading ? "Cargando..." : "Iniciar reproductor"}
          </button>
          <button 
            type="button"
            onClick={handleStop}
            className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600"
            disabled={!player}
          >
            Detener
          </button>
          <button 
            type="button"
            onClick={handleCapture}
            className="bg-purple-500 text-white px-6 py-2 rounded hover:bg-purple-600"
            disabled={!player || playerStatus !== "Reproduciendo"}
          >
            Capturar Imagen
          </button>
        </div>
      </form>

      {/* Mensajes de estado y error */}
      {playerStatus && (
        <div className={`mb-4 p-3 rounded ${
          playerStatus === "Reproduciendo" ? "bg-green-100 text-green-700" :
          playerStatus === "Error" ? "bg-red-100 text-red-700" :
          "bg-blue-100 text-blue-700"
        }`}>
          Estado: {playerStatus}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {generatedUrl && (
        <div className="bg-gray-100 p-3 rounded mb-4">
          <strong>URL generada:</strong> 
          <code className="block mt-1 text-xs break-all">{generatedUrl}</code>
        </div>
      )}

      {/* Contenedor del video */}
      <div
        id="video-container"
        ref={videoRef}
        className="w-full max-w-2xl h-96 bg-black rounded shadow-lg"
      ></div>

      {/* Información adicional */}
      <div className="mt-6 space-y-2 text-sm text-gray-600">
        <p>📍 Región: Sudamérica (isaopen.ezvizlife.com)</p>
        <p>📂 SDK local: <code>/lib/ezuikit-js/</code></p>
        <p>🔗 Enlaces útiles:</p>
        <ul className="ml-4 space-y-1">
          <li>
            <a href="https://github.com/Ezviz-OpenBiz/EZUIKit-JavaScript-npm" 
               target="_blank" 
               rel="noopener noreferrer" 
               className="text-blue-500 hover:underline">
              Repositorio del SDK
            </a>
          </li>
          <li>
            <a href="https://open.ys7.com/help/en/489" 
               target="_blank" 
               rel="noopener noreferrer" 
               className="text-blue-500 hover:underline">
              Documentación oficial
            </a>
          </li>
        </ul>
      </div>

      {/* Información de diagnóstico */}
      <div className="mt-6 bg-gray-50 p-4 rounded">
        <h3 className="text-lg font-semibold mb-3">Información de Diagnóstico</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>SDK Cargado:</strong> 
              <span className={diagnosticInfo.sdkLoaded ? "text-green-600" : "text-red-600"}>
                {diagnosticInfo.sdkLoaded ? " ✅ Sí" : " ❌ No"}
              </span>
            </p>
            <p><strong>WebAssembly:</strong> 
              <span className={diagnosticInfo.webAssemblySupported ? "text-green-600" : "text-red-600"}>
                {diagnosticInfo.webAssemblySupported ? " ✅ Soportado" : " ❌ No soportado"}
              </span>
            </p>
            <p><strong>Canvas:</strong> 
              <span className={diagnosticInfo.canvasSupported ? "text-green-600" : "text-red-600"}>
                {diagnosticInfo.canvasSupported ? " ✅ Soportado" : " ❌ No soportado"}
              </span>
            </p>
            <p><strong>WebGL:</strong> 
              <span className={diagnosticInfo.webGLSupported ? "text-green-600" : "text-red-600"}>
                {diagnosticInfo.webGLSupported ? " ✅ Soportado" : " ❌ No soportado"}
              </span>
            </p>
          </div>
          <div>
            <p><strong>API URL:</strong> <code className="text-xs">{diagnosticInfo.apiUrl}</code></p>
            <p><strong>Navegador:</strong> <span className="text-xs">{diagnosticInfo.userAgent?.split(' ')[0]}</span></p>
            <p><strong>Timestamp:</strong> <span className="text-xs">{diagnosticInfo.timestamp}</span></p>
          </div>
        </div>
        <button 
          onClick={getDiagnosticInfo}
          className="mt-3 bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
        >
          Actualizar Diagnóstico
        </button>
      </div>
    </div>
  );
}

export default SdkPage; 
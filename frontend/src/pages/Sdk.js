import React, { useEffect, useRef, useState } from "react";
import EZUIKit from "../lib/ezuikit-js/ezuikit.js";
import axios from "axios";

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
  const videoRef = useRef(null);
  const [appKey, setAppKey] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");

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
    // eslint-disable-next-line
  }, [player]);

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
      return `${urlBase}.rec?begin=${startTime}&end=${endTime}`;
    }
  }

  const handleInitPlayer = (e) => {
    e.preventDefault();
    setError("");
    if (!form.accessToken || !form.deviceSerial) {
      setError("Debes ingresar accessToken y deviceSerial");
      return;
    }
    if (form.streamType === "playback" && (!form.startTime || !form.endTime)) {
      setError("Debes ingresar startTime y endTime para playback");
      return;
    }
    const url = buildUrl();
    setGeneratedUrl(url);
    if (!url) {
      setError("Faltan datos para construir la URL de reproducción");
      return;
    }
    if (player && player.destroy) {
      try {
        player.destroy();
      } catch (error) {
        console.warn('Error destroying previous player:', error);
      }
    }
    if (videoRef.current) {
      try {
        videoRef.current.innerHTML = "";
      } catch (error) {
        console.warn('Error clearing video container:', error);
      }
    }
    const p = new EZUIKit.EZUIKitPlayer({
      id: "video-container",
      accessToken: form.accessToken,
      url,
      width: 600,
      height: 400,
      template: "simple",
      decoderPath: "/lib/ezuikit-js/",
      env: { 
        domain: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/ezviz/proxy`,
        staticPath: "/lib/ezuikit-js/ezuikit_static"
      },
    });
    setPlayer(p);
  };

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    setTokenLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.append('appKey', appKey);
      params.append('appSecret', appSecret);
      const res = await axios.post(
        'https://open.ezvizlife.com/api/lapp/token/get', // <--- ENDPOINT AMÉRICA/SUDAMÉRICA
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      if (res.data && res.data.data && res.data.data.accessToken) {
        setForm({ ...form, accessToken: res.data.data.accessToken });
      } else {
        setError("No se pudo obtener el AccessToken. Verifica tus credenciales.");
      }
    } catch (err) {
      setError("Error al obtener el AccessToken. Verifica tus credenciales.");
    }
    setTokenLoading(false);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Prueba SDK EZVIZ (Local)</h1>
      <form onSubmit={handleGenerateToken} className="mb-4 space-y-2">
        <div>
          <label className="block text-sm font-medium mb-1">App Key: </label>
          <input
            type="text"
            value={appKey}
            onChange={e => setAppKey(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">App Secret: </label>
          <input
            type="text"
            value={appSecret}
            onChange={e => setAppSecret(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          disabled={tokenLoading}
        >
          {tokenLoading ? "Generando..." : "Generar AccessToken"}
        </button>
      </form>
      <form onSubmit={handleInitPlayer} className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Verification Code (si tu cámara lo requiere): </label>
          <input
            type="text"
            name="verificationCode"
            value={verificationCode}
            onChange={e => setVerificationCode(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Código de la etiqueta de la cámara"
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
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Device Serial: </label>
          <input
            type="text"
            name="deviceSerial"
            value={form.deviceSerial}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded"
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
            max={16}
            className="w-20 p-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de stream: </label>
          <select 
            name="streamType" 
            value={form.streamType} 
            onChange={handleChange}
            className="p-2 border border-gray-300 rounded"
          >
            <option value="live">En vivo</option>
            <option value="playback">Playback (grabación)</option>
          </select>
        </div>
        {form.streamType === "playback" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time (yyyyMMddTHHmmssZ): </label>
              <input
                type="text"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                placeholder="20240601T120000Z"
                className="w-full p-2 border border-gray-300 rounded"
                required={form.streamType === "playback"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time (yyyyMMddTHHmmssZ): </label>
              <input
                type="text"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                placeholder="20240601T121000Z"
                className="w-full p-2 border border-gray-300 rounded"
                required={form.streamType === "playback"}
              />
            </div>
          </>
        )}
        <button 
          type="submit" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Iniciar reproductor
        </button>
      </form>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {generatedUrl && (
        <div className="mt-2 text-xs text-gray-500">
          <strong>URL generada:</strong> {generatedUrl}
        </div>
      )}
      <div
        id="video-container"
        ref={videoRef}
        className="w-full max-w-2xl h-96 bg-black rounded"
      ></div>
      <div className="mt-6 text-sm text-gray-600">
        <p>Usando la versión local del SDK desde <code>frontend/src/lib/ezuikit-js/</code></p>
        <p className="mt-2">
          <a href="https://github.com/Ezviz-OpenBiz/EZUIKit-JavaScript-npm" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Repositorio del SDK</a> | 
          <a href="https://open.ys7.com/help/en/489" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline"> Documentación oficial</a>
        </p>
      </div>
    </div>
  );
}

export default SdkPage; 
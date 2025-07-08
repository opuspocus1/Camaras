import React, { useEffect, useRef, useState } from "react";
import EZUIKit from "ezuikit-js";

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

  useEffect(() => {
    return () => {
      if (player && player.destroy) player.destroy();
    };
    // eslint-disable-next-line
  }, [player]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  function buildUrl() {
    const { deviceSerial, channelNo, streamType, startTime, endTime } = form;
    if (streamType === "live") {
      return `ezopen://open.ys7.com/${deviceSerial}/${channelNo}.live`;
    } else {
      if (!startTime || !endTime) return "";
      return `ezopen://open.ys7.com/${deviceSerial}/${channelNo}.rec?begin=${startTime}&end=${endTime}`;
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
    if (!url) {
      setError("Faltan datos para construir la URL de reproducción");
      return;
    }
    if (player && player.destroy) player.destroy();
    if (videoRef.current) videoRef.current.innerHTML = "";
    const p = new EZUIKit.EZUIKitPlayer({
      id: "video-container",
      accessToken: form.accessToken,
      url,
      width: 600,
      height: 400,
      template: "simple",
    });
    setPlayer(p);
  };

  return (
    <div>
      <h1>Prueba SDK EZVIZ (npm)</h1>
      <form onSubmit={handleInitPlayer} style={{ marginBottom: 20 }}>
        <div>
          <label>AccessToken: </label>
          <input
            type="text"
            name="accessToken"
            value={form.accessToken}
            onChange={handleChange}
            style={{ width: 300 }}
            required
          />
        </div>
        <div>
          <label>Device Serial: </label>
          <input
            type="text"
            name="deviceSerial"
            value={form.deviceSerial}
            onChange={handleChange}
            style={{ width: 200 }}
            required
          />
        </div>
        <div>
          <label>Channel No: </label>
          <input
            type="number"
            name="channelNo"
            value={form.channelNo}
            onChange={handleChange}
            min={1}
            max={16}
            style={{ width: 60 }}
          />
        </div>
        <div>
          <label>Tipo de stream: </label>
          <select name="streamType" value={form.streamType} onChange={handleChange}>
            <option value="live">En vivo</option>
            <option value="playback">Playback (grabación)</option>
          </select>
        </div>
        {form.streamType === "playback" && (
          <>
            <div>
              <label>Start Time (yyyyMMddTHHmmssZ): </label>
              <input
                type="text"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                placeholder="20240601T120000Z"
                style={{ width: 180 }}
                required={form.streamType === "playback"}
              />
            </div>
            <div>
              <label>End Time (yyyyMMddTHHmmssZ): </label>
              <input
                type="text"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                placeholder="20240601T121000Z"
                style={{ width: 180 }}
                required={form.streamType === "playback"}
              />
            </div>
          </>
        )}
        <button type="submit" style={{ marginTop: 10 }}>Iniciar reproductor</button>
      </form>
      {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
      <div
        id="video-container"
        ref={videoRef}
        style={{ width: 600, height: 400, background: "#000" }}
      ></div>
      <p style={{marginTop: 20}}>
        Usando la versión npm de <a href="https://github.com/Ezviz-OpenBiz/EZUIKit-JavaScript-npm" target="_blank" rel="noopener noreferrer">ezuikit-js</a>.<br/>
        Consulta la <a href="https://open.ys7.com/help/en/489" target="_blank" rel="noopener noreferrer">documentación oficial del SDK JS de EZVIZ</a> para más detalles.<br/>
        <a href="https://open.ys7.com/help/en/2034" target="_blank" rel="noopener noreferrer">Guía de integración</a> | 
        <a href="https://open.ys7.com/help/en/2035" target="_blank" rel="noopener noreferrer">API Reference</a> | 
        <a href="https://open.ys7.com/help/en/2037" target="_blank" rel="noopener noreferrer">Ejemplos</a> | 
        <a href="https://open.ys7.com/help/en/2038" target="_blank" rel="noopener noreferrer">FAQ</a>
      </p>
    </div>
  );
}

export default SdkPage; 
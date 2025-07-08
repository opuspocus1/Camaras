import React, { useEffect, useRef, useState } from "react";

function loadEZUIKitScript(callback) {
  if (window.EZUIKit) {
    callback();
    return;
  }
  const script = document.createElement("script");
  script.src = "https://open.ys7.com/sdk/js/ezopen/EZUIKit.js";
  script.onload = callback;
  document.body.appendChild(script);
}

const defaultValues = {
  accessToken: "",
  deviceSerial: "",
  channelNo: 1,
};

function SdkPage() {
  const [form, setForm] = useState(defaultValues);
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState("");
  const videoRef = useRef(null);

  useEffect(() => {
    // Limpia el reproductor al desmontar
    return () => {
      if (player && player.destroy) player.destroy();
    };
    // eslint-disable-next-line
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleInitPlayer = (e) => {
    e.preventDefault();
    setError("");
    if (!form.accessToken || !form.deviceSerial) {
      setError("Debes ingresar accessToken y deviceSerial");
      return;
    }
    loadEZUIKitScript(() => {
      if (player && player.destroy) player.destroy();
      // Limpia el contenedor
      if (videoRef.current) videoRef.current.innerHTML = "";
      // Crea el reproductor
      const p = window.EZUIKit.createPlayer({
        id: "video-container",
        accessToken: form.accessToken,
        url: `ezopen://open.ys7.com/${form.deviceSerial}/${form.channelNo}.live`,
        width: 600,
        height: 400,
        autoplay: true,
        template: "simple", // o "standard"
      });
      setPlayer(p);
    });
  };

  return (
    <div>
      <h1>Prueba SDK EZVIZ</h1>
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
        <button type="submit" style={{ marginTop: 10 }}>Iniciar reproductor</button>
      </form>
      {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
      <div
        id="video-container"
        ref={videoRef}
        style={{ width: 600, height: 400, background: "#000" }}
      ></div>
      <p style={{marginTop: 20}}>
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
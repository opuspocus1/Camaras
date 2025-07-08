import React, { useState } from 'react';
import axios from 'axios';
import flvjs from 'flv.js';

const Token = () => {
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deviceSerial, setDeviceSerial] = useState('');
  const [liveResult, setLiveResult] = useState(null);
  const [liveError, setLiveError] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [protocol, setProtocol] = useState('4'); // 4=FLV, 2=HLS, 3=RTMP
  const videoRef = React.useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams();
      params.append('appKey', appKey);
      params.append('appSecret', appSecret);
      const response = await axios.post(
        'https://open.ezvizlife.com/api/lapp/token/get',
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      if (response.data.code === '200') {
        setResult(response.data.data);
      } else {
        setError(response.data.msg || 'Error requesting token');
      }
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleLiveView = async (e) => {
    e.preventDefault();
    setLiveLoading(true);
    setLiveError(null);
    setLiveResult(null);
    try {
      if (!result?.accessToken || !result?.areaDomain) {
        setLiveError('Primero genera el token');
        setLiveLoading(false);
        return;
      }
      const params = new URLSearchParams();
      params.append('accessToken', result.accessToken);
      params.append('deviceSerial', deviceSerial);
      params.append('protocol', protocol);
      const response = await axios.post(
        `${result.areaDomain}/api/lapp/live/address/get`,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      if (response.data.code === '200') {
        setLiveResult(response.data.data);
      } else {
        setLiveError(response.data.msg || 'Error solicitando live view');
      }
    } catch (err) {
      setLiveError(err.response?.data?.msg || err.message || 'Unknown error');
    } finally {
      setLiveLoading(false);
    }
  };

  React.useEffect(() => {
    let player;
    const videoEl = videoRef.current;
    if (liveResult && liveResult.url && videoEl) {
      if (protocol === '4' && flvjs.isSupported()) {
        player = flvjs.createPlayer({ type: 'flv', url: liveResult.url });
        player.attachMediaElement(videoEl);
        player.load();
        player.play();
      } else if (protocol === '2') {
        videoEl.src = liveResult.url;
        videoEl.load();
        videoEl.play().catch(() => {});
      }
    }
    return () => {
      if (player) player.destroy();
      if (videoEl && protocol === '2') {
        videoEl.src = '';
      }
    };
  }, [liveResult, protocol]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6">EZVIZ Token Generator</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">App Key</label>
          <input
            type="text"
            value={appKey}
            onChange={e => setAppKey(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">App Secret</label>
          <input
            type="text"
            value={appSecret}
            onChange={e => setAppSecret(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={loading}
        >
          {loading ? 'Solicitando...' : 'Obtener Token'}
        </button>
      </form>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded w-full max-w-md mb-6">
          <div><strong>Access Token:</strong> <span className="break-all">{result.accessToken}</span></div>
          <div><strong>Expire Time:</strong> {new Date(result.expireTime).toLocaleString()}</div>
          <div><strong>Area Domain:</strong> {result.areaDomain}</div>
        </div>
      )}
      {/* Live View Section */}
      {result && (
        <form onSubmit={handleLiveView} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Device Serial</label>
            <input
              type="text"
              value={deviceSerial}
              onChange={e => setDeviceSerial(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Protocolo</label>
            <select
              value={protocol}
              onChange={e => setProtocol(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="4">FLV (Browser, flv.js)</option>
              <option value="2">HLS (Browser, nativo)</option>
              <option value="3">RTMP (solo URL)</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={liveLoading}
          >
            {liveLoading ? 'Solicitando...' : 'Obtener Live View'}
          </button>
        </form>
      )}
      {liveError && <div className="text-red-500 mb-4">{liveError}</div>}
      {liveResult && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded w-full max-w-md mb-6">
          <div><strong>URL:</strong> <span className="break-all">{liveResult.url}</span></div>
          <div><strong>Expire Time:</strong> {liveResult.expireTime}</div>
          <div><strong>Stream ID:</strong> {liveResult.id}</div>
        </div>
      )}
      {liveResult && protocol === '4' && (
        <div className="w-full max-w-md mb-6">
          <video
            ref={videoRef}
            controls
            autoPlay
            style={{ width: '100%', background: '#000', maxHeight: 360 }}
          />
        </div>
      )}
      {liveResult && protocol === '2' && (
        <div className="w-full max-w-md mb-6">
          <video
            ref={videoRef}
            controls
            autoPlay
            style={{ width: '100%', background: '#000', maxHeight: 360 }}
          />
        </div>
      )}
      {liveResult && protocol === '3' && (
        <div className="w-full max-w-md mb-6">
          <div className="text-yellow-700">RTMP solo puede verse en VLC, OBS, etc. Copia la URL:</div>
        </div>
      )}
    </div>
  );
};

export default Token; 
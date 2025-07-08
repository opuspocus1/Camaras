import React, { useState } from 'react';
import axios from 'axios';
import flvjs from 'flv.js';
import Hls from 'hls.js';

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
  const [playbackStart, setPlaybackStart] = useState('');
  const [playbackEnd, setPlaybackEnd] = useState('');
  const [recordings, setRecordings] = useState([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [recordingsError, setRecordingsError] = useState(null);
  const [playbackResult, setPlaybackResult] = useState(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);
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

  // Helper para convertir datetime-local a 'YYYY-MM-DD HH:mm:ss'
  function toEzvizDate(dt) {
    if (!dt) return '';
    return dt.replace('T', ' ') + ':00';
  }

  const handleQueryRecordings = async (e) => {
    e.preventDefault();
    setRecordingsLoading(true);
    setRecordingsError(null);
    setRecordings([]);
    try {
      if (!result?.accessToken || !result?.areaDomain) {
        setRecordingsError('Primero genera el token');
        setRecordingsLoading(false);
        return;
      }
      const params = new URLSearchParams();
      params.append('deviceSerial', deviceSerial);
      if (playbackStart) params.append('startTime', toEzvizDate(playbackStart));
      if (playbackEnd) params.append('endTime', toEzvizDate(playbackEnd));
      const response = await axios.get(
        `${result.areaDomain}/api/v3/das/device/local/video/query?${params.toString()}`,
        { headers: { accessToken: result.accessToken } }
      );
      if (response.data.meta?.code === 200) {
        setRecordings(response.data.data || []);
      } else {
        setRecordingsError(response.data.meta?.message || 'Error consultando grabaciones');
      }
    } catch (err) {
      setRecordingsError(err.response?.data?.meta?.message || err.message || 'Unknown error');
    } finally {
      setRecordingsLoading(false);
    }
  };

  const handlePlayback = async (rec) => {
    setPlaybackLoading(true);
    setPlaybackError(null);
    setPlaybackResult(null);
    try {
      if (!result?.accessToken || !result?.areaDomain) {
        setPlaybackError('Primero genera el token');
        setPlaybackLoading(false);
        return;
      }
      const params = new URLSearchParams();
      params.append('accessToken', result.accessToken);
      params.append('deviceSerial', deviceSerial);
      params.append('protocol', protocol);
      params.append('type', '2'); // playback
      params.append('startTime', rec.startTime.replace('T', ' '));
      params.append('endTime', rec.endTime.replace('T', ' '));
      const response = await axios.post(
        `${result.areaDomain}/api/lapp/live/address/get`,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      if (response.data.code === '200') {
        setPlaybackResult(response.data.data);
      } else {
        setPlaybackError(response.data.msg || 'Error solicitando playback');
      }
    } catch (err) {
      setPlaybackError(err.response?.data?.msg || err.message || 'Unknown error');
    } finally {
      setPlaybackLoading(false);
    }
  };

  React.useEffect(() => {
    let player;
    let hls;
    const videoEl = videoRef.current;
    if (liveResult && liveResult.url && videoEl) {
      if (protocol === '4' && flvjs.isSupported()) {
        player = flvjs.createPlayer({ type: 'flv', url: liveResult.url });
        player.attachMediaElement(videoEl);
        player.load();
        player.play();
      } else if (protocol === '2') {
        if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari soporta HLS nativamente
          videoEl.src = liveResult.url;
          videoEl.load();
          videoEl.play().catch(() => {});
        } else if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(liveResult.url);
          hls.attachMedia(videoEl);
          hls.on(Hls.Events.MANIFEST_PARSED, function () {
            videoEl.play().catch(() => {});
          });
        }
      }
    }
    return () => {
      if (player) player.destroy();
      if (hls) hls.destroy();
      if (videoEl && protocol === '2') {
        videoEl.src = '';
      }
    };
  }, [liveResult, protocol]);

  React.useEffect(() => {
    let player;
    let hls;
    const videoEl = videoRef.current;
    if (playbackResult && playbackResult.url && videoEl) {
      if (protocol === '4' && flvjs.isSupported()) {
        player = flvjs.createPlayer({ type: 'flv', url: playbackResult.url });
        player.attachMediaElement(videoEl);
        player.load();
        player.play();
      } else if (protocol === '2') {
        if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
          videoEl.src = playbackResult.url;
          videoEl.load();
          videoEl.play().catch(() => {});
        } else if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(playbackResult.url);
          hls.attachMedia(videoEl);
          hls.on(Hls.Events.MANIFEST_PARSED, function () {
            videoEl.play().catch(() => {});
          });
        }
      }
    }
    return () => {
      if (player) player.destroy();
      if (hls) hls.destroy();
      if (videoEl && protocol === '2') {
        videoEl.src = '';
      }
    };
  }, [playbackResult, protocol]);

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
      {/* Device Serial Input (compartido) */}
      {result && (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
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
        </div>
      )}
      {/* Live View Section */}
      {result && (
        <form onSubmit={handleLiveView} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
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
      {/* Playback Section */}
      {result && (
        <form onSubmit={handleQueryRecordings} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
          <h2 className="text-lg font-bold mb-4">Buscar grabaciones</h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Fecha/hora inicio</label>
            <input
              type="datetime-local"
              value={playbackStart}
              onChange={e => setPlaybackStart(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Fecha/hora fin</label>
            <input
              type="datetime-local"
              value={playbackEnd}
              onChange={e => setPlaybackEnd(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={recordingsLoading}
          >
            {recordingsLoading ? 'Buscando...' : 'Buscar grabaciones'}
          </button>
        </form>
      )}
      {recordingsError && <div className="text-red-500 mb-4">{recordingsError}</div>}
      {recordings.length > 0 && (
        <div className="w-full max-w-md mb-6">
          <h3 className="font-bold mb-2">Grabaciones encontradas:</h3>
          <ul className="divide-y divide-gray-300">
            {recordings.map((rec, idx) => (
              <li key={idx} className="py-2 flex flex-col md:flex-row md:items-center md:justify-between">
                <span>
                  <strong>Inicio:</strong> {rec.startTime} <br />
                  <strong>Fin:</strong> {rec.endTime}
                </span>
                <button
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded mt-2 md:mt-0"
                  onClick={() => handlePlayback(rec)}
                  disabled={playbackLoading}
                >
                  {playbackLoading ? 'Cargando...' : 'Reproducir'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {playbackError && <div className="text-red-500 mb-4">{playbackError}</div>}
      {playbackResult && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded w-full max-w-md mb-6">
          <div><strong>Playback URL:</strong> <span className="break-all">{playbackResult.url}</span></div>
          <div><strong>Expire Time:</strong> {playbackResult.expireTime}</div>
          <div><strong>Stream ID:</strong> {playbackResult.id}</div>
        </div>
      )}
      {playbackResult && (
        <div className="w-full max-w-md mb-6">
          <video
            ref={videoRef}
            controls
            autoPlay
            style={{ width: '100%', background: '#000', maxHeight: 360 }}
          />
        </div>
      )}
    </div>
  );
};

export default Token; 
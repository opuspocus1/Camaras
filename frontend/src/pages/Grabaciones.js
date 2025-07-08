import React, { useState } from 'react';
import axios from 'axios';

const Grabaciones = () => {
  const [deviceSerial, setDeviceSerial] = useState(() => localStorage.getItem('deviceSerial') || '');
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [playbackStart, setPlaybackStart] = useState('');
  const [playbackEnd, setPlaybackEnd] = useState('');
  const [recordings, setRecordings] = useState([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [recordingsError, setRecordingsError] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  // Guarda deviceSerial en localStorage al cambiar
  React.useEffect(() => {
    if (deviceSerial) {
      localStorage.setItem('deviceSerial', deviceSerial);
    }
  }, [deviceSerial]);

  const handleGetToken = async (e) => {
    e.preventDefault();
    setTokenLoading(true);
    setTokenError(null);
    setTokenData(null);
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
        setTokenData(response.data.data);
      } else {
        setTokenError(response.data.msg || 'Error solicitando token');
      }
    } catch (err) {
      setTokenError(err.response?.data?.msg || err.message || 'Unknown error');
    } finally {
      setTokenLoading(false);
    }
  };

  const handleQueryRecordings = async (e) => {
    e.preventDefault();
    if (!deviceSerial) {
      setRecordingsError('Debes ingresar el Device Serial.');
      return;
    }
    if (!tokenData?.accessToken || !tokenData?.areaDomain) {
      setRecordingsError('Primero debes obtener el token.');
      return;
    }
    if (!playbackStart || !playbackEnd) {
      setRecordingsError('Debes ingresar ambas fechas.');
      return;
    }
    if (playbackStart >= playbackEnd) {
      setRecordingsError('La fecha/hora de inicio debe ser menor que la de fin.');
      return;
    }
    setRecordingsLoading(true);
    setRecordingsError(null);
    setRecordings([]);
    try {
      const params = new URLSearchParams();
      params.append('startTime', playbackStart.replace('T', ' '));
      params.append('endTime', playbackEnd.replace('T', ' '));
      const response = await axios.get(
        `${tokenData.areaDomain}/api/v3/das/device/local/video/query?${params.toString()}`,
        { headers: { accessToken: tokenData.accessToken, deviceSerial: deviceSerial } }
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6">Buscar grabaciones</h1>
      <form onSubmit={handleGetToken} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
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
          disabled={tokenLoading}
        >
          {tokenLoading ? 'Solicitando...' : 'Obtener grabaciones'}
        </button>
      </form>
      {tokenError && <div className="text-red-500 mb-4">{tokenError}</div>}
      {tokenData && (
        <form onSubmit={handleQueryRecordings} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
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
            disabled={recordingsLoading || !deviceSerial}
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
              <li key={idx} className="py-2">
                <span>
                  <strong>Inicio:</strong> {rec.startTime} <br />
                  <strong>Fin:</strong> {rec.endTime}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Grabaciones; 
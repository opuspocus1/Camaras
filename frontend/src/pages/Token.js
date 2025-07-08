import React, { useState } from 'react';
import axios from 'axios';

const Token = () => {
  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded w-full max-w-md">
          <div><strong>Access Token:</strong> <span className="break-all">{result.accessToken}</span></div>
          <div><strong>Expire Time:</strong> {new Date(result.expireTime).toLocaleString()}</div>
          <div><strong>Area Domain:</strong> {result.areaDomain}</div>
        </div>
      )}
    </div>
  );
};

export default Token; 
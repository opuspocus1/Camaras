const express = require('express');
const { query, validationResult } = require('express-validator');
const Camera = require('../models/Camera');
const { authenticateToken } = require('../middleware/auth');
const { 
  getLiveStreamUrl, 
  getPlaybackStreamUrl, 
  queryLocalVideoRecords 
} = require('../services/ezvizService');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation rules
const streamValidation = [
  query('channelNo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Channel number must be a positive integer'),
  query('protocol')
    .optional()
    .isIn(['1', '2', '3', '4'])
    .withMessage('Protocol must be 1 (ezopen), 2 (hls), 3 (rtmp), or 4 (flv)')
];

const playbackValidation = [
  query('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    .withMessage('Start time must be in format: YYYY-MM-DD HH:mm:ss'),
  query('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    .withMessage('End time must be in format: YYYY-MM-DD HH:mm:ss'),
  query('channelNo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Channel number must be a positive integer'),
  query('protocol')
    .optional()
    .isIn(['1', '2', '3', '4'])
    .withMessage('Protocol must be 1 (ezopen), 2 (hls), 3 (rtmp), or 4 (flv)')
];

// Get live stream URL for a camera
router.get('/live/:deviceSerial', streamValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { deviceSerial } = req.params;
    const { channelNo = 1, protocol = 2 } = req.query;

    // Verify user owns this camera
    const camera = await Camera.findByUserAndSerial(req.user._id, deviceSerial);
    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found',
        code: 'CAMERA_NOT_FOUND'
      });
    }

    // Get live stream URL from EZVIZ
    const streamData = await getLiveStreamUrl(deviceSerial, parseInt(channelNo), parseInt(protocol));

    res.json({
      message: 'Live stream URL obtained successfully',
      data: {
        url: streamData.url,
        id: streamData.id,
        expireTime: streamData.expireTime,
        deviceSerial,
        channelNo: parseInt(channelNo),
        protocol: parseInt(protocol)
      }
    });

  } catch (error) {
    console.error('Get live stream error:', error);
    
    // Handle specific EZVIZ API errors
    if (error.message.includes('EZVIZ API error')) {
      const errorCode = error.message.match(/\((\d+)\)/)?.[1];
      
      switch (errorCode) {
        case '2003':
          return res.status(503).json({
            error: 'Device is offline',
            code: 'DEVICE_OFFLINE'
          });
        case '2007':
          return res.status(400).json({
            error: 'Invalid device serial number',
            code: 'INVALID_DEVICE_SERIAL'
          });
        case '2009':
          return res.status(408).json({
            error: 'Device request timeout',
            code: 'DEVICE_TIMEOUT'
          });
        case '2030':
          return res.status(400).json({
            error: 'Device does not support this function',
            code: 'DEVICE_NOT_SUPPORTED'
          });
        default:
          return res.status(500).json({
            error: 'EZVIZ API error',
            code: 'EZVIZ_API_ERROR',
            details: error.message
          });
      }
    }

    res.status(500).json({
      error: 'Failed to get live stream URL',
      code: 'LIVE_STREAM_ERROR'
    });
  }
});

// Get playback stream URL for a camera
router.get('/playback/:deviceSerial', playbackValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { deviceSerial } = req.params;
    const { startTime, endTime, channelNo = 1, protocol = 2 } = req.query;

    // Verify user owns this camera
    const camera = await Camera.findByUserAndSerial(req.user._id, deviceSerial);
    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found',
        code: 'CAMERA_NOT_FOUND'
      });
    }

    // Validate time range
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const now = new Date();

    if (startDate >= endDate) {
      return res.status(400).json({
        error: 'Start time must be before end time',
        code: 'INVALID_TIME_RANGE'
      });
    }

    if (endDate > now) {
      return res.status(400).json({
        error: 'End time cannot be in the future',
        code: 'FUTURE_END_TIME'
      });
    }

    // Get playback stream URL from EZVIZ
    const streamData = await getPlaybackStreamUrl(
      deviceSerial, 
      startTime, 
      endTime, 
      parseInt(channelNo), 
      parseInt(protocol)
    );

    res.json({
      message: 'Playback stream URL obtained successfully',
      data: {
        url: streamData.url,
        id: streamData.id,
        expireTime: streamData.expireTime,
        deviceSerial,
        startTime,
        endTime,
        channelNo: parseInt(channelNo),
        protocol: parseInt(protocol)
      }
    });

  } catch (error) {
    console.error('Get playback stream error:', error);
    
    // Handle specific EZVIZ API errors
    if (error.message.includes('EZVIZ API error')) {
      const errorCode = error.message.match(/\((\d+)\)/)?.[1];
      
      switch (errorCode) {
        case '2003':
          return res.status(503).json({
            error: 'Device is offline',
            code: 'DEVICE_OFFLINE'
          });
        case '2007':
          return res.status(400).json({
            error: 'Invalid device serial number',
            code: 'INVALID_DEVICE_SERIAL'
          });
        case '2009':
          return res.status(408).json({
            error: 'Device request timeout',
            code: 'DEVICE_TIMEOUT'
          });
        case '2030':
          return res.status(400).json({
            error: 'Device does not support this function',
            code: 'DEVICE_NOT_SUPPORTED'
          });
        default:
          return res.status(500).json({
            error: 'EZVIZ API error',
            code: 'EZVIZ_API_ERROR',
            details: error.message
          });
      }
    }

    res.status(500).json({
      error: 'Failed to get playback stream URL',
      code: 'PLAYBACK_STREAM_ERROR'
    });
  }
});

// Query local video records for a camera
router.get('/records/:deviceSerial', [
  query('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    .withMessage('Start time must be in format: YYYY-MM-DD HH:mm:ss'),
  query('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    .withMessage('End time must be in format: YYYY-MM-DD HH:mm:ss'),
  query('channelNo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Channel number must be a positive integer')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { deviceSerial } = req.params;
    const { startTime, endTime, channelNo = 1 } = req.query;

    // Verify user owns this camera
    const camera = await Camera.findByUserAndSerial(req.user._id, deviceSerial);
    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found',
        code: 'CAMERA_NOT_FOUND'
      });
    }

    // Query local video records from EZVIZ
    const records = await queryLocalVideoRecords(
      deviceSerial, 
      startTime, 
      endTime, 
      parseInt(channelNo)
    );

    res.json({
      message: 'Local video records queried successfully',
      data: {
        records,
        count: records.length,
        deviceSerial,
        startTime,
        endTime,
        channelNo: parseInt(channelNo)
      }
    });

  } catch (error) {
    console.error('Query records error:', error);
    
    // Handle specific EZVIZ API errors
    if (error.message.includes('EZVIZ API error')) {
      const errorCode = error.message.match(/\((\d+)\)/)?.[1];
      
      switch (errorCode) {
        case '2003':
          return res.status(503).json({
            error: 'Device is offline',
            code: 'DEVICE_OFFLINE'
          });
        case '2007':
          return res.status(400).json({
            error: 'Invalid device serial number',
            code: 'INVALID_DEVICE_SERIAL'
          });
        case '2009':
          return res.status(408).json({
            error: 'Device request timeout',
            code: 'DEVICE_TIMEOUT'
          });
        case '2030':
          return res.status(400).json({
            error: 'Device does not support this function',
            code: 'DEVICE_NOT_SUPPORTED'
          });
        default:
          return res.status(500).json({
            error: 'EZVIZ API error',
            code: 'EZVIZ_API_ERROR',
            details: error.message
          });
      }
    }

    res.status(500).json({
      error: 'Failed to query local video records',
      code: 'QUERY_RECORDS_ERROR'
    });
  }
});

// Get EZVIZ service status
router.get('/status', async (req, res) => {
  try {
    const { ezvizService } = require('../services/ezvizService');
    
    res.json({
      status: 'OK',
      hasToken: !!ezvizService.accessToken,
      expireTime: ezvizService.expireTime ? new Date(ezvizService.expireTime).toISOString() : null,
      areaDomain: ezvizService.areaDomain
    });
  } catch (error) {
    console.error('Get EZVIZ status error:', error);
    res.status(500).json({
      error: 'Failed to get EZVIZ status',
      code: 'STATUS_ERROR'
    });
  }
});

// Proxy para /api/lapp/*
const axios = require('axios');

// Configurar axios para mayor tolerancia con timeouts
const proxyAxios = axios.create({
  timeout: 30000, // 30 segundos
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// Manejador genérico de proxy para todas las rutas EZVIZ
async function handleEzvizProxy(req, res, basePath) {
  try {
    console.log(`=== INICIO PROXY EZVIZ ${basePath} ===`, req.method, req.originalUrl);
    const apiPath = req.originalUrl.replace(/^\/api\/ezviz\/proxy/, '');

    // Obtener accessToken de múltiples fuentes posibles
    let accessToken =
      req.body?.accessToken ||
      req.query?.accessToken ||
      req.headers?.accesstoken ||
      req.headers?.authorization ||
      (require('../services/ezvizService').ezvizService?.accessToken);

    console.log('EZVIZ Proxy Request:', {
      method: req.method,
      path: apiPath,
      hasToken: !!accessToken,
      query: req.query,
      bodyType: typeof req.body
    });

    if (!accessToken) {
      console.log(`=== FIN PROXY EZVIZ ${basePath} (401) ===`);
      return res.status(401).json({ 
        error: 'No EZVIZ accessToken available',
        code: 'NO_ACCESS_TOKEN'
      });
    }

    // Usar el dominio correcto para Sudamérica
    const baseDomain = require('../services/ezvizService').ezvizService?.areaDomain || 'https://isaopen.ezvizlife.com';
    const url = `${baseDomain}${apiPath}`;

    // Preparar headers
    const headers = { 
      'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
      'Accept': '*/*',
      'User-Agent': 'EZUIKit-JavaScript/8.1.12',
    };

    // Para peticiones desde el SDK, mantener algunos headers específicos
    if (req.headers['sdkversion']) {
      headers['sdkVersion'] = req.headers['sdkversion'];
    }

    // Preparar datos según el método
    let data = req.body;
    let params = { ...req.query };

    if (req.method === 'POST') {
      // Si es POST, agregar accessToken a los datos
      if (headers['Content-Type'].includes('application/x-www-form-urlencoded')) {
        const urlParams = new URLSearchParams();
        urlParams.append('accessToken', accessToken);
        
        if (typeof data === 'object' && data !== null) {
          Object.keys(data).forEach(key => {
            if (key !== 'accessToken') {
              urlParams.append(key, data[key]);
            }
          });
        } else if (typeof data === 'string') {
          // Si ya es string, parsearlo y agregar accessToken
          const existingParams = new URLSearchParams(data);
          existingParams.forEach((value, key) => {
            if (key !== 'accessToken') {
              urlParams.append(key, value);
            }
          });
        }
        
        data = urlParams.toString();
      } else if (headers['Content-Type'].includes('application/json')) {
        data = { ...data, accessToken };
      }
    } else if (req.method === 'GET') {
      // Si es GET, agregar accessToken a los params
      params.accessToken = accessToken;
    }

    console.log('EZVIZ Proxy Request Details:', {
      url,
      method: req.method,
      headers,
      dataPreview: typeof data === 'string' ? data.substring(0, 100) : data
    });

    // Realizar la petición al servidor EZVIZ
    const response = await proxyAxios({
      method: req.method,
      url,
      headers,
      data,
      params: req.method === 'GET' ? params : undefined,
      validateStatus: () => true, // Aceptar cualquier status
      responseType: 'arraybuffer' // Importante para manejar respuestas binarias
    });

    // Log de respuesta
    console.log('EZVIZ Proxy Response:', {
      status: response.status,
      contentType: response.headers['content-type'],
      dataLength: response.data.length
    });

    // Configurar headers de respuesta
    res.status(response.status);
    Object.keys(response.headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      // Evitar headers problemáticos
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
        res.set(key, response.headers[key]);
      }
    });

    // Enviar respuesta
    res.send(Buffer.from(response.data));
    console.log(`=== FIN PROXY EZVIZ ${basePath} ===`);
  } catch (error) {
    console.error('EZVIZ proxy error:', error.message);
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data?.toString?.()
      });
    }
    
    res.status(500).json({ 
      error: 'EZVIZ proxy error', 
      details: error.message,
      code: 'PROXY_ERROR'
    });
  }
}

// Rutas de proxy para diferentes endpoints EZVIZ
router.all('/proxy/api/lapp/*', (req, res) => handleEzvizProxy(req, res, 'LAPP'));
router.all('/proxy/api/service/*', (req, res) => handleEzvizProxy(req, res, 'SERVICE'));
router.all('/proxy/api/v3/*', (req, res) => handleEzvizProxy(req, res, 'V3'));
router.all('/proxy/*', (req, res) => handleEzvizProxy(req, res, 'GENERAL'));

module.exports = router; 
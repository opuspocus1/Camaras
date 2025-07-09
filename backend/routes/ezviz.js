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

router.all('/proxy/lapp/*', async (req, res) => {
  try {
    // Obtener el path a reenviar
    const lappPath = req.originalUrl.replace(/^\/api\/ezviz\/proxy/, '');
    // Obtener accessToken (ajustar según tu lógica)
    const accessToken = req.user?.ezvizAccessToken || (require('../services/ezvizService').ezvizService?.accessToken);
    if (!accessToken) {
      return res.status(401).json({ error: 'No EZVIZ accessToken available' });
    }
    // Construir la URL destino
    const baseDomain = require('../services/ezvizService').ezvizService?.areaDomain || 'https://open.ezvizlife.com';
    const url = `${baseDomain}${lappPath}`;
    // Preparar headers
    const headers = { ...req.headers, Host: undefined };
    // Forzar el token en el body si es necesario
    let data = req.body;
    if (req.method === 'POST' && data && typeof data === 'object' && !data.accessToken) {
      data = { ...data, accessToken };
    }
    // Hacer el request
    const response = await axios({
      method: req.method,
      url,
      headers,
      data,
      params: req.query,
      validateStatus: () => true // Devolver siempre la respuesta
    });
    res.status(response.status).set(response.headers).send(response.data);
  } catch (error) {
    console.error('EZVIZ proxy error:', error);
    res.status(500).json({ error: 'EZVIZ proxy error', details: error.message });
  }
});

module.exports = router; 
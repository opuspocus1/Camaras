const express = require('express');
const { body, validationResult } = require('express-validator');
const Camera = require('../models/Camera');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation rules
const cameraValidation = [
  body('deviceSerial')
    .isLength({ min: 1, max: 50 })
    .withMessage('Device serial must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Device serial can only contain letters and numbers'),
  body('deviceName')
    .isLength({ min: 1, max: 100 })
    .withMessage('Device name must be between 1 and 100 characters'),
  body('verificationCode')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Verification code cannot exceed 20 characters'),
  body('isEncrypted')
    .optional()
    .isBoolean()
    .withMessage('isEncrypted must be a boolean value')
];

// Get all cameras for the authenticated user
router.get('/', async (req, res) => {
  try {
    const cameras = await Camera.findByUser(req.user._id);
    
    res.json({
      cameras,
      count: cameras.length
    });
  } catch (error) {
    console.error('Get cameras error:', error);
    res.status(500).json({
      error: 'Failed to get cameras',
      code: 'GET_CAMERAS_ERROR'
    });
  }
});

// Get a specific camera by ID
router.get('/:id', async (req, res) => {
  try {
    const camera = await Camera.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found',
        code: 'CAMERA_NOT_FOUND'
      });
    }

    res.json({ camera });
  } catch (error) {
    console.error('Get camera error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid camera ID',
        code: 'INVALID_CAMERA_ID'
      });
    }

    res.status(500).json({
      error: 'Failed to get camera',
      code: 'GET_CAMERA_ERROR'
    });
  }
});

// Add a new camera
router.post('/', cameraValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { deviceSerial, deviceName, verificationCode, isEncrypted } = req.body;

    // Check if camera already exists for this user
    const existingCamera = await Camera.findByUserAndSerial(req.user._id, deviceSerial);
    if (existingCamera) {
      return res.status(400).json({
        error: 'Camera already exists',
        code: 'CAMERA_EXISTS'
      });
    }

    // Create new camera
    const camera = new Camera({
      user: req.user._id,
      deviceSerial,
      deviceName,
      verificationCode,
      isEncrypted: isEncrypted || false
    });

    await camera.save();

    res.status(201).json({
      message: 'Camera added successfully',
      camera
    });

  } catch (error) {
    console.error('Add camera error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Camera already exists',
        code: 'CAMERA_EXISTS'
      });
    }

    res.status(500).json({
      error: 'Failed to add camera',
      code: 'ADD_CAMERA_ERROR'
    });
  }
});

// Update a camera
router.put('/:id', cameraValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { deviceName, verificationCode, isEncrypted } = req.body;

    // Find camera and ensure it belongs to the user
    const camera = await Camera.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found',
        code: 'CAMERA_NOT_FOUND'
      });
    }

    // Update camera fields
    if (deviceName !== undefined) camera.deviceName = deviceName;
    if (verificationCode !== undefined) camera.verificationCode = verificationCode;
    if (isEncrypted !== undefined) camera.isEncrypted = isEncrypted;

    await camera.save();

    res.json({
      message: 'Camera updated successfully',
      camera
    });

  } catch (error) {
    console.error('Update camera error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid camera ID',
        code: 'INVALID_CAMERA_ID'
      });
    }

    res.status(500).json({
      error: 'Failed to update camera',
      code: 'UPDATE_CAMERA_ERROR'
    });
  }
});

// Delete a camera (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    // Find camera and ensure it belongs to the user
    const camera = await Camera.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!camera) {
      return res.status(404).json({
        error: 'Camera not found',
        code: 'CAMERA_NOT_FOUND'
      });
    }

    // Soft delete by setting isActive to false
    camera.isActive = false;
    await camera.save();

    res.json({
      message: 'Camera deleted successfully'
    });

  } catch (error) {
    console.error('Delete camera error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid camera ID',
        code: 'INVALID_CAMERA_ID'
      });
    }

    res.status(500).json({
      error: 'Failed to delete camera',
      code: 'DELETE_CAMERA_ERROR'
    });
  }
});

// Get camera statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalCameras = await Camera.countDocuments({
      user: req.user._id,
      isActive: true
    });

    const encryptedCameras = await Camera.countDocuments({
      user: req.user._id,
      isActive: true,
      isEncrypted: true
    });

    const unencryptedCameras = totalCameras - encryptedCameras;

    res.json({
      total: totalCameras,
      encrypted: encryptedCameras,
      unencrypted: unencryptedCameras
    });

  } catch (error) {
    console.error('Get camera stats error:', error);
    res.status(500).json({
      error: 'Failed to get camera statistics',
      code: 'GET_STATS_ERROR'
    });
  }
});

module.exports = router; 
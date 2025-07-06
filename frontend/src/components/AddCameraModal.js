import React, { useState } from 'react';
import { FaTimes, FaVideo, FaShieldAlt } from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';

const AddCameraModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    deviceSerial: '',
    deviceName: '',
    verificationCode: '',
    isEncrypted: false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.deviceSerial) {
      newErrors.deviceSerial = 'Device serial is required';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.deviceSerial)) {
      newErrors.deviceSerial = 'Device serial can only contain letters and numbers';
    }

    if (!formData.deviceName) {
      newErrors.deviceName = 'Device name is required';
    }

    if (formData.isEncrypted && !formData.verificationCode) {
      newErrors.verificationCode = 'Verification code is required for encrypted cameras';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      await onAdd(formData);
    } catch (error) {
      console.error('Add camera error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <FaVideo className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Add New Camera
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Device Serial */}
          <div className="form-group">
            <label htmlFor="deviceSerial" className="form-label">
              Device Serial Number *
            </label>
            <input
              id="deviceSerial"
              name="deviceSerial"
              type="text"
              required
              className={`input-field ${errors.deviceSerial ? 'border-red-500' : ''}`}
              placeholder="Enter device serial number"
              value={formData.deviceSerial}
              onChange={handleChange}
            />
            {errors.deviceSerial && (
              <p className="form-error">{errors.deviceSerial}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Found on the device label or in the EZVIZ app
            </p>
          </div>

          {/* Device Name */}
          <div className="form-group">
            <label htmlFor="deviceName" className="form-label">
              Device Name *
            </label>
            <input
              id="deviceName"
              name="deviceName"
              type="text"
              required
              className={`input-field ${errors.deviceName ? 'border-red-500' : ''}`}
              placeholder="Enter a name for this camera"
              value={formData.deviceName}
              onChange={handleChange}
            />
            {errors.deviceName && (
              <p className="form-error">{errors.deviceName}</p>
            )}
          </div>

          {/* Encryption Toggle */}
          <div className="form-group">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="isEncrypted"
                checked={formData.isEncrypted}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <FaShieldAlt className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-medium text-gray-700">
                Camera is encrypted
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Check this if your camera has video encryption enabled
            </p>
          </div>

          {/* Verification Code (only if encrypted) */}
          {formData.isEncrypted && (
            <div className="form-group">
              <label htmlFor="verificationCode" className="form-label">
                Verification Code *
              </label>
              <input
                id="verificationCode"
                name="verificationCode"
                type="text"
                className={`input-field ${errors.verificationCode ? 'border-red-500' : ''}`}
                placeholder="Enter verification code"
                value={formData.verificationCode}
                onChange={handleChange}
              />
              {errors.verificationCode && (
                <p className="form-error">{errors.verificationCode}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Found on the device label (6-character code)
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <FaVideo className="h-4 w-4" />
                  <span>Add Camera</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCameraModal; 
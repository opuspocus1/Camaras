import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaPlus, 
  FaVideo, 
  FaPlay, 
  FaHistory, 
  FaEdit, 
  FaTrash,
  FaShieldAlt,
  FaCircle
} from 'react-icons/fa';
import LoadingSpinner from '../components/LoadingSpinner';
import AddCameraModal from '../components/AddCameraModal';
import EditCameraModal from '../components/EditCameraModal';
import { API_ENDPOINTS } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    encrypted: 0,
    unencrypted: 0
  });

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      fetchCameras();
      fetchStats();
    }
  }, [authLoading, user]);

  const fetchCameras = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.CAMERAS);
      setCameras(response.data.cameras);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      toast.error('Failed to load cameras');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.CAMERAS + '/stats/summary');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddCamera = async (cameraData) => {
    try {
      const response = await axios.post(API_ENDPOINTS.CAMERAS, cameraData);
      setCameras(prev => [response.data.camera, ...prev]);
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        [cameraData.isEncrypted ? 'encrypted' : 'unencrypted']: 
          prev[cameraData.isEncrypted ? 'encrypted' : 'unencrypted'] + 1
      }));
      toast.success('Camera added successfully');
      setShowAddModal(false);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to add camera';
      toast.error(message);
    }
  };

  const handleEditCamera = async (cameraData) => {
    try {
      const response = await axios.put(API_ENDPOINTS.CAMERA_BY_ID(selectedCamera._id), cameraData);
      setCameras(prev => 
        prev.map(cam => 
          cam._id === selectedCamera._id ? response.data.camera : cam
        )
      );
      toast.success('Camera updated successfully');
      setShowEditModal(false);
      setSelectedCamera(null);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update camera';
      toast.error(message);
    }
  };

  const handleDeleteCamera = async (cameraId) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) {
      return;
    }

    try {
      await axios.delete(API_ENDPOINTS.CAMERA_BY_ID(cameraId));
      setCameras(prev => prev.filter(cam => cam._id !== cameraId));
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        encrypted: prev.encrypted - (cameras.find(c => c._id === cameraId)?.isEncrypted ? 1 : 0),
        unencrypted: prev.unencrypted - (cameras.find(c => c._id === cameraId)?.isEncrypted ? 0 : 1)
      }));
      toast.success('Camera deleted successfully');
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete camera';
      toast.error(message);
    }
  };

  const openEditModal = (camera) => {
    setSelectedCamera(camera);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Camera Dashboard
        </h1>
        <p className="text-gray-600">
          Manage and monitor your EZVIZ cameras
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-100 text-primary-600">
              <FaVideo className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Cameras</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <FaShieldAlt className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Encrypted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.encrypted}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <FaVideo className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unencrypted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unencrypted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Camera Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <FaPlus className="h-4 w-4" />
          <span>Add Camera</span>
        </button>
      </div>

      {/* Cameras Grid */}
      {(Array.isArray(cameras) ? cameras.length : 0) === 0 ? (
        <div className="card text-center py-12">
          <FaVideo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No cameras yet
          </h3>
          <p className="text-gray-600 mb-6">
            Get started by adding your first EZVIZ camera
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Add Your First Camera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(cameras) ? cameras : []).map((camera) => (
            <div key={camera._id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FaVideo className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {camera.deviceName}
                  </h3>
                </div>
                <div className="flex items-center space-x-1">
                  {camera.isEncrypted && (
                    <span className="status-encrypted">
                      <FaShieldAlt className="h-3 w-3 mr-1" />
                      Encrypted
                    </span>
                  )}
                  <FaCircle className="h-2 w-2 text-green-500" />
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Serial:</span> {camera.deviceSerial}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Added:</span>{' '}
                  {new Date(camera.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex space-x-2 mb-4">
                <Link
                  to={`/live/${camera.deviceSerial}`}
                  className="btn-primary flex-1 flex items-center justify-center space-x-2"
                >
                  <FaPlay className="h-3 w-3" />
                  <span>Live View</span>
                </Link>
                <Link
                  to={`/playback/${camera.deviceSerial}`}
                  className="btn-secondary flex-1 flex items-center justify-center space-x-2"
                >
                  <FaHistory className="h-3 w-3" />
                  <span>Recordings</span>
                </Link>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(camera)}
                  className="btn-secondary flex-1 flex items-center justify-center space-x-2"
                >
                  <FaEdit className="h-3 w-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteCamera(camera._id)}
                  className="btn-danger flex-1 flex items-center justify-center space-x-2"
                >
                  <FaTrash className="h-3 w-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddCameraModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddCamera}
        />
      )}

      {showEditModal && selectedCamera && (
        <EditCameraModal
          camera={selectedCamera}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCamera(null);
          }}
          onEdit={handleEditCamera}
        />
      )}
    </div>
  );
};

export default Dashboard; 
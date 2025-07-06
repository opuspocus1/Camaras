import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Hls from 'hls.js';
import { format, subDays } from 'date-fns';
import { 
  FaArrowLeft, 
  FaPlay, 
  FaPause, 
  FaExpand, 
  FaCompress,
  FaVolumeUp,
  FaVolumeMute,
  FaClock,
  FaSearch,
  FaHistory
} from 'react-icons/fa';
import LoadingSpinner from '../components/LoadingSpinner';

const PlaybackView = () => {
  const { deviceSerial } = useParams();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [cameraInfo, setCameraInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    startTime: '00:00:00',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: '23:59:59'
  });

  useEffect(() => {
    fetchCameraInfo();
    fetchRecords();
    
    // Auto-hide controls after 3 seconds
    const controlsTimer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      clearTimeout(controlsTimer);
      destroyHls();
    };
  }, [deviceSerial, fetchCameraInfo, fetchRecords]);

  const fetchCameraInfo = async () => {
    try {
      const response = await axios.get('/api/cameras');
      const camera = response.data.cameras.find(cam => cam.deviceSerial === deviceSerial);
      if (camera) {
        setCameraInfo(camera);
      }
    } catch (error) {
      console.error('Error fetching camera info:', error);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const startTime = `${dateRange.startDate} ${dateRange.startTime}`;
      const endTime = `${dateRange.endDate} ${dateRange.endTime}`;
      
      const response = await axios.get(`/api/ezviz/records/${deviceSerial}`, {
        params: { startTime, endTime }
      });
      
      setRecords(response.data.data.records || []);
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaybackStream = async (startTime, endTime) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/ezviz/playback/${deviceSerial}`, {
        params: { startTime, endTime, protocol: 2 }
      });
      
      initializeHls(response.data.data.url);
    } catch (error) {
      console.error('Error fetching playback stream:', error);
      const message = error.response?.data?.error || 'Failed to load playback stream';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const initializeHls = (url) => {
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        backBufferLength: 90
      });
      
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsPlaying(true);
        videoRef.current.play().catch(console.error);
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          toast.error('Video stream error. Please try again.');
        }
      });
      
      hlsRef.current = hls;
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoRef.current.src = url;
      videoRef.current.addEventListener('loadedmetadata', () => {
        setIsPlaying(true);
        videoRef.current.play().catch(console.error);
      });
    }
  };

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  const handleRecordSelect = (record) => {
    setSelectedRecord(record);
    const startTime = record.startTime.replace('T', ' ').substring(0, 19);
    const endTime = record.endTime.replace('T', ' ').substring(0, 19);
    fetchPlaybackStream(startTime, endTime);
  };

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = () => {
    fetchRecords();
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleVideoClick = () => {
    togglePlayPause();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors duration-200"
          >
            <FaArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          {cameraInfo && (
            <div className="text-white text-center">
              <h1 className="text-lg font-semibold">{cameraInfo.deviceName}</h1>
              <p className="text-sm text-gray-300">{deviceSerial}</p>
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-white">
            <FaHistory className="h-4 w-4" />
            <span className="text-sm">RECORDINGS</span>
          </div>
        </div>
      </div>

      <div className="flex h-screen pt-16">
        {/* Sidebar - Recordings List */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Date Range Selector */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold mb-3">Select Date Range</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleDateRangeChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-1">Start Time</label>
                <input
                  type="time"
                  name="startTime"
                  value={dateRange.startTime}
                  onChange={handleDateRangeChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateRangeChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-1">End Time</label>
                <input
                  type="time"
                  name="endTime"
                  value={dateRange.endTime}
                  onChange={handleDateRangeChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <FaSearch className="h-4 w-4" />
                )}
                <span>Search Recordings</span>
              </button>
            </div>
          </div>

          {/* Recordings List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-white font-semibold mb-3">Recordings</h3>
              
              {records.length === 0 ? (
                <div className="text-center py-8">
                  <FaHistory className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">No recordings found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {records.map((record, index) => (
                    <div
                      key={index}
                      onClick={() => handleRecordSelect(record)}
                      className={`p-3 rounded cursor-pointer transition-colors duration-200 ${
                        selectedRecord === record
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <FaClock className="h-3 w-3" />
                        <span className="text-sm font-medium">
                          {format(new Date(record.startTime), 'HH:mm')} - {format(new Date(record.endTime), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs opacity-75">
                        {format(new Date(record.startTime), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-xs opacity-75">
                        Type: {record.type}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 flex items-center justify-center">
          {!selectedRecord ? (
            <div className="text-center">
              <FaHistory className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Select a Recording</h2>
              <p className="text-gray-400">Choose a recording from the list to start playback</p>
            </div>
          ) : (
            <div 
              className="relative w-full h-full flex items-center justify-center"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setShowControls(false)}
            >
              <div className="video-container max-w-4xl w-full mx-4">
                <video
                  ref={videoRef}
                  className="video-player"
                  onClick={handleVideoClick}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                {/* Video Controls Overlay */}
                {showControls && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={togglePlayPause}
                        className="text-white hover:text-gray-300 transition-colors duration-200"
                      >
                        {isPlaying ? (
                          <FaPause className="h-6 w-6" />
                        ) : (
                          <FaPlay className="h-6 w-6" />
                        )}
                      </button>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={toggleMute}
                          className="text-white hover:text-gray-300 transition-colors duration-200"
                        >
                          {isMuted ? (
                            <FaVolumeMute className="h-4 w-4" />
                          ) : (
                            <FaVolumeUp className="h-4 w-4" />
                          )}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <button
                        onClick={toggleFullscreen}
                        className="text-white hover:text-gray-300 transition-colors duration-200"
                      >
                        {isFullscreen ? (
                          <FaCompress className="h-4 w-4" />
                        ) : (
                          <FaExpand className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading Overlay */}
                {loading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      <LoadingSpinner size="xl" className="mb-4" />
                      <p className="text-white">Loading recording...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-20 right-4 bg-red-600 text-white p-4 rounded max-w-sm">
          <h3 className="font-semibold mb-1">Error</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default PlaybackView; 
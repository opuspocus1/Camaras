import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Hls from 'hls.js';
import { 
  FaArrowLeft, 
  FaPlay, 
  FaPause, 
  FaExpand, 
  FaCompress,
  FaVolumeUp,
  FaVolumeMute,
  FaCircle
} from 'react-icons/fa';
import LoadingSpinner from '../components/LoadingSpinner';

const LiveView = () => {
  const { deviceSerial } = useParams();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [cameraInfo, setCameraInfo] = useState(null);

  useEffect(() => {
    fetchCameraInfo();
    fetchLiveStream();
    
    // Auto-hide controls after 3 seconds
    const controlsTimer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      clearTimeout(controlsTimer);
      destroyHls();
    };
  }, [deviceSerial, fetchCameraInfo, fetchLiveStream]);

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

  const fetchLiveStream = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/ezviz/live/${deviceSerial}?protocol=2`);
      setStreamData(response.data.data);
      
      // Initialize HLS player
      initializeHls(response.data.data.url);
    } catch (error) {
      console.error('Error fetching live stream:', error);
      const message = error.response?.data?.error || 'Failed to load live stream';
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
        lowLatencyMode: true,
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
    // Auto-hide controls after 3 seconds
    setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleVideoClick = () => {
    togglePlayPause();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mb-4" />
          <p className="text-white">Loading live stream...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Stream Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={fetchLiveStream}
              className="btn-primary"
            >
              Try Again
            </button>
            <Link to="/" className="btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <FaCircle className="h-2 w-2 text-green-500 animate-pulse" />
            <span className="text-sm">LIVE</span>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div 
        className="relative w-full h-screen flex items-center justify-center"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowControls(false)}
      >
        <div className="video-container max-w-6xl w-full mx-4">
          <video
            ref={videoRef}
            className="video-player"
            onClick={handleVideoClick}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={() => setIsPlaying(true)}
          />
          
          {/* Video Controls Overlay */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                {/* Play/Pause Button */}
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

                {/* Volume Controls */}
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

                {/* Fullscreen Button */}
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
                <p className="text-white">Connecting to camera...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stream Info */}
      {streamData && (
        <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded text-xs">
          <p>Stream ID: {streamData.id}</p>
          <p>Expires: {new Date(streamData.expireTime).toLocaleTimeString()}</p>
        </div>
      )}
    </div>
  );
};

export default LiveView; 
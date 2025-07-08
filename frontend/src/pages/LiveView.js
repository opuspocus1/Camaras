import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Hls from 'hls.js';
import flvjs from 'flv.js';
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
import { API_ENDPOINTS } from '../config/api';

const LiveView = () => {
  const { deviceSerial } = useParams();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const flvRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [cameraInfo, setCameraInfo] = useState(null);

  const fetchCameraInfo = useCallback(async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.CAMERAS);
      const camera = response.data.cameras.find(cam => cam.deviceSerial === deviceSerial);
      if (camera) {
        setCameraInfo(camera);
      }
    } catch (error) {
      console.error('Error fetching camera info:', error);
    }
  }, [deviceSerial]);

  // 1. Define initializeHls primero y envuélvelo en useCallback
  const initializeHls = useCallback((url) => {
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      hls.loadSource(url);
      hls.attachMediaElement(videoRef.current);
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
      videoRef.current.src = url;
      videoRef.current.addEventListener('loadedmetadata', () => {
        setIsPlaying(true);
        videoRef.current.play().catch(console.error);
      });
    }
  }, []);

  // 2. Define initializeFlv después y usa el ref para reconexión
  const initializeFlv = useCallback((url) => {
    if (flvjs.isSupported() && videoRef.current) {
      const flvPlayer = flvjs.createPlayer({ type: 'flv', url });
      flvPlayer.attachMediaElement(videoRef.current);
      flvPlayer.load();
      flvPlayer.play();
      flvPlayer.on(flvjs.Events.ERROR, () => {
        setTimeout(() => {
          fetchLiveStreamRef.current();
        }, 1000);
      });
      flvRef.current = flvPlayer;
    }
  }, []);

  // Elimina initializeStream porque ya no se usa

  // 1. Define fetchLiveStream primero
  const fetchLiveStream = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Cambia protocol=2 por protocol=4 para pedir FLV
      const response = await axios.get(`${API_ENDPOINTS.LIVE_STREAM}/${deviceSerial}?protocol=4`);
      setStreamData(response.data.data);
      // Quita initializeStream aquí
    } catch (error) {
      console.error('Error fetching live stream:', error);
      const message = error.response?.data?.error || 'Failed to load live stream';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [deviceSerial]);

  // 2. Usa un ref para evitar dependencia circular
  const fetchLiveStreamRef = useRef(fetchLiveStream);
  useEffect(() => {
    fetchLiveStreamRef.current = fetchLiveStream;
  }, [fetchLiveStream]);

  // Efecto para inicializar el stream solo cuando la URL cambia y el videoRef está listo
  useEffect(() => {
    if (!streamData || !streamData.url || !videoRef.current) return;
    console.log('Inicializando stream con URL:', streamData.url);
    destroyHls();
    destroyFlv();
    if (streamData.url.endsWith('.m3u8')) {
      initializeHls(streamData.url);
    } else if (streamData.url.endsWith('.flv')) {
      initializeFlv(streamData.url);
    }
    // eslint-disable-next-line
  }, [streamData?.url, videoRef.current]);

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
      destroyFlv();
    };
  }, [deviceSerial, fetchCameraInfo, fetchLiveStream]);

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  const destroyFlv = () => {
    if (flvRef.current) {
      flvRef.current.destroy();
      flvRef.current = null;
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

  // EZVIZ FLV directo para pruebas (reemplaza con el tuyo si cambia)
  const FLV_DIRECTO = "https://vtmforsa.ezvizlife.com:9188/v3/openlive/BC0314517_1_1.flv?expire=1814151486&id=862648736637739008&c=e7bdc2df4c&t=cb3c99585cd99487e440d557cdf8844a292aa700e062b6f1797d4e3a9f82a161&ev=100";

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
        {/* Botón de prueba FLV directo solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {
                setStreamData({ url: FLV_DIRECTO });
                initializeFlv(FLV_DIRECTO);
                setError(null);
                setLoading(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
            >
              Probar FLV Directo
            </button>
          </div>
        )}
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
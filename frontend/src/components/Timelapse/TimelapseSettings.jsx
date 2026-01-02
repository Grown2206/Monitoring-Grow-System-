import React, { useState } from 'react';
import { Settings, Camera, Film, Trash2, Clock, HardDrive, Play, Calendar } from 'lucide-react';
import api from '../../services/api';

/**
 * Timelapse Settings
 * Konfiguration und Video-Generierung
 */
const TimelapseSettings = () => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);

  // Video Generation Form
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    fps: 30,
    resolution: '1920x1080',
    format: 'mp4',
    codec: 'h264'
  });

  // Capture Settings
  const [captureSettings, setCaptureSettings] = useState({
    autoCapture: false,
    interval: '10', // minutes
    resolution: '1920x1080',
    quality: 90
  });

  // Cleanup Settings
  const [cleanupDays, setCleanupDays] = useState(30);

  React.useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/timelapse/statistics');
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
    }
  };

  const captureNow = async () => {
    try {
      setLoading(true);
      const [width, height] = captureSettings.resolution.split('x');

      const response = await api.post('/timelapse/capture', {
        resolution: { width: parseInt(width), height: parseInt(height) },
        quality: captureSettings.quality,
        tags: ['manual']
      });

      if (response.data.success) {
        alert('✅ Snapshot erfolgreich erfasst!');
        fetchStatistics();
      }
    } catch (error) {
      console.error('❌ Error capturing snapshot:', error);
      alert('❌ Fehler beim Erfassen des Snapshots');
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async () => {
    if (!videoForm.title || !videoForm.startDate || !videoForm.endDate) {
      alert('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    try {
      setLoading(true);
      const [width, height] = videoForm.resolution.split('x');

      const response = await api.post('/timelapse/generate', {
        title: videoForm.title,
        description: videoForm.description,
        startDate: videoForm.startDate,
        endDate: videoForm.endDate,
        fps: parseInt(videoForm.fps),
        resolution: { width: parseInt(width), height: parseInt(height) },
        format: videoForm.format,
        codec: videoForm.codec
      });

      if (response.data.success) {
        alert('✅ Video-Generierung gestartet! Dies kann einige Minuten dauern.');
        // Reset form
        setVideoForm({
          title: '',
          description: '',
          startDate: '',
          endDate: '',
          fps: 30,
          resolution: '1920x1080',
          format: 'mp4',
          codec: 'h264'
        });
      }
    } catch (error) {
      console.error('❌ Error generating video:', error);
      alert(`❌ Fehler: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    if (!confirm(`Alte Captures (älter als ${cleanupDays} Tage) wirklich löschen?`)) return;

    try {
      setLoading(true);
      const response = await api.post('/timelapse/cleanup', {
        daysToKeep: parseInt(cleanupDays)
      });

      if (response.data.success) {
        alert(`✅ ${response.data.data.deletedCount} Captures gelöscht, ${response.data.data.freedSpaceMB} MB freigegeben`);
        fetchStatistics();
      }
    } catch (error) {
      console.error('❌ Error running cleanup:', error);
      alert('❌ Fehler beim Cleanup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3">
              <Camera className="text-blue-500" size={24} />
              <div>
                <div className="text-2xl font-bold">{statistics.captures.totalCaptures}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Captures</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3">
              <Film className="text-emerald-500" size={24} />
              <div>
                <div className="text-2xl font-bold">{statistics.videos.total}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Videos</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3">
              <HardDrive className="text-purple-500" size={24} />
              <div>
                <div className="text-2xl font-bold">{statistics.totalStorageGB.toFixed(2)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">GB Gesamt</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex items-center gap-3">
              <Trash2 className="text-orange-500" size={24} />
              <div>
                <div className="text-2xl font-bold">{statistics.captures.unusedCaptures || 0}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Ungenutzt</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Capture */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Camera className="text-emerald-500" size={24} />
          <h3 className="text-lg font-semibold">Manueller Snapshot</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Auflösung</label>
            <select
              value={captureSettings.resolution}
              onChange={(e) =>
                setCaptureSettings({ ...captureSettings, resolution: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="1920x1080">1920x1080 (Full HD)</option>
              <option value="1280x720">1280x720 (HD)</option>
              <option value="3840x2160">3840x2160 (4K)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Qualität (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={captureSettings.quality}
              onChange={(e) =>
                setCaptureSettings({ ...captureSettings, quality: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={captureNow}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
            >
              <Camera size={18} />
              {loading ? 'Erfasse...' : 'Jetzt erfassen'}
            </button>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
          <p className="text-blue-700 dark:text-blue-300">
            💡 <strong>Hinweis:</strong> In der aktuellen Version werden Placeholder-Bilder erstellt.
            Für echte Kamera-Integration muss die Hardware angeschlossen werden.
          </p>
        </div>
      </div>

      {/* Video Generation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Film className="text-emerald-500" size={24} />
          <h3 className="text-lg font-semibold">Video Generierung</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Titel *</label>
              <input
                type="text"
                value={videoForm.title}
                onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                placeholder="Mein Grow Timelapse"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Beschreibung</label>
              <input
                type="text"
                value={videoForm.description}
                onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                placeholder="Optional..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start-Datum *</label>
              <input
                type="datetime-local"
                value={videoForm.startDate}
                onChange={(e) => setVideoForm({ ...videoForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End-Datum *</label>
              <input
                type="datetime-local"
                value={videoForm.endDate}
                onChange={(e) => setVideoForm({ ...videoForm, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">FPS</label>
              <input
                type="number"
                min="15"
                max="60"
                value={videoForm.fps}
                onChange={(e) => setVideoForm({ ...videoForm, fps: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Auflösung</label>
              <select
                value={videoForm.resolution}
                onChange={(e) => setVideoForm({ ...videoForm, resolution: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="1920x1080">1920x1080</option>
                <option value="1280x720">1280x720</option>
                <option value="3840x2160">3840x2160</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <select
                value={videoForm.format}
                onChange={(e) => setVideoForm({ ...videoForm, format: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
                <option value="avi">AVI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Codec</label>
              <select
                value={videoForm.codec}
                onChange={(e) => setVideoForm({ ...videoForm, codec: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="h264">H.264</option>
                <option value="h265">H.265</option>
                <option value="vp9">VP9</option>
              </select>
            </div>
          </div>

          <button
            onClick={generateVideo}
            disabled={loading || !videoForm.title || !videoForm.startDate || !videoForm.endDate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 font-medium"
          >
            <Play size={20} />
            {loading ? 'Generiere Video...' : 'Video Generieren'}
          </button>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-sm">
            <p className="text-yellow-700 dark:text-yellow-300">
              ⚠️ <strong>Wichtig:</strong> Die Video-Generierung kann je nach Anzahl der Captures
              mehrere Minuten dauern. Der Fortschritt wird im Video-Player angezeigt.
            </p>
          </div>
        </div>
      </div>

      {/* Cleanup */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="text-orange-500" size={24} />
          <h3 className="text-lg font-semibold">Speicher-Bereinigung</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                Lösche ungenutzte Captures älter als (Tage)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={runCleanup}
                disabled={loading}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 whitespace-nowrap"
              >
                Cleanup starten
              </button>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-sm">
            <p className="text-orange-700 dark:text-orange-300">
              ⚠️ Nur Captures die nicht in Videos verwendet wurden werden gelöscht.
              Videos bleiben unberührt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelapseSettings;

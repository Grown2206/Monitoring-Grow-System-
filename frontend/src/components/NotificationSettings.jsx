import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Smartphone, TestTube } from 'lucide-react';
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isNotificationSupported,
  isRunningAsPWA,
  showLocalNotification
} from '../utils/notifications';

export default function NotificationSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
    fetchStats();
    setIsPWA(isRunningAsPWA());
  }, []);

  const checkNotificationStatus = async () => {
    if (!isNotificationSupported()) {
      return;
    }

    setPermission(Notification.permission);
    setNotificationsEnabled(Notification.permission === 'granted');

    // Prüfe ob bereits abonniert
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/notifications/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Stats:', error);
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const granted = await requestNotificationPermission();

      if (granted) {
        await subscribeToPushNotifications();
        setNotificationsEnabled(true);
        setIsSubscribed(true);
        setPermission('granted');

        // Zeige Bestätigungs-Notification
        showLocalNotification('✅ Benachrichtigungen aktiviert', {
          body: 'Sie erhalten nun Benachrichtigungen vom Grow System',
          tag: 'notifications-enabled'
        });

        await fetchStats();
      }
    } catch (error) {
      console.error('Fehler beim Aktivieren:', error);
      alert('Fehler beim Aktivieren der Benachrichtigungen');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      await unsubscribeFromPushNotifications();
      setNotificationsEnabled(false);
      setIsSubscribed(false);
      await fetchStats();
    } catch (error) {
      console.error('Fehler beim Deaktivieren:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      // Lokale Test-Notification
      showLocalNotification('🧪 Test-Benachrichtigung', {
        body: 'Wenn Sie diese Nachricht sehen, funktionieren Benachrichtigungen!',
        tag: 'test',
        actions: [
          { action: 'view', title: 'Anzeigen' },
          { action: 'dismiss', title: 'OK' }
        ]
      });

      // Sende auch Push-Notification an alle Geräte
      await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🧪 Test vom Grow System',
          body: 'Test-Benachrichtigung erfolgreich!'
        })
      });
    } catch (error) {
      console.error('Fehler beim Senden der Test-Notification:', error);
    }
  };

  if (!isNotificationSupported()) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex items-center gap-3 text-amber-400">
          <BellOff className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Benachrichtigungen nicht verfügbar</h3>
            <p className="text-sm text-slate-400">
              Ihr Browser unterstützt keine Push-Benachrichtigungen
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PWA Status */}
      {isPWA && (
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Smartphone className="w-5 h-5" />
            <span className="font-medium">App-Modus aktiv</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Sie verwenden das Grow System als installierte App
          </p>
        </div>
      )}

      {/* Haupt-Einstellung */}
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-lg">Push-Benachrichtigungen</h3>
              <p className="text-sm text-slate-400">
                Erhalten Sie Echtzeit-Benachrichtigungen bei wichtigen Ereignissen
              </p>
            </div>
          </div>

          {permission === 'granted' && isSubscribed ? (
            <button
              onClick={handleDisableNotifications}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <BellOff className="w-4 h-4" />
              Deaktivieren
            </button>
          ) : (
            <button
              onClick={handleEnableNotifications}
              disabled={loading || permission === 'denied'}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              {loading ? 'Aktiviere...' : 'Aktivieren'}
            </button>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          {permission === 'granted' ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Berechtigung erteilt</span>
            </>
          ) : permission === 'denied' ? (
            <>
              <X className="w-4 h-4 text-red-400" />
              <span className="text-red-400">
                Berechtigung verweigert - Bitte in Browser-Einstellungen ändern
              </span>
            </>
          ) : (
            <span className="text-slate-400">Berechtigung noch nicht erteilt</span>
          )}
        </div>

        {isSubscribed && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <button
              onClick={handleTestNotification}
              className="w-full sm:w-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              Test-Benachrichtigung senden
            </button>
          </div>
        )}
      </div>

      {/* Benachrichtigungs-Typen */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="font-semibold mb-4">Benachrichtigungs-Typen</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Kritische Alarme</div>
              <div className="text-slate-400">
                Temperatur zu hoch/niedrig, Gas-Warnung, System-Ausfälle
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Bewässerungs-Hinweise</div>
              <div className="text-slate-400">
                Niedrige Bodenfeuchtigkeit, leerer Wassertank
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Klima-Warnungen</div>
              <div className="text-slate-400">
                Luftfeuchtigkeit außerhalb des Zielbereichs, VPD-Probleme
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Kalender-Erinnerungen</div>
              <div className="text-slate-400">
                Anstehende Aufgaben, Dünge-Zeitpläne, Ernte-Termine
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiken */}
      {stats && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Statistiken</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-emerald-400">{stats.total}</div>
              <div className="text-sm text-slate-400">Gesamt</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{stats.active}</div>
              <div className="text-sm text-slate-400">Aktiv</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-500">{stats.inactive}</div>
              <div className="text-sm text-slate-400">Inaktiv</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {Object.keys(stats.platforms || {}).length}
              </div>
              <div className="text-sm text-slate-400">Plattformen</div>
            </div>
          </div>

          {stats.platforms && Object.keys(stats.platforms).length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-sm font-medium mb-2">Geräte nach Plattform</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.platforms).map(([platform, count]) => (
                  <div
                    key={platform}
                    className="px-3 py-1 bg-slate-700 rounded-full text-xs"
                  >
                    {platform}: {count}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hinweis */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-200">
          💡 <strong>Tipp:</strong> Für die beste Erfahrung installieren Sie das Grow System als App
          auf Ihrem Smartphone. So verpassen Sie keine wichtigen Benachrichtigungen!
        </p>
      </div>
    </div>
  );
}

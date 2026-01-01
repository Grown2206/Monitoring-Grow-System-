const SensorLog = require('../models/SensorLog');

class AnalyticsService {
  /**
   * Erkennt Anomalien in Sensordaten
   */
  async detectAnomalies(hours = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const data = await SensorLog.find({
        timestamp: { $gte: since }
      }).sort({ timestamp: 1 });

      if (data.length < 10) {
        return { anomalies: [], message: 'Nicht genug Daten für Analyse' };
      }

      const anomalies = [];

      // Temperatur-Anomalien
      const tempStats = this.calculateStats(data.map(d => d.temp));
      const tempAnomalies = data.filter(d => {
        const zScore = Math.abs((d.temp - tempStats.mean) / tempStats.stdDev);
        return zScore > 2.5; // 2.5 Standardabweichungen
      });

      if (tempAnomalies.length > 0) {
        anomalies.push({
          type: 'temperature',
          severity: 'high',
          count: tempAnomalies.length,
          message: `${tempAnomalies.length} ungewöhnliche Temperaturwerte erkannt`,
          values: tempAnomalies.map(a => ({
            value: a.temp,
            timestamp: a.timestamp
          })).slice(0, 5)
        });
      }

      // Luftfeuchtigkeit-Anomalien
      const humidityStats = this.calculateStats(data.map(d => d.humidity));
      const humidityAnomalies = data.filter(d => {
        const zScore = Math.abs((d.humidity - humidityStats.mean) / humidityStats.stdDev);
        return zScore > 2.5;
      });

      if (humidityAnomalies.length > 0) {
        anomalies.push({
          type: 'humidity',
          severity: 'medium',
          count: humidityAnomalies.length,
          message: `${humidityAnomalies.length} ungewöhnliche Luftfeuchtigkeitswerte`,
          values: humidityAnomalies.map(a => ({
            value: a.humidity,
            timestamp: a.timestamp
          })).slice(0, 5)
        });
      }

      // Plötzliche Änderungen (Spikes)
      const tempSpikes = this.detectSpikes(data, 'temp', 5); // 5°C Änderung
      const humiditySpikes = this.detectSpikes(data, 'humidity', 15); // 15% Änderung

      if (tempSpikes.length > 0) {
        anomalies.push({
          type: 'temperature_spike',
          severity: 'high',
          count: tempSpikes.length,
          message: 'Plötzliche Temperaturänderungen erkannt',
          values: tempSpikes.slice(0, 5)
        });
      }

      if (humiditySpikes.length > 0) {
        anomalies.push({
          type: 'humidity_spike',
          severity: 'medium',
          count: humiditySpikes.length,
          message: 'Plötzliche Luftfeuchtigkeitsänderungen erkannt',
          values: humiditySpikes.slice(0, 5)
        });
      }

      return {
        anomalies,
        analyzed: data.length,
        timeRange: { start: data[0].timestamp, end: data[data.length - 1].timestamp }
      };
    } catch (error) {
      console.error('Fehler bei Anomalie-Erkennung:', error);
      throw error;
    }
  }

  /**
   * Vorhersage zukünftiger Werte (einfache lineare Regression)
   */
  async predictValues(hours = 24, predictHours = 6) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const data = await SensorLog.find({
        timestamp: { $gte: since }
      }).sort({ timestamp: 1 });

      if (data.length < 20) {
        return { predictions: [], message: 'Nicht genug Daten für Vorhersage' };
      }

      // Bereite Zeitreihen-Daten vor
      const timepoints = data.map((d, i) => i);
      const temps = data.map(d => d.temp);
      const humidities = data.map(d => d.humidity);

      // Linear Regression für Temperatur
      const tempTrend = this.linearRegression(timepoints, temps);

      // Linear Regression für Luftfeuchtigkeit
      const humidityTrend = this.linearRegression(timepoints, humidities);

      // Erstelle Vorhersagen
      const predictions = [];
      const intervalsPerHour = data.length / hours; // Messungen pro Stunde
      const futurePoints = Math.floor(predictHours * intervalsPerHour);

      for (let i = 1; i <= futurePoints; i += Math.ceil(intervalsPerHour)) {
        const futureIndex = data.length + i;
        const futureTime = new Date(Date.now() + (i / intervalsPerHour) * 60 * 60 * 1000);

        predictions.push({
          timestamp: futureTime,
          temp: {
            predicted: tempTrend.slope * futureIndex + tempTrend.intercept,
            confidence: this.calculateConfidence(tempTrend.r2)
          },
          humidity: {
            predicted: humidityTrend.slope * futureIndex + humidityTrend.intercept,
            confidence: this.calculateConfidence(humidityTrend.r2)
          }
        });
      }

      return {
        predictions,
        trends: {
          temperature: {
            direction: tempTrend.slope > 0.1 ? 'steigend' : tempTrend.slope < -0.1 ? 'fallend' : 'stabil',
            rate: tempTrend.slope,
            r2: tempTrend.r2
          },
          humidity: {
            direction: humidityTrend.slope > 0.1 ? 'steigend' : humidityTrend.slope < -0.1 ? 'fallend' : 'stabil',
            rate: humidityTrend.slope,
            r2: humidityTrend.r2
          }
        }
      };
    } catch (error) {
      console.error('Fehler bei Vorhersage:', error);
      throw error;
    }
  }

  /**
   * Berechnet Statistiken (Mittelwert, Standardabweichung)
   */
  calculateStats(values) {
    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev, min: Math.min(...values), max: Math.max(...values) };
  }

  /**
   * Erkennt plötzliche Änderungen (Spikes)
   */
  detectSpikes(data, field, threshold) {
    const spikes = [];

    for (let i = 1; i < data.length; i++) {
      const diff = Math.abs(data[i][field] - data[i - 1][field]);

      if (diff >= threshold) {
        spikes.push({
          timestamp: data[i].timestamp,
          value: data[i][field],
          previousValue: data[i - 1][field],
          change: diff
        });
      }
    }

    return spikes;
  }

  /**
   * Lineare Regression
   */
  linearRegression(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Berechne R²
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => {
      const yPred = slope * x[i] + intercept;
      return sum + Math.pow(yi - yPred, 2);
    }, 0);
    const r2 = 1 - (ssResidual / ssTotal);

    return { slope, intercept, r2 };
  }

  /**
   * Berechnet Konfidenz basierend auf R²
   */
  calculateConfidence(r2) {
    if (r2 > 0.9) return 'hoch';
    if (r2 > 0.7) return 'mittel';
    return 'niedrig';
  }

  /**
   * Optimierungsvorschläge basierend auf historischen Daten
   */
  async getOptimizationSuggestions() {
    try {
      const last7Days = await SensorLog.find({
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      if (last7Days.length < 100) {
        return { suggestions: [], message: 'Nicht genug Daten' };
      }

      const suggestions = [];

      // Temperatur-Analyse
      const tempStats = this.calculateStats(last7Days.map(d => d.temp));
      if (tempStats.stdDev > 3) {
        suggestions.push({
          category: 'temperature',
          priority: 'high',
          issue: 'Hohe Temperaturschwankungen',
          suggestion: 'Klimakontrolle optimieren - Temperatur schwankt um ±' + tempStats.stdDev.toFixed(1) + '°C',
          action: 'Thermostat-Einstellungen überprüfen, bessere Isolierung erwägen'
        });
      }

      // Luftfeuchtigkeit-Analyse
      const humidityStats = this.calculateStats(last7Days.map(d => d.humidity));
      if (humidityStats.mean < 40) {
        suggestions.push({
          category: 'humidity',
          priority: 'medium',
          issue: 'Durchschnittliche Luftfeuchtigkeit zu niedrig',
          suggestion: `Durchschnitt: ${humidityStats.mean.toFixed(1)}% - Ziel: 50-60%`,
          action: 'Luftbefeuchter installieren oder Wasserschalen aufstellen'
        });
      } else if (humidityStats.mean > 70) {
        suggestions.push({
          category: 'humidity',
          priority: 'high',
          issue: 'Durchschnittliche Luftfeuchtigkeit zu hoch',
          suggestion: `Durchschnitt: ${humidityStats.mean.toFixed(1)}% - Risiko für Schimmel`,
          action: 'Belüftung erhöhen, Entfeuchter verwenden'
        });
      }

      // VPD-Optimierung
      const vpdValues = last7Days.map(d => this.calculateVPD(d.temp, d.humidity));
      const vpdStats = this.calculateStats(vpdValues);

      if (vpdStats.mean < 0.8) {
        suggestions.push({
          category: 'vpd',
          priority: 'medium',
          issue: 'VPD zu niedrig für optimales Wachstum',
          suggestion: `Durchschnittlicher VPD: ${vpdStats.mean.toFixed(2)} kPa - Ziel: 0.8-1.2 kPa`,
          action: 'Temperatur erhöhen oder Luftfeuchtigkeit senken'
        });
      } else if (vpdStats.mean > 1.5) {
        suggestions.push({
          category: 'vpd',
          priority: 'high',
          issue: 'VPD zu hoch - Stress für Pflanzen',
          suggestion: `Durchschnittlicher VPD: ${vpdStats.mean.toFixed(2)} kPa`,
          action: 'Luftfeuchtigkeit erhöhen oder Temperatur senken'
        });
      }

      return { suggestions, analyzed: last7Days.length };
    } catch (error) {
      console.error('Fehler bei Optimierungsvorschlägen:', error);
      throw error;
    }
  }

  /**
   * Berechnet VPD (Vapor Pressure Deficit)
   */
  calculateVPD(temp, humidity) {
    const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
    const avp = svp * (humidity / 100);
    const vpd = svp - avp;
    return vpd;
  }
}

module.exports = new AnalyticsService();

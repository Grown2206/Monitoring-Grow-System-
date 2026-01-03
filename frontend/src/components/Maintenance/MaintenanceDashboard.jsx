import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme';
import {
  CheckCircle2, Circle, Calendar, AlertTriangle, Clock, Package,
  Wrench, Filter, Droplet, Zap, Plus, ChevronRight, History,
  ShoppingCart, ExternalLink, CheckSquare, Square, Edit2, Trash2
} from 'lucide-react';

const MaintenanceDashboard = () => {
  const { currentTheme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);

  // Load maintenance data from localStorage
  useEffect(() => {
    const savedTasks = localStorage.getItem('maintenance-tasks');
    const savedHistory = localStorage.getItem('maintenance-history');

    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    } else {
      // Initialize with default tasks
      setTasks(getDefaultTasks());
    }

    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save to localStorage whenever tasks change
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('maintenance-tasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('maintenance-history', JSON.stringify(history));
    }
  }, [history]);

  const getDefaultTasks = () => [
    // Daily Tasks
    {
      id: 1,
      title: 'Wasserstand prüfen',
      interval: 'daily',
      intervalDays: 1,
      category: 'water',
      lastCompleted: null,
      nextDue: new Date().toISOString(),
      priority: 'high',
      completed: false
    },
    {
      id: 2,
      title: 'Visuelle Pflanzeninspektion',
      interval: 'daily',
      intervalDays: 1,
      category: 'plant',
      lastCompleted: null,
      nextDue: new Date().toISOString(),
      priority: 'medium',
      completed: false
    },
    {
      id: 3,
      title: 'Temperatur & Luftfeuchtigkeit kontrollieren',
      interval: 'daily',
      intervalDays: 1,
      category: 'climate',
      lastCompleted: null,
      nextDue: new Date().toISOString(),
      priority: 'medium',
      completed: false
    },
    // Weekly Tasks
    {
      id: 4,
      title: 'pH-Wert messen',
      interval: 'weekly',
      intervalDays: 7,
      category: 'water',
      lastCompleted: null,
      nextDue: new Date().toISOString(),
      priority: 'high',
      completed: false
    },
    {
      id: 5,
      title: 'EC-Wert messen',
      interval: 'weekly',
      intervalDays: 7,
      category: 'water',
      lastCompleted: null,
      nextDue: new Date().toISOString(),
      priority: 'high',
      completed: false
    },
    {
      id: 6,
      title: 'Lüfter & Filter reinigen',
      interval: 'weekly',
      intervalDays: 7,
      category: 'equipment',
      lastCompleted: null,
      nextDue: new Date().toISOString(),
      priority: 'medium',
      completed: false
    },
    // Bi-Weekly Tasks
    {
      id: 7,
      title: 'EC-Sensor kalibrieren',
      interval: 'bi-weekly',
      intervalDays: 14,
      category: 'calibration',
      lastCompleted: null,
      nextDue: new Date().toISOString(),
      priority: 'high',
      completed: false
    },
    {
      id: 8,
      title: 'pH-Sensor kalibrieren',
      interval: 'bi-weekly',
      intervalDays: 14,
      category: 'calibration',
      lastCompleted: null,
      nextDue: new Date().toISOString(),
      priority: 'high',
      completed: false
    },
    // Monthly Tasks
    {
      id: 9,
      title: 'Nährstofftank komplett reinigen',
      interval: 'monthly',
      intervalDays: 30,
      category: 'water',
      lastCompleted: null,
      nextDue: new Date().toISOString(),
      priority: 'medium',
      completed: false
    },
    // Long-term Tasks
    {
      id: 10,
      title: 'Carbon-Filter wechseln',
      interval: 'semi-annual',
      intervalDays: 180,
      category: 'equipment',
      lastCompleted: null,
      nextDue: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'low',
      completed: false
    },
    {
      id: 11,
      title: 'HEPA-Filter wechseln',
      interval: 'annual',
      intervalDays: 365,
      category: 'equipment',
      lastCompleted: null,
      nextDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'low',
      completed: false
    }
  ];

  const completeTask = (taskId, notes = '') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const now = new Date().toISOString();
    const nextDue = new Date(Date.now() + task.intervalDays * 24 * 60 * 60 * 1000).toISOString();

    // Update task
    setTasks(tasks.map(t =>
      t.id === taskId
        ? { ...t, lastCompleted: now, nextDue, completed: false }
        : t
    ));

    // Add to history
    setHistory([
      {
        id: Date.now(),
        taskId: task.id,
        taskTitle: task.title,
        completedAt: now,
        notes
      },
      ...history
    ]);
  };

  const toggleTaskComplete = (taskId) => {
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  const getDaysUntilDue = (dueDate) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (dueDate) => getDaysUntilDue(dueDate) < 0;
  const isDueSoon = (dueDate) => {
    const days = getDaysUntilDue(dueDate);
    return days >= 0 && days <= 2;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'water': return <Droplet size={20} />;
      case 'calibration': return <Zap size={20} />;
      case 'equipment': return <Filter size={20} />;
      case 'climate': return <Wrench size={20} />;
      case 'plant': return <Package size={20} />;
      default: return <Wrench size={20} />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'water': return '#3b82f6'; // blue
      case 'calibration': return '#f59e0b'; // amber
      case 'equipment': return '#8b5cf6'; // purple
      case 'climate': return '#10b981'; // emerald
      case 'plant': return '#84cc16'; // lime
      default: return currentTheme.accent.color;
    }
  };

  const getIntervalBadge = (interval) => {
    const badges = {
      'daily': { text: 'Täglich', color: '#ef4444' },
      'weekly': { text: 'Wöchentlich', color: '#f59e0b' },
      'bi-weekly': { text: '2 Wochen', color: '#8b5cf6' },
      'monthly': { text: 'Monatlich', color: '#3b82f6' },
      'semi-annual': { text: '6 Monate', color: '#10b981' },
      'annual': { text: '12 Monate', color: '#64748b' }
    };
    return badges[interval] || badges.monthly;
  };

  // Filter tasks by status
  const overdueTasks = tasks.filter(t => !t.completed && isOverdue(t.nextDue));
  const dueSoonTasks = tasks.filter(t => !t.completed && isDueSoon(t.nextDue) && !isOverdue(t.nextDue));
  const upcomingTasks = tasks.filter(t => !t.completed && getDaysUntilDue(t.nextDue) > 2);
  const completedTasks = tasks.filter(t => t.completed);

  // Spare Parts List
  const spareParts = [
    {
      name: 'EC Kalibrier-Lösung Set',
      price: '29.99€',
      interval: '6 Monate',
      category: 'Kalibrierung',
      link: 'https://www.amazon.de/s?k=ec+calibration+solution'
    },
    {
      name: 'pH Kalibrier-Lösung Set',
      price: '24.99€',
      interval: '6 Monate',
      category: 'Kalibrierung',
      link: 'https://www.amazon.de/s?k=ph+calibration+solution'
    },
    {
      name: 'Carbon Filter 150mm',
      price: '89.99€',
      interval: '6 Monate',
      category: 'Filter',
      link: 'https://www.amazon.de/s?k=carbon+filter+150mm'
    },
    {
      name: 'HEPA Filter',
      price: '34.99€',
      interval: '12 Monate',
      category: 'Filter',
      link: 'https://www.amazon.de/s?k=hepa+filter'
    },
    {
      name: 'pH Down Lösung (1L)',
      price: '19.99€',
      interval: 'Bei Bedarf',
      category: 'Chemie',
      link: 'https://www.amazon.de/s?k=ph+down'
    },
    {
      name: 'pH Up Lösung (1L)',
      price: '19.99€',
      interval: 'Bei Bedarf',
      category: 'Chemie',
      link: 'https://www.amazon.de/s?k=ph+up'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold mb-1"
            style={{ color: currentTheme.text.primary }}
          >
            Wartungsplan
          </h2>
          <p
            className="text-sm"
            style={{ color: currentTheme.text.secondary }}
          >
            Behalte alle Wartungsaufgaben im Blick
          </p>
        </div>
        <button
          onClick={() => setShowAddTask(true)}
          className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all hover:brightness-110"
          style={{
            backgroundColor: currentTheme.accent.color,
            color: 'white'
          }}
        >
          <Plus size={20} />
          Aufgabe
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Überfällig"
          value={overdueTasks.length}
          icon={<AlertTriangle size={20} />}
          color="#ef4444"
          theme={currentTheme}
        />
        <StatCard
          title="Fällig bald"
          value={dueSoonTasks.length}
          icon={<Clock size={20} />}
          color="#f59e0b"
          theme={currentTheme}
        />
        <StatCard
          title="Anstehend"
          value={upcomingTasks.length}
          icon={<Calendar size={20} />}
          color="#3b82f6"
          theme={currentTheme}
        />
        <StatCard
          title="Abgeschlossen"
          value={completedTasks.length}
          icon={<CheckCircle2 size={20} />}
          color="#10b981"
          theme={currentTheme}
        />
      </div>

      {/* Task Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <TaskSection
            title="Überfällig"
            icon={<AlertTriangle size={20} />}
            color="#ef4444"
            tasks={overdueTasks}
            onToggle={toggleTaskComplete}
            onComplete={completeTask}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
            getIntervalBadge={getIntervalBadge}
            getDaysUntilDue={getDaysUntilDue}
            theme={currentTheme}
          />
        )}

        {/* Due Soon Tasks */}
        {dueSoonTasks.length > 0 && (
          <TaskSection
            title="Fällig bald"
            icon={<Clock size={20} />}
            color="#f59e0b"
            tasks={dueSoonTasks}
            onToggle={toggleTaskComplete}
            onComplete={completeTask}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
            getIntervalBadge={getIntervalBadge}
            getDaysUntilDue={getDaysUntilDue}
            theme={currentTheme}
          />
        )}

        {/* Upcoming Tasks */}
        <TaskSection
          title="Anstehende Aufgaben"
          icon={<Calendar size={20} />}
          color="#3b82f6"
          tasks={upcomingTasks}
          onToggle={toggleTaskComplete}
          onComplete={completeTask}
          getCategoryIcon={getCategoryIcon}
          getCategoryColor={getCategoryColor}
          getIntervalBadge={getIntervalBadge}
          getDaysUntilDue={getDaysUntilDue}
          theme={currentTheme}
        />

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <TaskSection
            title="Abgeschlossen"
            icon={<CheckCircle2 size={20} />}
            color="#10b981"
            tasks={completedTasks}
            onToggle={toggleTaskComplete}
            onComplete={completeTask}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
            getIntervalBadge={getIntervalBadge}
            getDaysUntilDue={getDaysUntilDue}
            theme={currentTheme}
            isCompleted
          />
        )}
      </div>

      {/* Spare Parts List */}
      <div
        className="rounded-xl border p-6"
        style={{
          backgroundColor: currentTheme.bg.card,
          borderColor: currentTheme.border.default
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart size={20} style={{ color: currentTheme.accent.color }} />
          <h3
            className="text-lg font-bold"
            style={{ color: currentTheme.text.primary }}
          >
            Ersatzteile & Verbrauchsmaterial
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spareParts.map((part, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: currentTheme.bg.hover,
                borderColor: currentTheme.border.light
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div
                    className="font-medium mb-1"
                    style={{ color: currentTheme.text.primary }}
                  >
                    {part.name}
                  </div>
                  <div
                    className="text-xs mb-1"
                    style={{ color: currentTheme.text.muted }}
                  >
                    {part.category} • {part.interval}
                  </div>
                </div>
                <div
                  className="text-lg font-bold"
                  style={{ color: currentTheme.accent.color }}
                >
                  {part.price}
                </div>
              </div>
              <a
                href={part.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium flex items-center gap-1 hover:brightness-110 transition-all"
                style={{ color: currentTheme.accent.light }}
              >
                Bei Amazon kaufen <ExternalLink size={12} />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Maintenance History */}
      {history.length > 0 && (
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: currentTheme.bg.card,
            borderColor: currentTheme.border.default
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <History size={20} style={{ color: currentTheme.accent.color }} />
            <h3
              className="text-lg font-bold"
              style={{ color: currentTheme.text.primary }}
            >
              Wartungshistorie
            </h3>
          </div>
          <div className="space-y-2">
            {history.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg border flex items-center justify-between"
                style={{
                  backgroundColor: currentTheme.bg.hover,
                  borderColor: currentTheme.border.light
                }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                  <div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: currentTheme.text.primary }}
                    >
                      {entry.taskTitle}
                    </div>
                    {entry.notes && (
                      <div
                        className="text-xs"
                        style={{ color: currentTheme.text.muted }}
                      >
                        {entry.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="text-xs"
                  style={{ color: currentTheme.text.secondary }}
                >
                  {new Date(entry.completedAt).toLocaleDateString('de-DE')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, theme }) => (
  <div
    className="p-4 rounded-xl border"
    style={{
      backgroundColor: theme.bg.card,
      borderColor: theme.border.default
    }}
  >
    <div className="flex items-center justify-between mb-2">
      <div
        className="p-2 rounded-lg"
        style={{
          backgroundColor: color + '20',
          color: color
        }}
      >
        {icon}
      </div>
      <div
        className="text-3xl font-bold"
        style={{ color: color }}
      >
        {value}
      </div>
    </div>
    <div
      className="text-sm font-medium"
      style={{ color: theme.text.secondary }}
    >
      {title}
    </div>
  </div>
);

// Task Section Component
const TaskSection = ({
  title,
  icon,
  color,
  tasks,
  onToggle,
  onComplete,
  getCategoryIcon,
  getCategoryColor,
  getIntervalBadge,
  getDaysUntilDue,
  theme,
  isCompleted = false
}) => (
  <div
    className="rounded-xl border p-6"
    style={{
      backgroundColor: theme.bg.card,
      borderColor: theme.border.default
    }}
  >
    <div className="flex items-center gap-2 mb-4">
      <div style={{ color }}>{icon}</div>
      <h3
        className="text-lg font-bold"
        style={{ color: theme.text.primary }}
      >
        {title}
      </h3>
      <span
        className="ml-auto text-sm font-bold px-2 py-1 rounded"
        style={{
          backgroundColor: color + '20',
          color: color
        }}
      >
        {tasks.length}
      </span>
    </div>
    <div className="space-y-2">
      {tasks.map((task) => {
        const badge = getIntervalBadge(task.interval);
        const daysUntil = getDaysUntilDue(task.nextDue);
        const categoryColor = getCategoryColor(task.category);

        return (
          <div
            key={task.id}
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: theme.bg.hover,
              borderColor: theme.border.light
            }}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => onToggle(task.id)}
                className="mt-0.5"
                style={{ color: theme.text.secondary }}
              >
                {task.completed ? (
                  <CheckSquare size={20} style={{ color: categoryColor }} />
                ) : (
                  <Square size={20} />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div style={{ color: categoryColor }}>
                    {getCategoryIcon(task.category)}
                  </div>
                  <div
                    className={`font-medium ${task.completed ? 'line-through' : ''}`}
                    style={{ color: theme.text.primary }}
                  >
                    {task.title}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: badge.color + '20',
                      color: badge.color
                    }}
                  >
                    {badge.text}
                  </span>
                  {!isCompleted && (
                    <span
                      className="text-xs"
                      style={{ color: theme.text.muted }}
                    >
                      {daysUntil < 0
                        ? `${Math.abs(daysUntil)} Tage überfällig`
                        : daysUntil === 0
                        ? 'Heute fällig'
                        : `In ${daysUntil} Tagen`}
                    </span>
                  )}
                </div>
              </div>
              {!isCompleted && task.completed && (
                <button
                  onClick={() => onComplete(task.id)}
                  className="px-3 py-1 rounded text-xs font-medium transition-all hover:brightness-110"
                  style={{
                    backgroundColor: categoryColor + '20',
                    color: categoryColor
                  }}
                >
                  Bestätigen
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default MaintenanceDashboard;

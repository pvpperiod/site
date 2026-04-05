/* ========================================
   Habit Tracker - Логика приложения
   ======================================== */

const API_BASE = 'http://localhost:3000/api';

// ========================================
// Система аккаунтов (бэкенд через JWT)
// ========================================

function getAuth() {
  const data = localStorage.getItem('habitflow_auth');
  return data ? JSON.parse(data) : null;
}

function getToken() {
  const auth = getAuth();
  return auth ? auth.token : null;
}

function getCurrentUser() {
  const auth = getAuth();
  return auth ? auth.user : null;
}

async function logout() {
  localStorage.removeItem('habitflow_auth');
  window.location.href = 'auth.html';
}

function checkAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser || !getToken()) {
    window.location.href = 'auth.html';
    return null;
  }
  return currentUser;
}

// Автоматический вход при повторном посещении
function autoLogin() {
  const auth = getAuth();
  if (auth && auth.token && window.location.pathname.includes('auth.html')) {
    console.log('Автоматический вход для:', auth.user.name);
    window.location.href = 'dashboard.html';
  }
  return auth ? auth.user : null;
}

// ========================================
// Данные приложения
// ========================================

const defaultHabits = [
  {
    id: 1,
    name: 'Пить воду',
    emoji: '💧',
    target: 8,
    unit: 'стаканов',
    color: '#4299e1',
    streak: 0,
    completedToday: 0,
    completedDates: []
  },
  {
    id: 2,
    name: 'Читать',
    emoji: '📚',
    target: 30,
    unit: 'минут',
    color: '#9f7aea',
    streak: 0,
    completedToday: 0,
    completedDates: []
  },
  {
    id: 3,
    name: 'Утренняя зарядка',
    emoji: '🏃‍♂️',
    target: 1,
    unit: 'раз',
    color: '#48bb78',
    streak: 0,
    completedToday: 0,
    completedDates: []
  },
  {
    id: 4,
    name: 'Медитация',
    emoji: '🧘‍♀️',
    target: 10,
    unit: 'минут',
    color: '#ed8936',
    streak: 0,
    completedToday: 0,
    completedDates: []
  },
  {
    id: 5,
    name: 'Сон 8 часов',
    emoji: '💤',
    target: 1,
    unit: 'раз',
    color: '#667eea',
    streak: 0,
    completedToday: 0,
    completedDates: []
  },
  {
    id: 6,
    name: 'Здоровое питание',
    emoji: '🥗',
    target: 1,
    unit: 'раз',
    color: '#f687b3',
    streak: 0,
    completedToday: 0,
    completedDates: []
  }
];

const achievements = [
  {
    id: 'first_habit',
    name: 'Первый шаг',
    description: 'Выполните первую привычку',
    icon: '🌱',
    condition: (data) => data.totalCompleted >= 1
  },
  {
    id: 'week_warrior',
    name: 'Недельный воин',
    description: '7 дней стрик',
    icon: '🔥',
    condition: (data) => data.maxStreak >= 7
  },
  {
    id: 'month_master',
    name: 'Мастер месяца',
    description: '30 дней стрик',
    icon: '👑',
    condition: (data) => data.maxStreak >= 30
  },
  {
    id: 'habit_collector',
    name: 'Коллекционер',
    description: 'Создайте 5 привычек',
    icon: '📋',
    condition: (data) => data.totalHabits >= 5
  },
  {
    id: 'century_club',
    name: 'Клуб 100',
    description: '100 выполнений',
    icon: '💯',
    condition: (data) => data.totalCompleted >= 100
  },
  {
    id: 'early_bird',
    name: 'Ранняя пташка',
    description: 'Выполните привычку до 8 утра',
    icon: '🌅',
    condition: (data) => data.earlyMorning >= 1
  },
  {
    id: 'night_owl',
    name: 'Ночная сова',
    description: 'Выполните привычку после 22:00',
    icon: '🦉',
    condition: (data) => data.lateNight >= 1
  },
  {
    id: 'perfect_day',
    name: 'Идеальный день',
    description: 'Выполните все привычки за день',
    icon: '⭐',
    condition: (data) => data.perfectDays >= 1
  },
  {
    id: 'level_5',
    name: 'Опытный пользователь',
    description: 'Достигните 5 уровня',
    icon: '🎖️',
    condition: (data) => data.level >= 5
  },
  {
    id: 'level_10',
    name: 'Легенда',
    description: 'Достигните 10 уровня',
    icon: '🏆',
    condition: (data) => data.level >= 10
  }
];

// ========================================
// Состояние приложения
// ========================================

let appState = {
  habits: [],
  user: {
    name: 'Пользователь',
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    totalCompleted: 0,
    maxStreak: 0,
    earlyMorning: 0,
    lateNight: 0,
    perfectDays: 0,
    avatar: null
  },
  unlockedAchievements: [],
  theme: 'light',
  weeklyData: []
};

// ========================================
// Инициализация
// ========================================

async function initApp() {
  await loadFromStorage();
  applyTheme();
  checkDailyReset();
  generateWeeklyData();
  updateAllUI();
}

async function loadFromStorage() {
  const token = getToken();
  const currentUser = getCurrentUser();

  if (token) {
    try {
      const response = await fetch(`${API_BASE}/user-data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        appState = result.data;

        // Синхронизируем имя пользователя из аккаунта
        if (currentUser && currentUser.name) {
          appState.user.name = currentUser.name;
        }
        if (currentUser && currentUser.email) {
          appState.user.email = currentUser.email;
        }
        return;
      }
    } catch (err) {
      console.error('Ошибка загрузки данных с сервера:', err);
    }
  }

  // Если нет данных или ошибка — используем дефолтные
  appState.habits = JSON.parse(JSON.stringify(defaultHabits));

  if (currentUser && currentUser.name) {
    appState.user.name = currentUser.name;
  }
  if (currentUser && currentUser.email) {
    appState.user.email = currentUser.email;
  }
}

async function saveToStorage() {
  const token = getToken();
  if (!token) return;

  try {
    await fetch(`${API_BASE}/user-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ data: appState })
    });
  } catch (err) {
    console.error('Ошибка сохранения данных на сервер:', err);
  }
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', appState.theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.textContent = appState.theme === 'dark' ? '☀️' : '🌙';
  }
}

function toggleTheme() {
  appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
  saveToStorage();
  applyTheme();
}

// ========================================
// Проверка ежедневного сброса
// ========================================

function checkDailyReset() {
  const today = new Date().toDateString();
  const lastVisit = appState.lastVisitDate;

  if (lastVisit && lastVisit !== today) {
    // Новый день - проверяем完成情况
    appState.habits.forEach(habit => {
      if (habit.completedToday < habit.target) {
        // Не выполнил - сбрасываем стрик
        habit.streak = 0;
      }
      habit.completedToday = 0;
    });

    checkPerfectDay();
  }

  appState.lastVisitDate = today;
  saveToStorage();
}

function checkPerfectDay() {
  const allCompleted = appState.habits.every(h => h.completedToday >= h.target);
  if (allCompleted && appState.habits.length > 0) {
    appState.user.perfectDays++;
  }
}

// ========================================
// Генерация недельных данных
// ========================================

function generateWeeklyData() {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  appState.weeklyData = days.map((day, index) => ({
    day,
    value: Math.floor(Math.random() * 80) + 20
  }));
}

// ========================================
// Система XP и уровней
// ========================================

function addXP(amount) {
  appState.user.xp += amount;
  
  while (appState.user.xp >= appState.user.xpToNextLevel) {
    appState.user.xp -= appState.user.xpToNextLevel;
    appState.user.level++;
    appState.user.xpToNextLevel = Math.floor(appState.user.xpToNextLevel * 1.5);
    showNotification('🎉', 'Новый уровень!', `Вы достигли ${appState.user.level} уровня!`);
    createConfetti();
  }
  
  saveToStorage();
  updateLevelUI();
  checkAchievements();
}

function getXPForLevel(level) {
  return 100 * Math.pow(1.5, level - 1);
}

// ========================================
// Выполнение привычек
// ========================================

function toggleHabit(habitId) {
  const habit = appState.habits.find(h => h.id === habitId);
  if (!habit) return;
  
  const wasCompleted = habit.completedToday >= habit.target;
  
  if (wasCompleted) {
    habit.completedToday = Math.max(0, habit.completedToday - 1);
    if (habit.completedToday < habit.target) {
      habit.streak = Math.max(0, habit.streak - 1);
      appState.user.totalCompleted = Math.max(0, appState.user.totalCompleted - 1);
    }
  } else {
    habit.completedToday++;
    if (habit.completedToday === habit.target) {
      habit.streak++;
      appState.user.maxStreak = Math.max(appState.user.maxStreak, habit.streak);
      appState.user.totalCompleted++;
      addXP(10);
      
      // Проверка времени для достижений
      const hour = new Date().getHours();
      if (hour < 8) appState.user.earlyMorning++;
      if (hour >= 22) appState.user.lateNight++;
      
      showNotification('✅', 'Отлично!', `Привычка "${habit.name}" выполнена!`);
    } else {
      addXP(2);
    }
  }
  
  saveToStorage();
  updateAllUI();
}

function incrementHabit(habitId) {
  const habit = appState.habits.find(h => h.id === habitId);
  if (!habit || habit.completedToday >= habit.target) return;
  
  habit.completedToday++;
  
  if (habit.completedToday === habit.target) {
    habit.streak++;
    appState.user.maxStreak = Math.max(appState.user.maxStreak, habit.streak);
    appState.user.totalCompleted++;
    addXP(10);
    
    const hour = new Date().getHours();
    if (hour < 8) appState.user.earlyMorning++;
    if (hour >= 22) appState.user.lateNight++;
    
    showNotification('✅', 'Отлично!', `Привычка "${habit.name}" выполнена!`);
  } else {
    addXP(2);
  }
  
  saveToStorage();
  updateAllUI();
}

// ========================================
// Достижения
// ========================================

function checkAchievements() {
  const data = {
    totalCompleted: appState.user.totalCompleted,
    maxStreak: appState.user.maxStreak,
    totalHabits: appState.habits.length,
    level: appState.user.level,
    earlyMorning: appState.user.earlyMorning,
    lateNight: appState.user.lateNight,
    perfectDays: appState.user.perfectDays
  };
  
  achievements.forEach(achievement => {
    if (!appState.unlockedAchievements.includes(achievement.id) && 
        achievement.condition(data)) {
      appState.unlockedAchievements.push(achievement.id);
      showNotification('🏆', 'Новое достижение!', achievement.name);
      createConfetti();
    }
  });
  
  saveToStorage();
}

// ========================================
// Управление привычками
// ========================================

function addHabit(habitData) {
  const newHabit = {
    id: Date.now(),
    name: habitData.name,
    emoji: habitData.emoji || '🎯',
    target: parseInt(habitData.target) || 1,
    unit: habitData.unit || 'раз',
    color: habitData.color || '#667eea',
    streak: 0,
    completedToday: 0,
    completedDates: []
  };
  
  appState.habits.push(newHabit);
  saveToStorage();
  updateAllUI();
  showNotification('🎉', 'Привычка создана!', `"${newHabit.name}" добавлена`);
}

function deleteHabit(habitId) {
  appState.habits = appState.habits.filter(h => h.id !== habitId);
  saveToStorage();
  updateAllUI();
  showNotification('🗑️', 'Привычка удалена', '');
}

// ========================================
// Обновление UI
// ========================================

function updateAllUI() {
  updateDashboard();
  updateHabitsList();
  updateStats();
  updateAchievements();
  updateProfile();
  updateLevelUI();
}

function updateDashboard() {
  const totalHabitsEl = document.getElementById('totalHabits');
  const completedTodayEl = document.getElementById('completedToday');
  const currentStreakEl = document.getElementById('currentStreak');
  const totalXPEl = document.getElementById('totalXP');
  
  if (totalHabitsEl) {
    totalHabitsEl.textContent = appState.habits.length;
  }
  
  if (completedTodayEl) {
    const completed = appState.habits.filter(h => h.completedToday >= h.target).length;
    completedTodayEl.textContent = completed;
  }
  
  if (currentStreakEl) {
    const maxStreak = Math.max(...appState.habits.map(h => h.streak), 0);
    currentStreakEl.textContent = maxStreak;
  }
  
  if (totalXPEl) {
    totalXPEl.textContent = appState.user.xp;
  }
}

function updateHabitsList() {
  const habitsContainer = document.getElementById('habitsList');
  if (!habitsContainer) return;
  
  habitsContainer.innerHTML = appState.habits.map(habit => {
    const progress = (habit.completedToday / habit.target) * 100;
    const isCompleted = habit.completedToday >= habit.target;
    
    return `
      <div class="habit-item fade-in">
        <div class="habit-checkbox ${isCompleted ? 'checked' : ''}" 
             onclick="toggleHabit(${habit.id})">
          ${isCompleted ? '✓' : ''}
        </div>
        <div class="habit-info">
          <div class="habit-name">${habit.emoji} ${habit.name}</div>
          <div class="habit-streak">
            <span class="fire">🔥</span> ${habit.streak} дн. | 
            ${habit.completedToday}/${habit.target} ${habit.unit}
          </div>
          <div class="progress-container">
            <div class="progress-bar" style="width: ${Math.min(progress, 100)}%"></div>
          </div>
        </div>
        <div class="habit-actions">
          ${!isCompleted ? `
            <button class="btn btn-success" onclick="incrementHabit(${habit.id})">
              +1
            </button>
          ` : ''}
          <button class="btn btn-danger" onclick="deleteHabit(${habit.id})">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function updateStats() {
  const chartBars = document.getElementById('chartBars');
  if (!chartBars) return;
  
  chartBars.innerHTML = appState.weeklyData.map(data => `
    <div class="chart-bar" style="height: ${data.value}%">
      <span class="value">${data.value}%</span>
      <span>${data.day}</span>
    </div>
  `).join('');
}

function updateAchievements() {
  const achievementsContainer = document.getElementById('achievementsList');
  if (!achievementsContainer) return;
  
  achievementsContainer.innerHTML = achievements.map(achievement => {
    const isUnlocked = appState.unlockedAchievements.includes(achievement.id);
    
    return `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'} fade-in">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-name">${achievement.name}</div>
        <div class="achievement-desc">${achievement.description}</div>
      </div>
    `;
  }).join('');
}

function updateProfile() {
  const profileNameEl = document.getElementById('profileName');
  const profileLevelEl = document.getElementById('profileLevel');
  const profileTotalEl = document.getElementById('profileTotal');
  const profileStreakEl = document.getElementById('profileStreak');
  const profileAchievementsEl = document.getElementById('profileAchievements');
  
  if (profileNameEl) profileNameEl.textContent = appState.user.name;
  if (profileLevelEl) profileLevelEl.textContent = `Уровень ${appState.user.level}`;
  if (profileTotalEl) profileTotalEl.textContent = appState.user.totalCompleted;
  if (profileStreakEl) profileStreakEl.textContent = appState.user.maxStreak;
  if (profileAchievementsEl) profileAchievementsEl.textContent = appState.unlockedAchievements.length;
}

function updateLevelUI() {
  const levelEl = document.getElementById('levelBadge');
  const xpEl = document.getElementById('xpText');
  const xpBar = document.getElementById('xpBar');
  
  if (levelEl) {
    levelEl.textContent = `Ур. ${appState.user.level}`;
  }
  
  if (xpEl) {
    xpEl.textContent = `${appState.user.xp} / ${appState.user.xpToNextLevel} XP`;
  }
  
  if (xpBar) {
    const progress = (appState.user.xp / appState.user.xpToNextLevel) * 100;
    xpBar.style.width = `${progress}%`;
  }
}

// ========================================
// Уведомления
// ========================================

function showNotification(icon, title, message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// ========================================
// Конфетти
// ========================================

function createConfetti() {
  const colors = ['#667eea', '#764ba2', '#48bb78', '#ed8936', '#f56565', '#f687b3'];
  
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 4000);
    }, i * 50);
  }
}

// ========================================
// Модальное окно
// ========================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

function submitHabitForm(event) {
  event.preventDefault();
  
  const form = event.target;
  const habitData = {
    name: form.habitName.value,
    emoji: form.habitEmoji.value || '🎯',
    target: form.habitTarget.value,
    unit: form.habitUnit.value,
    color: form.habitColor.value
  };
  
  addHabit(habitData);
  closeModal('addHabitModal');
  form.reset();
}

// ========================================
// Календарь
// ========================================

function renderCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  if (!calendarGrid) return;
  
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  
  let html = dayNames.map(day => `<div class="calendar-day-name">${day}</div>`).join('');
  
  // Пустые ячейки до первого дня месяца
  for (let i = 0; i < firstDay; i++) {
    html += '<div></div>';
  }
  
  // Дни месяца
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today.getDate();
    const isCompleted = Math.random() > 0.5; // Заглушка для реальных данных
    
    let className = 'calendar-day';
    if (isToday) className += ' today';
    if (isCompleted) className += ' completed';
    
    html += `<div class="${className}">${day}</div>`;
  }
  
  calendarGrid.innerHTML = html;
}

// ========================================
// Экспорт/Импорт данных
// ========================================

function exportData() {
  const dataStr = JSON.stringify(appState, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `habitflow_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showNotification('💾', 'Экспорт', 'Данные сохранены!');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      appState = JSON.parse(e.target.result);
      saveToStorage();
      updateAllUI();
      showNotification('📥', 'Импорт', 'Данные загружены!');
    } catch (err) {
      showNotification('❌', 'Ошибка', 'Неверный формат файла');
    }
  };
  reader.readAsText(file);
}

// ========================================
// Инициализация при загрузке
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  autoLogin(); // Проверяем автосохранение сессии
  await initApp();

  // Обновление активных ссылок в навигации
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });

  // Рендер календаря если есть
  renderCalendar();
});

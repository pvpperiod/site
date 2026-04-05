const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();

const JWT_SECRET = 'habitflow_secret_key_2026_change_in_production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Пути к файлам данных — используем /tmp для serverless
const DATA_DIR = process.env.VERCEL ? '/tmp/data' : path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const USER_DATA_DIR = path.join(DATA_DIR, 'users_data');

// Создаём директории если нет
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USER_DATA_DIR)) fs.mkdirSync(USER_DATA_DIR, { recursive: true });

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]', 'utf-8');
    return [];
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function getUserDataFile(userId) {
  return path.join(USER_DATA_DIR, `${userId}.json`);
}

function readUserData(userId) {
  const file = getUserDataFile(userId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeUserData(userId, data) {
  const file = getUserDataFile(userId);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Неверный токен' });
    req.user = user;
    next();
  });
}

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Все поля обязательны' });
    if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    if (name.length < 2) return res.status(400).json({ error: 'Имя минимум 2 символа' });
    const users = readUsers();
    if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email уже зарегистрирован' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now().toString(), name, email, password: hashedPassword, createdAt: new Date().toISOString() };
    users.push(newUser);
    writeUsers(users);
    writeUserData(newUser.id, { habits: [], user: { name, email, level: 1, xp: 0, xpToNextLevel: 100, totalCompleted: 0, maxStreak: 0, earlyMorning: 0, lateNight: 0, perfectDays: 0, avatar: null }, unlockedAchievements: [], theme: 'light', weeklyData: [] });
    const token = jwt.sign({ id: newUser.id, email: newUser.email, name: newUser.name }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });
    const users = readUsers();
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Неверный email или пароль' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/user-data', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const userData = readUserData(userId);
    if (!userData) return res.status(404).json({ error: 'Данные не найдены' });
    res.json({ success: true, data: userData });
  } catch (err) {
    console.error('Ошибка чтения данных:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/user-data', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const data = req.body.data;
    if (!data) return res.status(400).json({ error: 'Нет данных' });
    writeUserData(userId, data);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка сохранения данных:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: { id: req.user.id, name: req.user.name, email: req.user.email } });
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Оба пароля обязательны' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: 'Пользователь не найден' });
    const validPassword = await bcrypt.compare(oldPassword, users[userIndex].password);
    if (!validPassword) return res.status(401).json({ error: 'Неверный текущий пароль' });
    users[userIndex].password = await bcrypt.hash(newPassword, 10);
    writeUsers(users);
    res.json({ success: true, message: 'Пароль изменён' });
  } catch (err) {
    console.error('Ошибка смены пароля:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/update-profile', authenticateToken, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.length < 2) return res.status(400).json({ error: 'Имя минимум 2 символа' });
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: 'Пользователь не найден' });
    users[userIndex].name = name;
    writeUsers(users);
    const token = jwt.sign({ id: req.user.id, email: req.user.email, name }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, name });
  } catch (err) {
    console.error('Ошибка обновления профиля:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = app;

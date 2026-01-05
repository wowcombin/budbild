// Конфигурация пользователей
export const USERS = [
  {
    id: 'user_krasotka',
    username: 'krasotka',
    password: 'krasotka11',
    displayName: '💖 Красотка'
  },
  {
    id: 'user_svyatik12',
    username: 'svyatik12',
    password: 'svyatik12',
    displayName: '👨 Святослав'
  }
];

// Проверка логина
export function authenticateUser(username, password) {
  const user = USERS.find(u => u.username === username && u.password === password);
  return user || null;
}

// Получение пользователя по ID
export function getUserById(userId) {
  return USERS.find(u => u.id === userId) || null;
}



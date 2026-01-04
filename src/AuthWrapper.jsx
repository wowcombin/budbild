import { useState, useEffect } from 'react';
import App from './App';
import Login from './Login';
import { getUserById } from './users';

function AuthWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Проверяем, вошел ли пользователь ранее
    const auth = localStorage.getItem('budgetApp_isAuthenticated');
    const userId = localStorage.getItem('budgetApp_userId');
    const authTimestamp = localStorage.getItem('budgetApp_authTimestamp');
    
    // Если есть сохраненная сессия - автоматически входим
    if (auth === 'true' && userId && authTimestamp) {
      const user = getUserById(userId);
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleLogin = (user) => {
    // Сохраняем с timestamp - сессия будет постоянной пока не нажмут "Выход"
    localStorage.setItem('budgetApp_isAuthenticated', 'true');
    localStorage.setItem('budgetApp_userId', user.id);
    localStorage.setItem('budgetApp_authTimestamp', new Date().getTime().toString());
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    // Полностью очищаем сессию
    localStorage.removeItem('budgetApp_isAuthenticated');
    localStorage.removeItem('budgetApp_userId');
    localStorage.removeItem('budgetApp_authTimestamp');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '2rem'
      }}>
        💰 Загрузка...
      </div>
    );
  }

  return isAuthenticated && currentUser ? (
    <App onLogout={handleLogout} currentUser={currentUser} />
  ) : (
    <Login onLogin={handleLogin} />
  );
}

export default AuthWrapper;


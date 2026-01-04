import { useState, useEffect } from 'react';
import App from './App';
import Login from './Login';

function AuthWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Проверяем, вошел ли пользователь ранее
    const auth = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(auth === 'true');
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
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

  return isAuthenticated ? (
    <App onLogout={handleLogout} />
  ) : (
    <Login onLogin={handleLogin} />
  );
}

export default AuthWrapper;


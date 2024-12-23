// Frontend: Login.tsx
import React, { useState, useEffect } from 'react';
import '../Main.css';
import chatimg from '../../assets/chatimg.avif';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';



function Login() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError('');
  setSuccess(false);

  if (!email || !password) {
    setError("All fields are required");
    return;
  }

  try {
    const response = await axios.post('http://localhost:3000/login', {
      email,
      password,
    });

    if (response.data) {
      setSuccess(true);
      setError('');

      const { user } = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/chat', { state: { user } });
    }
  } catch (error: any) {
    setError(error.response?.data?.message || 'Login failed. Please try again.');
  }
};


  return (
    <>
      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      ) : (
        <div className="form-container">
          <h1>Login</h1>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">Login successful!</p>}
          <form className="form-content" onSubmit={handleSubmitForm}>
            <div className="form-group">
              <input
                type="email"
                placeholder="Enter your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete='true'
              />
              <input
                type="password"
                placeholder="Enter your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit">Login</button>
              <a href="#">Forgot Password?</a>
              <p>Don't have an account? <a href="/register">Register</a></p>
            </div>
            <div className="img-div">
              <img src={chatimg} alt="chatimg" />
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default Login;

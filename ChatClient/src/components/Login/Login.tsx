import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, MessageCircle } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
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
      const { data } = await axios.post('http://localhost:3000/api/login', {
        email,
        password,
      });

      if (data) {
        setSuccess(true);
        setError('');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/chat', { state: { user: data.user } });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(
        error.response?.data?.message || 
        error.message || 
        'Login failed. Please try again.'
      );
    }
  };

  return (
    <>
      {loading ? (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin animation-delay-150"></div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex flex-col lg:flex-row min-h-[600px]">
              {/* Left Side - Form */}
              <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center">
                <div className="max-w-md mx-auto w-full">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6">
                      <MessageCircle className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                    <p className="text-gray-600">Sign in to continue your conversations</p>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-700 text-sm font-medium">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-green-700 text-sm font-medium">Login successful!</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmitForm} className="space-y-6">
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                          required
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                        />
                      </div>

                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                          className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center group shadow-lg"
                    >
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                    </button>
                    <div className="text-center space-y-4">
                      <a
                        href="#"
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors duration-200"
                      >
                        Forgot your password?
                      </a>
                      <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <a
                          href="/register"
                          className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors duration-200"
                        >
                          Create one now
                        </a>
                      </p>
                    </div>
                  </form>
                </div>
              </div>

              <div className="flex-1 relative bg-gradient-to-br from-blue-600 to-purple-700 lg:min-h-0 min-h-[300px]">
                <div className="absolute inset-0 bg-black/20"></div>
                <img
                  src="https://images.pexels.com/photos/3183156/pexels-photo-3183156.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Chat illustration"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="text-center text-white">
                    <h2 className="text-3xl lg:text-4xl font-bold mb-4">Stay Connected</h2>
                    <p className="text-lg lg:text-xl opacity-90 max-w-md">
                      Join thousands of users having meaningful conversations every day
                    </p>
                  </div>
                </div>
                
                <div className="absolute top-8 right-8 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                <div className="absolute bottom-8 left-8 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl"></div>
                <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-blue-300/20 rounded-full blur-xl"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Login;
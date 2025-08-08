import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSuccess(false);
        setError('');
        setIsLoading(true);

        // Validation
        if (!name || !email || !password || !confirmPassword) {
            setError('All fields are required');
            setIsLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const { data } = await axios.post('http://localhost:3000/api/register', {
                name,
                email,
                password
            });
            
            if (data) {
                setSuccess(true);
                setError('');
                
                // Store token and user data automatically after registration
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                setTimeout(() => {
                    navigate('/', { state: { user: data.user } });
                }, 1500);
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            setError(
                error.response?.data?.message || 
                error.message || 
                'Registration failed. Please try again.'
            );
        } finally {
            setIsLoading(false); 
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl w-full space-y-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20">
                    <div className="flex flex-col lg:flex-row">
                        {/* Form Section */}
                        <div className="flex-1 px-6 py-12 sm:px-12">
                            <div className="max-w-md mx-auto">
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
                                        <UserPlus className="w-8 h-8 text-white" />
                                    </div>
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                                    <p className="text-gray-600">Join us today and start your journey</p>
                                </div>

                                {error && (
                                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-red-700">{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {success && (
                                    <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-green-700">Registration successful! Redirecting...</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-4">
                                        {/* Name Input */}
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input 
                                                type="text" 
                                                placeholder="Enter your Name" 
                                                value={name} 
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                autoComplete="name"
                                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white/50 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-white/70"
                                            />
                                        </div>

                                        {/* Email Input */}
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input 
                                                type="email" 
                                                placeholder="Enter your Email" 
                                                value={email} 
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                autoComplete="email"
                                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white/50 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-white/70"
                                            />
                                        </div>

                                        {/* Password Input */}
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input 
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter your Password (min 8 chars)" 
                                                value={password} 
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                autoComplete="new-password"
                                                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl leading-5 bg-white/50 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-white/70"
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                                ) : (
                                                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Confirm Password Input */}
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input 
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Confirm your password" 
                                                value={confirmPassword} 
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                autoComplete="new-password"
                                                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl leading-5 bg-white/50 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-white/70"
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                                ) : (
                                                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <button 
                                            type="submit" 
                                            disabled={isLoading}
                                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95"
                                        >
                                            {isLoading ? (
                                                <div className="flex items-center">
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                    Registering...
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <UserPlus className="w-5 h-5 mr-2" />
                                                    Create Account
                                                </div>
                                            )}
                                        </button>
                                    </div>

                                    <div className="text-center">
                                        <p className="text-sm text-gray-600">
                                            Already have an account?{' '}
                                            <a 
                                                href="/" 
                                                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                                            >
                                                Sign in here
                                            </a>
                                        </p>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Image Section */}
                        <div className="flex-1 hidden lg:block">
                            <div className="h-full relative overflow-hidden">
                                <img 
                                    src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800" 
                                    alt="Chat illustration" 
                                    className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
                                <div className="absolute bottom-8 left-8 right-8">
                                    <h3 className="text-white text-2xl font-bold mb-2">Join Our Community</h3>
                                    <p className="text-white/90 text-lg">Connect with people around the world and start meaningful conversations.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;
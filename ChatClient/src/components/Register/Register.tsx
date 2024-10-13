import React, { useState, useEffect } from 'react';
import '../Main.css';
import axios from 'axios';
import chating from '../../assets/chatimg.avif';
import { useNavigate } from 'react-router-dom';

function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
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

        if (name === '' || email === '' || password === '' || confirmPassword === '') {
            setError('All fields are required');
            setIsLoading(false);
            return;
        } else if (password.length < 8) {
            setError('Password must be at least 8 characters');
            setIsLoading(false);
            return;
        } else if (password !== confirmPassword) {
            setError('Password and Confirm Password do not match');
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.post('http://localhost:3000/register', {
                name,
                email,
                password
            });
            
            if (response.data) {
                setSuccess(true);
                setError('');
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            }
        } catch (error: any) {
            setError(error.response?.data?.message || 'Registration failed. Try again.');
        } finally {
            setIsLoading(false); 
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
                    <h1>Register</h1>
                    {error && <p className="error">{error}</p>}
                    {success && <p style={{color:'red'}} className="success">Registration successful! Redirecting...</p>}
                    <form className="form-content" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input 
                                type="text" 
                                placeholder="Enter your Name" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                            />
                            <input 
                                type="email" 
                                placeholder="Enter your Email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                            />
                            <input 
                                type="password" 
                                placeholder="Enter your Password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                            />
                            <input 
                                type="password" 
                                placeholder="Confirm your password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                            />
                            <button type="submit" disabled={isLoading}>
                                {isLoading ? 'Registering...' : 'Register'}
                            </button>
                            <p>Already have an account? <a href="/">Login</a></p>
                        </div>
                        <div className="img-div">
                            <img src={chating} alt="chatimg" />
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

export default Register;

import React,{useState} from 'react'
import '../Main.css'
import chating from '../../assets/chatimg.avif'
function Register() {
    const [name,setName] = useState('');
    const [email,setEmail] = useState('');
    const [password,setPassword] = useState('');
    const [confirmPassword,setConfirmPassword] = useState('');
    const [error,setError] = useState('');
    const [success,setSuccess] = useState(false);

    const handlesubmit = (e:React.FormEvent<HTMLFormElement>) =>{
        e.preventDefault();
        setSuccess(false);
        if(name === '' || email === '' || password === '' || confirmPassword === ''){
            setError('All fields are required');
        }
        else if(password.length < 8){
            setError('Password must be at least 8 characters');
        }
        else if(password !== confirmPassword){
            setError('Password and Confirm Password do not match');
        }
        
        else{
            setError('');
            setSuccess(true);
        }

    }
    
  return (
    <div className="form-container">
        <h1>Register</h1>
        {!success && <p className="error">{error}</p>}
        <form className="form-content" onSubmit={handlesubmit}>
            <div className="form-group">
                <input type="text" placeholder="Enter your Name" value={name} onChange={(e)=>setName(e.target.value)} />
                <input type="email" placeholder="Enter your Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
                <input type="password" placeholder="Enter your Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
                <input type="password" placeholder="Confirm your password " value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} />
                <button type="submit" >Register</button>
                <p>Don't have an account? <a href="/">Login</a></p>
            </div>
            <div className="img-div">
                <img src={chating} alt="chatimg" />
            </div>

        </form>
      
    </div>
  )
}

export default Register

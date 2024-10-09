import {useState} from 'react'
import '../Main.css'
import chatimg from '../../assets/chatimg.avif'
function Login() {
  const [email, setEmail] = useState('');
  const [password,setPassword] = useState('');


  return (
    <div className="form-container">
        <h1>Login</h1>
        <form className="form-content">
            <div className="form-group">
                <input type="text" placeholder="Enter your Email" value={email} onChange = {(e)=>setEmail(e.target.value)} />
                <input type="password" placeholder="Enter your Password" value={password} onChange = {(e)=>setPassword(e.target.value)}/>
                <button type="submit">Login</button>
                <a>Forgot Password?</a>
                <p>Don't have an account? <a href="/register">Register</a></p>
            </div>
            <div className="img-div">
                <img src={chatimg} alt="chatimg" />
            </div>

        </form>
      
    </div>
  )
}

export default Login

import React, {useState} from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'





const Login = () => {

    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate()


    const [email, setEmail] = React.useState("")
    const [password, setPassword] = React.useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        await handleLogin({email, password})
        navigate("/")
    }

    if(loading) {
        return (<main className="auth-page">
            <h1>Loading...</h1>
        </main>)
    }


  return (
    <main className="auth-page">
        <div className="auth-shell">
            <section className="auth-showcase">
                <div className="auth-badge">AI Interview Studio</div>
                <h1>Turn every interview into a prepared, premium experience.</h1>
                <p>
                    Analyze job descriptions, tailor your profile, and review beautifully organized interview plans in one focused workspace.
                </p>
                <div className="auth-metrics">
                    <div className="metric-card">
                        <strong>Live AI</strong>
                        <span>Role-specific interview planning</span>
                    </div>
                    <div className="metric-card">
                        <strong>Fast Prep</strong>
                        <span>Questions, gaps, and roadmap in minutes</span>
                    </div>
                </div>
            </section>

            <div className="form-container">
                <div className="form-intro">
                    <span className="form-eyebrow">Welcome back</span>
                    <h2>Login to continue</h2>
                    <p>Access your interview plans, reports, and preparation workflow.</p>
                </div>

        
                <form onSubmit={handleSubmit}>

                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <div className="field-shell">
                            <span className="field-icon">✉</span>
                            <input 
                            onChange={(e) => {setEmail(e.target.value)}}
                            type="email" id="email" name="email" placeholder="Enter your email" required />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <div className="field-shell">
                            <span className="field-icon">•</span>
                            <input 
                            onChange={(e) => {setPassword(e.target.value)}}
                            type="password" id="password" name="password" placeholder="Enter your password" required />
                        </div>
                    </div>

                    <button className='button primary-button'>Login</button>


                </form>

                <p className="form-switch">Don't have an account? <Link to="/register">Register here</Link></p>


            </div>
        </div>
    </main>
  )
}

export default Login

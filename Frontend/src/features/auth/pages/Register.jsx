import React, { useState } from 'react'

import { useNavigate, Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import "../auth.form.scss"

const Register = () => {


    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")


    const { loading, handleRegister } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        await handleRegister({ username, email, password })
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
                <div className="auth-badge">Launch your prep workspace</div>
                <h1>Build a focused interview system that feels like a modern AI product.</h1>
                <p>
                    Save reports, compare opportunities, and prepare with a clean workspace designed for clarity and momentum.
                </p>
                <div className="auth-metrics">
                    <div className="metric-card">
                        <strong>Premium UI</strong>
                        <span>Designed for fast reading and better decisions</span>
                    </div>
                    <div className="metric-card">
                        <strong>Role Ready</strong>
                        <span>Generate tailored plans for every application</span>
                    </div>
                </div>
            </section>

            <div className="form-container">
                <div className="form-intro">
                    <span className="form-eyebrow">Create account</span>
                    <h2>Start for free</h2>
                    <p>Set up your account to save reports and continue your interview prep.</p>
                </div>

        
                <form onSubmit={handleSubmit}>


                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <div className="field-shell">
                            <span className="field-icon">◌</span>
                            <input 
                            onChange={(e) => {setUsername(e.target.value)}}
                            type="text" id="username" name="username" placeholder="Enter your username" required />
                        </div>
                    </div>

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

                    <button className='button primary-button'>Register</button>


                </form>


                <p className="form-switch">Already have an account? <Link to="/login">Login here</Link></p>


            </div>
        </div>
    </main>
  )
}

export default Register

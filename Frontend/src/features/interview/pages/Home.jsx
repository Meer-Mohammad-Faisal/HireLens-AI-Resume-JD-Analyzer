import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import UserMenu from '../../auth/components/UserMenu.jsx'
import { useInterview } from '../hooks/useinterview.js'
import '../style/home.scss'

const UploadIllustration = ({ isDragging }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="34"
    height="34"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {isDragging ? (
      <>
        <path d="M12 3v11" />
        <path d="m8 7 4-4 4 4" />
        <path d="M4 14v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" />
        <path d="M8 17h8" />
      </>
    ) : (
      <>
        <path d="M12 16V5" />
        <path d="m8 9 4-4 4 4" />
        <path d="M5 19a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 1 2.5-2.5h1" />
        <path d="M19 19a2 2 0 0 0 2-2v-1.5a2.5 2.5 0 0 0-2.5-2.5h-1" />
        <path d="M8 19h8" />
      </>
    )}
  </svg>
)

const Home = () => {
  const { generateReport, error, reports, getReports } = useInterview()
  const resumeInputRef = useRef()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    jobDescription: '',
    resume: null,
    selfDescription: '',
    roadmapDays: ''
  })
  const [charCount, setCharCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const MAX_CHARS = 5000

  useEffect(() => {
    if (getReports) {
      getReports().catch(() => {})
    }
  }, [getReports])

  const handleGenerateReport = async () => {
    setLocalError(null)
    setIsGenerating(true)

    try {
      const resumeFile = resumeInputRef.current.files?.[0]
      const roadmapDays = Number.parseInt(formData.roadmapDays, 10)

      if (!formData.jobDescription.trim()) {
        setLocalError('Please provide a job description')
        return
      }

      if (!formData.resume && !formData.selfDescription.trim()) {
        setLocalError('Please provide either a resume or self description')
        return
      }

      if (!Number.isInteger(roadmapDays) || roadmapDays < 1) {
        setLocalError('Please enter a valid number of roadmap days')
        return
      }

      const data = await generateReport({
        jobDescription: formData.jobDescription,
        selfDescription: formData.selfDescription,
        resumeFile: formData.resume || resumeFile,
        roadmapDays
      })

      if (data?._id) {
        navigate(`/interview/${data._id}`)
      } else {
        setLocalError('Invalid response from server. Please try again.')
      }
    } catch (err) {
      console.error('Generate report error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleJobDescriptionChange = (e) => {
    const value = e.target.value

    if (value.length <= MAX_CHARS) {
      setFormData((prev) => ({
        ...prev,
        jobDescription: value
      }))
    }
  }

  const handleSelfDescriptionChange = (e) => {
    const value = e.target.value

    if (value.length <= MAX_CHARS) {
      setFormData((prev) => ({
        ...prev,
        selfDescription: value
      }))
      setCharCount(value.length)
    }
  }

  const handleRoadmapDaysChange = (e) => {
    const value = e.target.value

    if (value === '' || /^\d+$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        roadmapDays: value
      }))
    }
  }

  const validateAndSetResume = (file) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const maxSize = 5 * 1024 * 1024

    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
      alert('Please upload PDF or DOCX files only.')
      return false
    }

    if (file.size > maxSize) {
      alert('File size must be less than 5MB.')
      return false
    }

    setFormData((prev) => ({
      ...prev,
      resume: file
    }))

    return true
  }

  const handleResumeChange = (e) => {
    const file = e.target.files?.[0]

    if (file) {
      validateAndSetResume(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]

    if (file) {
      validateAndSetResume(file)
    }
  }

  const handleRemoveResume = () => {
    setFormData((prev) => ({
      ...prev,
      resume: null
    }))

    const fileInput = document.getElementById('resume')
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleFileLabelClick = () => {
    document.getElementById('resume').click()
  }

  const hasResumeOrDescription = Boolean(formData.resume) || formData.selfDescription.trim().length > 0
  const parsedRoadmapDays = Number.parseInt(formData.roadmapDays, 10)
  const hasValidRoadmapDays = Number.isInteger(parsedRoadmapDays) && parsedRoadmapDays > 0
  const isFormValid = formData.jobDescription.trim().length > 0 && hasResumeOrDescription && hasValidRoadmapDays

  return (
    <main className='home'>
      <div className="container">
        <UserMenu />

        <header className="interview-header">
          <div className="header-badge">
            <span className="badge-icon">✨</span>
            <span>AI-Powered</span>
          </div>

          <h1>Create Your Custom <span className="highlight-text">Interview Plan</span></h1>
          <p className="subtitle">Let our AI analyze the job requirements and your unique profile to build a winning strategy.</p>

          <div className="header-stats">
            <div className="header-stat">
              <strong>Live AI</strong>
              <span>Groq-powered personalization</span>
            </div>
            <div className="header-stat">
              <strong>{reports?.length || 0}</strong>
              <span>Saved reports</span>
            </div>
            <div className="header-stat">
              <strong>{hasValidRoadmapDays ? `${parsedRoadmapDays}-Day` : 'Your Pace'}</strong>
              <span>User-defined preparation roadmap</span>
            </div>
          </div>
        </header>

        <div className="interview-input-group">
          <div className="left-section dashboard-card">
            <div className="section-header">
              <span className="section-icon">🎯</span>
              <h2>Target Job Description</h2>
              <span className="required-badge">Required</span>
            </div>

            <div className="textarea-wrapper">
              <textarea
                onChange={handleJobDescriptionChange}
                name="jobDescription"
                id="jobDescription"
                placeholder="Paste the full job description here...\n e.g. Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design..."
                value={formData.jobDescription}
                className="job-description-textarea"
              />
              <div className="char-counter">
                <span className={formData.jobDescription.length > 0 ? 'active' : ''}>
                  {formData.jobDescription.length}
                </span> / {MAX_CHARS} chars
              </div>
            </div>

            <div className="section-tip">
              <span className="tip-icon">💡</span>
              <span>Paste the complete job description for better AI analysis</span>
            </div>
          </div>

          <div className="right-section dashboard-card">
            <div className='input-group resume-group'>
              <div className="group-header">
                <span className="section-icon">👤</span>
                <h3>Your Profile</h3>
              </div>

              <div className='resume-upload-section'>
                <div className="upload-label">
                  <span>Upload Resume</span>
                  <span className="optional-badge">Optional</span>
                </div>

                <div
                  className={`file-label ${isDragging ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleFileLabelClick}
                >
                  <div className="upload-icon">
                    <UploadIllustration isDragging={isDragging} />
                  </div>
                  <p>{isDragging ? 'Drop your file here' : 'Click to upload or drag & drop'}</p>
                  <span className="file-info">PDF or DOCX (Max 5MB)</span>
                </div>

                <input
                  ref={resumeInputRef}
                  type="file"
                  id="resume"
                  name="resume"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  style={{ display: 'none' }}
                />

                {formData.resume && (
                  <div className="file-name">
                    <span className="file-icon">✓</span>
                    {formData.resume.name}
                    <button
                      className="remove-file"
                      onClick={handleRemoveResume}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className='input-group'>
              <label className="input-label" htmlFor="selfDescription">
                <span>Quick Self Description</span>
                <span className="optional-badge small">Optional if resume provided</span>
              </label>
              <div className="textarea-wrapper">
                <textarea
                  onChange={handleSelfDescriptionChange}
                  name="selfDescription"
                  id="selfDescription"
                  placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                  value={formData.selfDescription}
                  className="self-description-textarea"
                />
                <div className="char-counter">
                  <span>{charCount}</span> / {MAX_CHARS} chars
                </div>
              </div>
            </div>

            <div className='input-group'>
              <label className="input-label" htmlFor="roadmapDays">
                <span>Roadmap Duration</span>
                <span className="optional-badge small">Required</span>
              </label>
              <div className="roadmap-days-field">
                <input
                  type="number"
                  id="roadmapDays"
                  name="roadmapDays"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={formData.roadmapDays}
                  onChange={handleRoadmapDaysChange}
                  className="roadmap-days-input"
                  placeholder="Enter number of days"
                />
                <p className="roadmap-days-hint">
                  Enter how many days you want for your preparation roadmap, and the plan will be generated for that duration.
                </p>
              </div>
            </div>

            <div className={`requirement-note ${hasResumeOrDescription ? 'satisfied' : 'warning'}`}>
              <span className="note-icon">{hasResumeOrDescription ? '✅' : 'ℹ️'}</span>
              <p>
                {hasResumeOrDescription ? <strong>Profile ready!</strong> : <strong>Either a Resume or Self Description</strong>}
                {' '}is required to generate a personalized plan.
              </p>
            </div>

            {(error || localError) && (
              <div className="requirement-note warning">
                <span className="note-icon">⚠️</span>
                <p>{error || localError}</p>
              </div>
            )}

            <button
              className='generate-btn'
              onClick={handleGenerateReport}
              disabled={!isFormValid || isGenerating}
            >
              <span className="btn-icon">{isGenerating ? '⏳' : '⚡'}</span>
              {isGenerating ? 'Generating Strategy...' : 'Generate My Interview Strategy'}
              <span className="btn-glow" />
            </button>

            <p className="footer-text">
              <span className="footer-icon">🤖</span>
              AI-Powered Strategy Generation • Approx 30s
              <span className="footer-icon">🔒</span>
            </p>
          </div>

          {reports?.length > 0 && (
            <aside className="all-reports dashboard-card">
              <div className="reports-header">
                <div>
                  <h3 className="recent-header">All Reports</h3>
                  <p className="reports-subtitle">Recent interview plans and saved sessions</p>
                </div>
                <span className="reports-chip">{reports.length}</span>
              </div>

              <ul className="report-list">
                {reports.map((r) => {
                  const id = r._id || r.id
                  const dateVal = r.createdAt || r.date || r.created_at
                  const date = dateVal ? new Date(dateVal).toLocaleDateString() : '—'
                  const score = r.matchScore ?? r.score ?? 0
                  const sourceLabel = r.source === 'ai' ? 'Live Groq' : 'Saved Report'

                  return (
                    <li
                      key={id || `${date}-${score}`}
                      className="report-item"
                      onClick={() => id && navigate(`/interview/${id}`)}
                      style={{ cursor: id ? 'pointer' : 'default' }}
                    >
                      <div className="report-meta">
                        <span className="report-date">{r.title || 'Interview Report'}</span>
                        <span className="report-date">{date}</span>
                      </div>
                      <div className="report-badges">
                        <span className="report-score">Score: {score}</span>
                        <span className="report-source">{sourceLabel}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </aside>
          )}
        </div>
      </div>
    </main>
  )
}

export default Home

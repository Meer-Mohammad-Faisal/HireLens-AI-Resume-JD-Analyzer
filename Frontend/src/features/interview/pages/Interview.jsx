import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import UserMenu from '../../auth/components/UserMenu.jsx'
import { useInterview } from '../hooks/useinterview.js'
import '../style/interview.scss'

const NAV_ITEMS = [
    {
        id: 'technical',
        label: 'Technical Questions',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>
        )
    },
    {
        id: 'behavioral',
        label: 'Behavioral Questions',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        )
    },
    {
        id: 'roadmap',
        label: 'Road Map',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
        )
    }
]

const QuestionCard = ({ item, index }) => {
    const [open, setOpen] = useState(false)

    return (
        <div className={`q-card ${open ? 'q-card--open' : ''}`}>
            <div className='q-card__header' onClick={() => setOpen((value) => !value)} aria-expanded={open}>
                <span className='q-card__index'>Q{index + 1}</span>
                <p className='q-card__question'>{item.question}</p>
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </div>

            <div className={`q-card__body ${open ? 'q-card__body--open' : ''}`}>
                <div className='q-card__section'>
                    <span className='q-card__tag q-card__tag--intention'>Intention</span>
                    <p>{item.intention}</p>
                </div>
                <div className='q-card__section'>
                    <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                    <p>{item.answer}</p>
                </div>
            </div>
        </div>
    )
}

const RoadMapDay = ({ day }) => (
    <div className='roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {day.tasks.map((task, index) => (
                <li key={index}>
                    <span className='roadmap-day__bullet' />
                    {task}
                </li>
            ))}
        </ul>
    </div>
)

const Interview = () => {
    const [activeNav, setActiveNav] = useState('technical')
    const { interviewId } = useParams()
    const { report, getReportById, getResumePdf, isDownloadingResume, downloadError } = useInterview()

    useEffect(() => {
        if (interviewId && getReportById) {
            getReportById(interviewId).catch(() => {})
        }
    }, [interviewId, getReportById])

    const currentReport = report || {
        title: 'Interview Report',
        source: 'unknown',
        technicalQuestions: [],
        behavioralQuestions: [],
        preparationPlan: [],
        skillGaps: [],
        matchScore: 0
    }

    const scoreColor =
        currentReport.matchScore >= 80 ? 'score--high'
            : currentReport.matchScore >= 60 ? 'score--mid'
                : 'score--low'

    const getScoreMessage = () => {
        if (currentReport.matchScore >= 80) return 'Strong match for this role'
        if (currentReport.matchScore >= 60) return 'Good match for this role'
        return 'Fair match for this role'
    }

    const activeSectionLabel = NAV_ITEMS.find((item) => item.id === activeNav)?.label || 'Interview Plan'
    const totalQuestionCount = currentReport.technicalQuestions.length + currentReport.behavioralQuestions.length
    const nextRoadmapFocus = currentReport.preparationPlan[0]?.focus || 'No roadmap generated yet.'
    const highestPriorityGap = currentReport.skillGaps[0]?.skill || 'Skill gaps will appear here after generation.'

    return (
        <div className='interview-page'>
            <UserMenu />

            <div className='interview-layout'>
                <nav className='interview-nav'>
                    <div className="nav-content">
                        <p className='interview-nav__label'>Sections</p>
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                onClick={() => setActiveNav(item.id)}
                            >
                                <span className='interview-nav__icon'>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className='interview-nav__footer'>
                        <button
                            onClick={() => { getResumePdf(interviewId).catch(() => {}) }}
                            className={`download-btn ${isDownloadingResume ? 'download-btn--loading' : ''}`}
                            disabled={isDownloadingResume}
                            aria-busy={isDownloadingResume}
                        >
                            <svg height="14" style={{ marginRight: '0.8rem' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 3.99a1 1 0 0 1-1.4 0l-4-3.99a1 1 0 1 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
                            </svg>
                            {isDownloadingResume ? 'Downloading your resume...' : 'Download Resume'}
                        </button>

                        <p className={`download-status ${downloadError ? 'download-status--error' : ''}`}>
                            {downloadError
                                ? downloadError
                                : isDownloadingResume
                                    ? 'Downloading your resume. Your PDF will start automatically.'
                                    : 'Download a polished PDF version of your resume.'}
                        </p>

                        <div className='nav-summary'>
                            <p className='nav-summary__label'>Plan Snapshot</p>
                            <div className='nav-summary__grid'>
                                <div className='nav-summary__item'>
                                    <strong>{currentReport.technicalQuestions.length}</strong>
                                    <span>Technical</span>
                                </div>
                                <div className='nav-summary__item'>
                                    <strong>{currentReport.behavioralQuestions.length}</strong>
                                    <span>Behavioral</span>
                                </div>
                                <div className='nav-summary__item'>
                                    <strong>{currentReport.preparationPlan.length}</strong>
                                    <span>Days</span>
                                </div>
                            </div>
                            <p className='nav-summary__note'>
                                You are viewing <strong>{activeSectionLabel}</strong>. Next focus: {nextRoadmapFocus}
                            </p>
                        </div>
                    </div>
                </nav>

                <div className='interview-divider' />

                <main className='interview-content'>
                    <section className='content-header content-header--hero'>
                        <div>
                            <h2>{currentReport.title || 'Interview Report'}</h2>
                            <span className='content-header__count'>
                                {currentReport.source === 'ai' ? 'Generated live with Groq' : 'Saved interview report'}
                            </span>
                            <p className='content-header__description'>
                                Review the generated questions, identify the main skill gaps, and work through the roadmap with a calm, structured flow.
                            </p>
                        </div>
                    </section>

                    {activeNav === 'technical' && (
                        <section>
                            <div className='content-header'>
                                <h2>Technical Questions</h2>
                                <span className='content-header__count'>{currentReport.technicalQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {currentReport.technicalQuestions.map((item, index) => (
                                    <QuestionCard key={index} item={item} index={index} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'behavioral' && (
                        <section>
                            <div className='content-header'>
                                <h2>Behavioral Questions</h2>
                                <span className='content-header__count'>{currentReport.behavioralQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {currentReport.behavioralQuestions.map((item, index) => (
                                    <QuestionCard key={index} item={item} index={index} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'roadmap' && (
                        <section>
                            <div className='content-header'>
                                <h2>Preparation Road Map</h2>
                                <span className='content-header__count'>{currentReport.preparationPlan.length}-day plan</span>
                            </div>
                            <div className='roadmap-list'>
                                {currentReport.preparationPlan.map((day) => (
                                    <RoadMapDay key={day.day} day={day} />
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                <div className='interview-divider' />

                <aside className='interview-sidebar'>
                    <div className='match-score'>
                        <p className='match-score__label'>Match Score</p>
                        <div className={`match-score__ring ${scoreColor}`} style={{ '--score': `${currentReport.matchScore}%` }}>
                            <span className='match-score__value'>{currentReport.matchScore}</span>
                            <span className='match-score__pct'>%</span>
                        </div>
                        <p className='match-score__sub'>{getScoreMessage()}</p>
                    </div>

                    <div className='sidebar-divider' />

                    <div className='skill-gaps'>
                        <p className='skill-gaps__label'>Skill Gaps</p>
                        <div className='skill-gaps__list'>
                            {currentReport.skillGaps.map((gap, index) => (
                                <span key={index} className={`skill-tag skill-tag--${gap.severity}`}>
                                    {gap.skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className='report-insights'>
                        <p className='report-insights__label'>Report Overview</p>
                        <div className='report-insights__list'>
                            <div className='report-insights__item'>
                                <span>Total Questions</span>
                                <strong>{totalQuestionCount}</strong>
                            </div>
                            <div className='report-insights__item'>
                                <span>Roadmap Duration</span>
                                <strong>{currentReport.preparationPlan.length} days</strong>
                            </div>
                            <div className='report-insights__item'>
                                <span>Priority Gap</span>
                                <strong>{highestPriorityGap}</strong>
                            </div>
                        </div>
                        <div className='report-insights__focus'>
                            <span>Current section</span>
                            <strong>{activeSectionLabel}</strong>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default Interview

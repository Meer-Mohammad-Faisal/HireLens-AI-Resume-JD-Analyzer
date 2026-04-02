import React, { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { useAuth } from "../hooks/useAuth"

const getInitials = (user) => {
    const source = user?.username || user?.email || "User"
    const parts = String(source).trim().split(/\s+/).filter(Boolean)

    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }

    return source.slice(0, 2).toUpperCase()
}

const UserMenu = () => {
    const [open, setOpen] = useState(false)
    const menuRef = useRef(null)
    const navigate = useNavigate()
    const location = useLocation()
    const { user, loading, handleLogout } = useAuth()

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    if (!user) {
        return null
    }

    const isHomePage = location.pathname === "/"
    const initials = getInitials(user)

    const onNavigateHome = () => {
        setOpen(false)
        navigate("/")
    }

    const onLogout = async () => {
        try {
            await handleLogout()
        } finally {
            setOpen(false)
            navigate("/login")
        }
    }

    return (
        <div className="user-menu-shell" ref={menuRef}>
            <button
                type="button"
                className={`user-menu__trigger ${open ? "user-menu__trigger--open" : ""}`}
                onClick={() => setOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Open profile menu for ${user.username || user.email || "user"}`}
            >
                <span className="user-menu__avatar">{initials}</span>
                <span className={`user-menu__chevron ${open ? "user-menu__chevron--open" : ""}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </button>

            {open && (
                <div className="user-menu__panel" role="menu">
                    <div className="user-menu__panel-header">
                        <span className="user-menu__avatar user-menu__avatar--large">{initials}</span>
                        <div className="user-menu__panel-copy">
                            <strong>{user.username || "Profile"}</strong>
                            <span>{user.email}</span>
                        </div>
                    </div>

                    {!isHomePage && (
                        <button type="button" className="user-menu__action" onClick={onNavigateHome} role="menuitem">
                            Go to Dashboard
                        </button>
                    )}

                    <button
                        type="button"
                        className="user-menu__action user-menu__action--danger"
                        onClick={onLogout}
                        role="menuitem"
                        disabled={loading}
                    >
                        {loading ? "Signing out..." : "Logout"}
                    </button>
                </div>
            )}
        </div>
    )
}

export default UserMenu

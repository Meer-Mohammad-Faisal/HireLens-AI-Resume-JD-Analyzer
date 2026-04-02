const fallbackApiBaseUrl = "http://localhost:3000"

export const apiBaseUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    fallbackApiBaseUrl
).replace(/\/$/, "")

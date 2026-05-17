import AxiosInstance from "../api/AxiosIntance";
import { handleRequest } from "../api/apiHandler";

const AuthService = {

    /**
     * Fetch the CSRF cookie from Sanctum (required before login).
     */
    csrf: () =>
        AxiosInstance.get("/sanctum/csrf-cookie", {
            baseURL: import.meta.env.VITE_API_URL,
        }),

    /**
     * Login with email + password (session-based).
     */
    login: (credentials: { email: string; password: string }) =>
        handleRequest(
            AxiosInstance.post("auth/login", credentials),
            "Login failed.",
            { returnFullResponse: true }
        ),

    /**
     * Register a student or teacher account (session-based).
     */
    register: (data: {
        name: string;
        email: string;
        role: "student" | "teacher";
        password: string;
        password_confirmation: string;
    }) =>
        handleRequest(
            AxiosInstance.post("auth/register", data),
            "Registration failed.",
            { returnFullResponse: true, silentStatuses: [401, 419, 422, 503] }
        ),

    /**
     * Get the currently authenticated user.
     */
    me: () =>
        handleRequest(
            AxiosInstance.get("user/auth/me"),
            "Failed to fetch current user.",
            { silentStatuses: [401, 419] }
        ),

    /**
     * Logout the current user.
     */
    logout: () =>
        handleRequest(
            AxiosInstance.post("auth/logout"),
            "Logout failed."
        ),
};

export default AuthService;

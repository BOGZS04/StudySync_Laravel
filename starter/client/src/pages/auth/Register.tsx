import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { Button, ToastProvider } from "../../components/ui/index";
import { InputField, PasswordInputField, Select, Checkbox } from "../../components/ui/forms/index";
import { useAuth } from "../../contexts/AuthContext";
import { PATHS } from "../../routes/path";
import AuthService from "../../services/AuthService";
import { notify } from "../../util/notify";
import BrandLogo from "../../assets/vite.svg";

type RegisterRole = "student" | "teacher";

interface RegisterErrors {
    name?: string;
    email?: string;
    role?: string;
    password?: string;
    password_confirmation?: string;
    terms?: string;
}

const Register: React.FC = () => {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<RegisterRole>("student");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [errors, setErrors] = useState<RegisterErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    const validate = (): boolean => {
        const newErrors: RegisterErrors = {};

        if (!name.trim()) newErrors.name = "Name is required.";
        if (!email.trim()) {
            newErrors.email = "Email is required.";
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = "Please enter a valid email.";
        }
        if (!password) newErrors.password = "Password is required.";
        if (password && password.length < 8) newErrors.password = "Password must be at least 8 characters.";
        if (password !== passwordConfirmation) {
            newErrors.password_confirmation = "Passwords do not match.";
        }
        if (!acceptedTerms) newErrors.terms = "Please accept the terms to continue.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        try {
            await AuthService.csrf();
            await AuthService.register({
                name,
                email,
                role,
                password,
                password_confirmation: passwordConfirmation,
            });
            await refreshUser();
            notify.success("Welcome to StudySync!");
            navigate(PATHS.APP.DASHBOARD, { replace: true });
        } catch (err) {
            const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
            const data = axiosErr.response?.data;

            if (axiosErr.response?.status === 422 && data?.errors) {
                setErrors({
                    name: data.errors.name?.[0],
                    email: data.errors.email?.[0],
                    role: data.errors.role?.[0],
                    password: data.errors.password?.[0],
                    password_confirmation: data.errors.password_confirmation?.[0],
                });
            } else if (axiosErr.response?.status === 419) {
                notify.error("Your session expired. Please refresh the page and try again.");
            } else if (!axiosErr.response) {
                notify.error("Could not reach the server. Please check that Laravel is running.");
            } else {
                notify.error(data?.message || "Registration failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen w-full flex flex-col lg:flex-row bg-bg-dark">
                <div className="relative w-full lg:w-1/2 flex flex-col items-center justify-center px-8 py-12 lg:py-0 overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-bg-dark to-secondary/10" />
                    <div className="relative z-10 flex flex-col items-center text-center gap-6 max-w-md">
                        <div className="relative bg-bg-light/10 backdrop-blur-xl border border-border-muted/40 rounded-3xl p-8 shadow-lg">
                            <img src={BrandLogo} alt="StudySync Logo" className="w-24 h-24 lg:w-32 lg:h-32 drop-shadow-lg" />
                        </div>
                        <div className="space-y-3">
                            <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-text">
                                StudySync
                            </h1>
                            <p className="text-sm lg:text-base font-semibold uppercase tracking-[0.3em] text-text-muted">
                                Academic command center
                            </p>
                        </div>
                        <p className="text-text-muted text-sm lg:text-base leading-relaxed max-w-xs">
                            Bring classes, deadlines, study plans, and progress into one focused workspace.
                        </p>
                    </div>
                </div>

                <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 lg:py-0">
                    <div className="w-full max-w-md">
                        <div className="bg-bg-main border border-border-muted rounded-3xl p-8 lg:p-10 shadow-lg space-y-8">
                            <div className="space-y-2">
                                <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter text-text">
                                    Create Account
                                </h2>
                                <p className="text-sm text-text-muted font-medium">
                                    Start as a student or teacher. Admin roles stay invite-only.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5" id="register-form">
                                <InputField
                                    label="Name"
                                    name="name"
                                    placeholder="Your full name"
                                    iconName="FaUser"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                                    }}
                                    error={errors.name}
                                    fullWidth
                                    required
                                />

                                <InputField
                                    label="Email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    iconName="FaEnvelope"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                                    }}
                                    error={errors.email}
                                    fullWidth
                                    required
                                    autoComplete="email"
                                />

                                <Select
                                    label="Role"
                                    name="role"
                                    iconName="FaGraduationCap"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as RegisterRole)}
                                    options={[
                                        { value: "student", label: "Student" },
                                        { value: "teacher", label: "Teacher" },
                                    ]}
                                    error={errors.role}
                                    fullWidth
                                    required
                                />

                                <PasswordInputField
                                    label="Password"
                                    name="password"
                                    placeholder="Create a password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                                    }}
                                    error={errors.password}
                                    fullWidth
                                    required
                                    autoComplete="new-password"
                                />

                                <PasswordInputField
                                    label="Confirm Password"
                                    name="password_confirmation"
                                    placeholder="Repeat your password"
                                    value={passwordConfirmation}
                                    onChange={(e) => {
                                        setPasswordConfirmation(e.target.value);
                                        if (errors.password_confirmation) {
                                            setErrors((prev) => ({ ...prev, password_confirmation: undefined }));
                                        }
                                    }}
                                    error={errors.password_confirmation}
                                    fullWidth
                                    required
                                    autoComplete="new-password"
                                />

                                <div className="space-y-2">
                                    <Checkbox
                                        label="I agree to the StudySync terms"
                                        checked={acceptedTerms}
                                        onChange={(e) => {
                                            setAcceptedTerms(e.target.checked);
                                            if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                                        }}
                                    />
                                    {errors.terms && (
                                        <span className="block text-sm font-medium text-danger ml-1">
                                            {errors.terms}
                                        </span>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    fullWidth
                                    isLoading={isLoading}
                                    loadingText="Creating..."
                                    iconName="FaUserPlus"
                                    size="lg"
                                    id="register-submit-btn"
                                >
                                    Create Account
                                </Button>
                            </form>

                            <p className="text-center text-sm text-text-muted">
                                Already have an account?{" "}
                                <Link
                                    to={PATHS.LOGIN}
                                    className="font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors duration-200"
                                >
                                    Sign In
                                </Link>
                            </p>
                        </div>

                        <p className="text-center text-xs text-text-muted/60 mt-6 font-medium tracking-wide">
                            &copy; {new Date().getFullYear()} StudySync. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>

            <ToastProvider />
        </>
    );
};

export default Register;

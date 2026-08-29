import { useFormik } from "formik";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as Yup from "yup";
import TextInput from "../components/TextInput";
import usePostRegister from "../hooks/api/usePostRegister";

interface RegisterValues {
  fullname: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function hasTenantSession() {
  try {
    const auth = JSON.parse(window.localStorage.getItem("auth") ?? "null") as
      | { user_type?: string }
      | null;
    return Boolean(auth && auth.user_type?.toUpperCase() !== "SUPERADMIN");
  } catch {
    return false;
  }
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { mutateAsync: register, isLoading } = usePostRegister();
  const formik = useFormik<RegisterValues>({
    initialValues: {
      fullname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      fullname: Yup.string().trim().required("Full name is required."),
      email: Yup.string().trim().email("Enter a valid email address.").required("Email is required."),
      password: Yup.string().min(6, "Password must be at least 6 characters.").required("Password is required."),
      confirmPassword: Yup.string().oneOf([Yup.ref("password")], "Passwords do not match.").required("Confirm your password."),
    }),
    onSubmit: async (values) => {
      try {
        const response = await register({
          fullname: values.fullname.trim(),
          email: values.email.trim(),
          password: values.password,
          user_type: "EMPLOYEE",
        });
        toast.success(response.message || "Account created successfully.");
        navigate("/login", { replace: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create account.";
        toast.error(message);
      }
    },
  });

  if (hasTenantSession()) return <Navigate to="/dashboard" replace />;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">EMI</div>
          <div>
            <div className="auth-title">Create an account</div>
            <div className="auth-sub">Join your team on EMI Inventory</div>
          </div>
        </div>

        <form onSubmit={formik.handleSubmit}>
          <TextInput
            label="Full Name"
            isRequired
            value={formik.values.fullname}
            onChange={(value) => formik.setFieldValue("fullname", value)}
            placeholder="Your full name"
            errorText={formik.touched.fullname ? formik.errors.fullname : undefined}
          />
          <TextInput
            label="Email"
            isRequired
            inputType="email"
            value={formik.values.email}
            onChange={(value) => formik.setFieldValue("email", value)}
            placeholder="you@company.com"
            errorText={formik.touched.email ? formik.errors.email : undefined}
          />
          <TextInput
            label="Password"
            isRequired
            inputType="password"
            value={formik.values.password}
            onChange={(value) => formik.setFieldValue("password", value)}
            placeholder="At least 6 characters"
            errorText={formik.touched.password ? formik.errors.password : undefined}
          />
          <TextInput
            label="Confirm Password"
            isRequired
            inputType="password"
            value={formik.values.confirmPassword}
            onChange={(value) => formik.setFieldValue("confirmPassword", value)}
            placeholder="Repeat your password"
            errorText={formik.touched.confirmPassword ? formik.errors.confirmPassword : undefined}
          />
          <button type="submit" className="btn-primary btn auth-submit" disabled={isLoading}>
            {isLoading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <div className="auth-footer-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
        <div className="auth-hint">
          New self-service accounts are created with the Employee role.
        </div>
      </div>
    </div>
  );
}

import { useFormik } from "formik";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as Yup from "yup";
import TextInput from "../components/TextInput";
import usePostRegister from "../hooks/api/usePostRegister";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      fullname: Yup.string().trim().required(t("validation.fullNameRequired")),
      email: Yup.string().trim().email(t("validation.emailInvalid")).required(t("validation.emailRequired")),
      password: Yup.string().min(6, t("validation.passwordMin")).required(t("validation.passwordRequired")),
      confirmPassword: Yup.string().oneOf([Yup.ref("password")], t("validation.passwordMismatch")).required(t("validation.confirmPasswordRequired")),
    }),
    onSubmit: async (values) => {
      try {
        const response = await register({
          fullname: values.fullname.trim(),
          email: values.email.trim(),
          password: values.password,
          user_type: "EMPLOYEE",
        });
        toast.success(response.message || t("auth.createAccountAction"));
        navigate("/login", { replace: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : t("wording.failedToCreateAccount");
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
            <div className="auth-title">{t("auth.createAccount")}</div>
            <div className="auth-sub">{t("auth.joinTeam")}</div>
          </div>
        </div>

        <form onSubmit={formik.handleSubmit}>
          <TextInput
            label={t("auth.fullName")}
            isRequired
            value={formik.values.fullname}
            onChange={(value) => formik.setFieldValue("fullname", value)}
            placeholder={t("auth.yourFullName")}
            errorText={formik.touched.fullname ? formik.errors.fullname : undefined}
          />
          <TextInput
            label={t("wording.email")}
            isRequired
            inputType="email"
            value={formik.values.email}
            onChange={(value) => formik.setFieldValue("email", value)}
            placeholder={t("wording.youCompanyCom")}
            errorText={formik.touched.email ? formik.errors.email : undefined}
          />
          <TextInput
            label={t("auth.password")}
            isRequired
            inputType="password"
            value={formik.values.password}
            onChange={(value) => formik.setFieldValue("password", value)}
            placeholder={t("wording.atLeast6Characters")}
            errorText={formik.touched.password ? formik.errors.password : undefined}
          />
          <TextInput
            label={t("auth.confirmPassword")}
            isRequired
            inputType="password"
            value={formik.values.confirmPassword}
            onChange={(value) => formik.setFieldValue("confirmPassword", value)}
            placeholder={t("auth.repeatPassword")}
            errorText={formik.touched.confirmPassword ? formik.errors.confirmPassword : undefined}
          />
          <button type="submit" className="btn-primary btn auth-submit" disabled={isLoading}>
            {isLoading ? t("auth.creatingAccount") : t("auth.createAccountAction")}
          </button>
        </form>

        <div className="auth-footer-link">
          {t("auth.alreadyHaveAccount")} <Link to="/login">{t("auth.signIn")}</Link>
        </div>
        <div className="auth-hint">
          {t("auth.employeeHint")}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";

import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import SearchableSelect from "../../components/SearchableSelect";
import SortTh from "../../components/SortTh";
import TextInput from "../../components/TextInput";
import {
  IconCheck,
  IconClose,
  IconPlus,
  IconSearch,
} from "../../components/icons";
import useCreateSuperAdminUser from "../../hooks/api/useCreateSuperAdminUser";
import useGetSuperAdminCustomers from "../../hooks/api/useGetSuperAdminCustomers";
import useGetSuperAdminUsers, {
  type GetSuperAdminUsersParams,
} from "../../hooks/api/useGetSuperAdminUsers";

const PAGE_SIZE = 10;
const USER_TYPES = ["ADMIN", "EMPLOYEE"];
const SORT_FIELDS: Record<number, GetSuperAdminUsersParams["sort_by"]> = {
  0: "fullname",
  1: "email",
  2: "user_type",
  5: "created_at",
};

interface UserForm {
  companyId: string;
  email: string;
  fullName: string;
  password: string;
  userType: string;
}

function emptyForm(): UserForm {
  return {
    companyId: "",
    email: "",
    fullName: "",
    password: "",
    userType: "EMPLOYEE",
  };
}

function requestErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (message) return message;
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SuperAdminUsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState(5);
  const [sortAsc, setSortAsc] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const {
    data: usersResponse,
    isLoading: isUsersLoading,
    isError: isUsersError,
    refetch: refetchUsers,
  } = useGetSuperAdminUsers({
    params: {
      search: search || undefined,
      company_id: companyId ? Number(companyId) : undefined,
      page,
      limit: PAGE_SIZE,
      sort_by: SORT_FIELDS[sortCol] ?? "created_at",
      sort_dir: sortAsc ? "asc" : "desc",
    },
    options: { keepPreviousData: true },
  });
  const { data: customersResponse } = useGetSuperAdminCustomers({
    params: { page: 1, limit: 9999 },
    options: { keepPreviousData: true },
  });
  const { mutateAsync: createUser, isLoading: isCreating } =
    useCreateSuperAdminUser();

  const userData = usersResponse?.data;
  const users = userData?.users ?? [];
  const total = userData?.total ?? 0;
  const totalPages = Math.max(1, userData?.total_pages ?? 1);
  const safePage = Math.min(page, totalPages);
  const companyOptions = useMemo(
    () => [
      { value: "", label: "All Companies" },
      ...(customersResponse?.data?.items ?? []).map((customer) => ({
        value: customer.id,
        label: customer.name,
        meta: customer.email,
      })),
    ],
    [customersResponse?.data?.items],
  );
  const createCompanyOptions = companyOptions.slice(1);

  const formik = useFormik<UserForm>({
    initialValues: emptyForm(),
    validationSchema: Yup.object({
      companyId: Yup.string().required("Company is required."),
      email: Yup.string()
        .trim()
        .email("Enter a valid email address.")
        .required("Email is required."),
      fullName: Yup.string().trim().required("Full name is required."),
      password: Yup.string().min(6, "Password must contain at least 6 characters.").required("Password is required."),
      userType: Yup.string().oneOf(USER_TYPES).required("Role is required."),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const response = await createUser({
          company_id: Number(values.companyId),
          email: values.email.trim(),
          full_name: values.fullName.trim(),
          password: values.password,
          user_type: values.userType,
        });
        toast(response.message, { type: "success" });
        setFormOpen(false);
        resetForm();
        if (page !== 1) setPage(1);
        else await refetchUsers();
      } catch (error) {
        toast(requestErrorMessage(error, "Failed to create user."), {
          type: "error",
        });
      }
    },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function handleSort(column: number) {
    if (sortCol === column) setSortAsc((current) => !current);
    else {
      setSortCol(column);
      setSortAsc(true);
    }
    setPage(1);
  }

  function openCreate() {
    formik.resetForm({ values: emptyForm() });
    setFormOpen(true);
  }

  function closeCreate() {
    if (isCreating) return;
    setFormOpen(false);
    formik.resetForm();
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Users</h1>
        <button className="btn-new" onClick={openCreate}><IconPlus /> Add User</button>
      </div>
      <p className="summary-text">Manage users across all customer companies.</p>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input"
                type="text"
                placeholder="Search name or email…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <SearchableSelect
              inline
              style={{ minWidth: 220 }}
              value={companyId}
              onChange={(value) => {
                setCompanyId(String(value));
                setPage(1);
              }}
              options={companyOptions}
              placeholder="All Companies"
              searchPlaceholder="Search company…"
              emptyText="No companies found"
            />
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openCreate}><IconPlus /> Add User</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Name" colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Email" colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Role" colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 120 }} />
                <th>Company</th>
                <th>Plan</th>
                <SortTh label="Created At" colIndex={5} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 170 }} />
              </tr>
            </thead>
            <tbody>
              {isUsersLoading && !userData ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading users…</td></tr>
              ) : isUsersError ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--red)" }}>Unable to load users.</td></tr>
              ) : !users.length ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No users found.</td></tr>
              ) : users.map((user) => (
                <tr key={user.id}>
                  <td className="name-cell">{user.fullname || "-"}</td>
                  <td>{user.email || "-"}</td>
                  <td><span className={`badge badge-${user.user_type.toUpperCase() === "ADMIN" ? "purple" : "blue"}`}>{user.user_type || "-"}</span></td>
                  <td>{user.company_name || "-"}</td>
                  <td>{user.plan_name || "-"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{formatDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={total} pageSize={PAGE_SIZE} onPage={setPage} label="users" />
      </div>

      <Modal
        open={formOpen}
        title="Add User"
        onClose={closeCreate}
        size="lg"
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isCreating} onClick={closeCreate}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={isCreating} onClick={() => formik.handleSubmit()}>
              <IconCheck /> {isCreating ? "Saving…" : "Save"}
            </button>
          </>
        )}
      >
        <div className="form-row">
          <TextInput
            variant="secondary"
            value={formik.values.fullName}
            onChange={(value) => formik.setFieldValue("fullName", value)}
            isRequired
            label="Full Name"
            placeholder="Enter full name"
            errorText={formik.touched.fullName ? formik.errors.fullName : undefined}
          />
          <TextInput
            variant="secondary"
            value={formik.values.email}
            onChange={(value) => formik.setFieldValue("email", value)}
            isRequired
            inputType="email"
            label="Email"
            placeholder="name@company.com"
            errorText={formik.touched.email ? formik.errors.email : undefined}
          />
          <TextInput
            variant="secondary"
            value={formik.values.password}
            onChange={(value) => formik.setFieldValue("password", value)}
            isRequired
            inputType="password"
            label="Password"
            placeholder="Enter password"
            errorText={formik.touched.password ? formik.errors.password : undefined}
          />
          <div className="form-group">
            <label>Company <span style={{ color: "var(--red)" }}>*</span></label>
            <SearchableSelect
              value={formik.values.companyId}
              onChange={(value) => formik.setFieldValue("companyId", String(value))}
              options={createCompanyOptions}
              placeholder="Select company…"
              searchPlaceholder="Search company…"
              emptyText="No companies found"
            />
            {formik.touched.companyId && formik.errors.companyId && <span style={{ color: "var(--red)", fontSize: 12 }}>{formik.errors.companyId}</span>}
          </div>
          <div className="form-group">
            <label>Role <span style={{ color: "var(--red)" }}>*</span></label>
            <select value={formik.values.userType} onChange={(event) => formik.setFieldValue("userType", event.target.value)}>
              {USER_TYPES.map((type) => <option key={type} value={type}>{type === "ADMIN" ? "Admin" : "Staff"}</option>)}
            </select>
            {formik.touched.userType && formik.errors.userType && <span style={{ color: "var(--red)", fontSize: 12 }}>{formik.errors.userType}</span>}
          </div>
        </div>
      </Modal>
    </>
  );
}

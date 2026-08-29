import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";

import { IconCheck, IconClose, IconDelete, IconEdit, IconPlus, IconSearch } from "../components/icons";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import SortTh from "../components/SortTh";
import TextInput from "../components/TextInput";
import useGetUsers, { type UserListItem } from "../hooks/api/useGetUsers";
import usePostRegister from "../hooks/api/usePostRegister";
import usePutUser from "../hooks/api/usePutUser";
import useDeleteUser from "../hooks/api/useDeleteUser";
import SearchableSelect from "../components/SearchableSelect";

const PAGE_SIZE = 10;
const ROLES = ["ADMIN", "EMPLOYEE"] as const;
type UserRole = (typeof ROLES)[number];
type UserStatus = "active" | "inactive";

interface UserForm {
  fullname: string;
  email: string;
  password: string;
  user_type: UserRole;
  status: UserStatus;
}

function emptyForm(): UserForm {
  return { fullname: "", email: "", password: "", user_type: "EMPLOYEE", status: "active" };
}

function roleLabel(userType: string): "Admin" | "Staff" {
  return userType.toUpperCase() === "ADMIN" ? "Admin" : "Staff";
}

function roleBadgeClass(role: string) {
  return role === "Admin" ? "badge-purple" : "badge-blue";
}

function displayName(user: UserListItem) {
  return user.fullname?.trim() || user.username?.trim() || "-";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "var(--brand-bg)",
        color: "var(--brand)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [roleFilter, setRoleFilter] = useState<"" | "ADMIN" | "EMPLOYEE">("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserListItem | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const { data: response, isLoading, isError, refetch: refetchUsers } = useGetUsers({
    params: {
      page,
      limit: PAGE_SIZE,
      search,
      sort_dir: sortDir,
      sort_by: sortBy,
      user_type: roleFilter || undefined,
    },
    options: { keepPreviousData: true },
  });

  const users = response?.data?.users ?? [];
  const total = response?.data?.total ?? 0;
  const currentPage = response?.data?.page ?? page;
  const adminCount = useMemo(
    () => users.filter((user) => user.user_type.toUpperCase() === "ADMIN").length,
    [users],
  );
  const { mutateAsync: postRegister, isLoading: isRegistering } = usePostRegister();
  const { mutateAsync: putUser, isLoading: isUpdatingUser } = usePutUser();
  const { mutateAsync: deleteUser, isLoading: isDeletingUser } = useDeleteUser();
  const isSavingUser = isRegistering || isUpdatingUser;

  const userFormik = useFormik<UserForm>({
    initialValues: emptyForm(),
    validationSchema: Yup.object({
      fullname: Yup.string().trim().required("Required"),
      email: Yup.string().trim().email("Invalid email address").required("Required"),
      password: Yup.string().required("Required"),
      user_type: Yup.string().oneOf(ROLES).required("Required"),
      status: Yup.string().required("Required"),
    }),
    validateOnChange: false,
    onSubmit: async (values, { resetForm }) => {
      try {
        const payload = {
          fullname: values.fullname.trim(),
          password: values.password,
          email: values.email.trim(),
          user_type: values.user_type,
        };
        const response = editingUser
          ? await putUser({ id: editingUser.id, payload })
          : await postRegister(payload);

        toast(response.message, { type: "success" });
        setModalOpen(false);
        setEditingUser(null);
        resetForm();
        await refetchUsers();
      } catch (error) {
        toast(
          error instanceof Error
            ? error.message
            : editingUser
              ? "Failed to update user."
              : "Failed to add user.",
          { type: "error" },
        );
      }
    },
  });

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function openNew() {
    setEditingUser(null);
    userFormik.resetForm();
    setModalOpen(true);
  }

  function openEdit(user: UserListItem) {
    setEditingUser(user);
    userFormik.setValues({
      fullname: displayName(user),
      email: user.email,
      password: "",
      user_type: user.user_type.toUpperCase() === "ADMIN" ? "ADMIN" : "EMPLOYEE",
      status: "active",
    });
    setModalOpen(true);
  }

  function openDelete(user: UserListItem) {
    setDeletingUser(user);
    setDeleteOpen(true);
  }

  function closeUserModal() {
    if (isSavingUser) return;
    setModalOpen(false);
    setEditingUser(null);
    userFormik.resetForm();
  }

  async function confirmDelete() {
    if (!deletingUser) return;

    try {
      const response = await deleteUser(deletingUser.id);
      toast(response.message, { type: "success" });
      setDeleteOpen(false);
      setDeletingUser(null);
      await refetchUsers();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to delete user.",
        { type: "error" },
      );
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Users</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New User</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {[
          { label: "Total Users", value: total, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: "Active", value: total, color: "var(--green)", bg: "var(--green-bg)" },
          { label: "Admins on This Page", value: adminCount, color: "var(--purple)", bg: "var(--purple-bg)" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ background: stat.bg }}>
              <span className="stat-value" style={{ color: stat.color }}>{stat.value}</span>
            </div>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

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
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(String(value) as "" | "ADMIN" | "EMPLOYEE");
                setPage(1);
              }}
              options={[
                { value: "", label: "All Roles" },
                { value: "ADMIN", label: "Admin" },
                { value: "EMPLOYEE", label: "Staff" },
              ]}
              placeholder="All Roles"
              searchPlaceholder="Search roles…"
            />
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}><IconPlus /> New</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Name" id="fullname" sortCol={sortBy} sortAsc={sortDir === "asc"} onSort={handleSort} />
                <SortTh label="Email" id="email" sortCol={sortBy} sortAsc={sortDir === "asc"} onSort={handleSort} style={{ minWidth: 190 }} />
                <SortTh label="Role" id="user_type" sortCol={sortBy} sortAsc={sortDir === "asc"} onSort={handleSort} style={{ width: 110 }} />
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 140 }}>Last Active</th>
                <th style={{ width: 100, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && users.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32 }}>Loading users…</td></tr>
              ) : isError ? (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--red)", padding: 32 }}>Failed to load users.</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No users found.</td></tr>
              ) : (
                users.map((user) => {
                  const name = displayName(user);
                  const role = roleLabel(user.user_type);
                  return (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={name} />
                          <div className="name-cell" style={{ fontWeight: 600 }}>{name}</div>
                        </div>
                      </td>
                      <td style={{ color: "var(--text-2)" }}>{user.email || "-"}</td>
                      <td><span className={`badge ${roleBadgeClass(role)}`}>{role}</span></td>
                      <td><span className="badge badge-green">Active</span></td>
                      <td style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>-</td>
                      <td>
                        <div className="action-btns" style={{ justifyContent: "center" }}>
                          <button className="btn-icon edit" title="Edit" onClick={() => openEdit(user)}><IconEdit /></button>
                          <button className="btn-icon delete" title="Delete" onClick={() => openDelete(user)}><IconDelete /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          total={total}
          pageSize={PAGE_SIZE}
          onPage={(nextPage: number) => setPage(nextPage)}
          label="users"
        />
      </div>

      <Modal
        open={modalOpen}
        title={editingUser ? "Edit User" : "Add User"}
        onClose={closeUserModal}
        footer={
          <>
            <button className="btn-cancel-modal" disabled={isSavingUser} onClick={closeUserModal}><IconClose /> Cancel</button>
            <button className="btn-save-modal" type="submit" disabled={isSavingUser} onClick={() => userFormik.handleSubmit()}><IconCheck /> {isSavingUser ? "Saving…" : "Save"}</button>
          </>
        }
      >
        <TextInput value={userFormik.values.fullname} onChange={(value) => userFormik.setFieldValue("fullname", value)} isRequired label="Name" placeholder="Full name" errorText={userFormik.errors.fullname} />
        <TextInput value={userFormik.values.email} onChange={(value) => userFormik.setFieldValue("email", value)} isRequired inputType="email" label="Email" placeholder="user@example.com" errorText={userFormik.errors.email} />
        <TextInput value={userFormik.values.password} onChange={(value) => userFormik.setFieldValue("password", value)} isRequired inputType="password" label="Password" placeholder="Enter password" errorText={userFormik.errors.password} />
        <div className="form-row">
          <div className="form-group">
            <label>Role <span style={{ color: "var(--red)" }}>*</span></label>
            <SearchableSelect
              value={userFormik.values.user_type}
              onChange={(value) => userFormik.setFieldValue("user_type", String(value) as UserRole)}
              options={ROLES.map((role) => ({ value: role, label: role }))}
              placeholder="Select a role"
              searchPlaceholder="Search roles…"
            />
            {userFormik.errors.user_type && <span style={{ color: "var(--red)", fontSize: 12 }}>{userFormik.errors.user_type}</span>}
          </div>
          <div className="form-group">
            <label>Status <span style={{ color: "var(--red)" }}>*</span></label>
            <SearchableSelect
              value={userFormik.values.status}
              onChange={(value) => userFormik.setFieldValue("status", String(value) as UserStatus)}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              placeholder="Select a status"
              searchPlaceholder="Search statuses…"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete User"
        onClose={() => { if (!isDeletingUser) { setDeleteOpen(false); setDeletingUser(null); } }}
        footer={
          <>
            <button className="btn-cancel-modal" disabled={isDeletingUser} onClick={() => { setDeleteOpen(false); setDeletingUser(null); }}>Cancel</button>
            <button className="btn-del-ok" disabled={isDeletingUser} onClick={confirmDelete}>{isDeletingUser ? "Deleting…" : "Delete"}</button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{deletingUser ? displayName(deletingUser) : ""}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}

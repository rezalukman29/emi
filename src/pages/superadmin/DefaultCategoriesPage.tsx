import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";

import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import SortTh from "../../components/SortTh";
import TextInput from "../../components/TextInput";
import {
  IconCheck,
  IconClose,
  IconDelete,
  IconEdit,
  IconPlus,
  IconSearch,
} from "../../components/icons";
import useCreateDefaultCategory from "../../hooks/api/useCreateDefaultCategory";
import useDeleteDefaultCategory from "../../hooks/api/useDeleteDefaultCategory";
import useGetDefaultCategories, {
  type DefaultCategoryItem,
} from "../../hooks/api/useGetDefaultCategories";
import useUpdateDefaultCategory from "../../hooks/api/useUpdateDefaultCategory";

const PAGE_SIZE = 20;

interface DefaultCategoryForm {
  name: string;
  description: string;
  isActive: string;
}

function emptyForm(): DefaultCategoryForm {
  return {
    name: "",
    description: "",
    isActive: "1",
  };
}

function requestErrorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (apiMessage) return apiMessage;
  return error instanceof Error ? error.message : fallback;
}

export default function DefaultCategoriesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState(-1);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    data: categoriesResponse,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useGetDefaultCategories({
    params: {
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    },
    options: { keepPreviousData: true },
  });
  const { mutateAsync: createCategory, isLoading: isCreating } = useCreateDefaultCategory();
  const { mutateAsync: updateCategory, isLoading: isUpdating } = useUpdateDefaultCategory();
  const { mutateAsync: deleteCategory, isLoading: isDeleting } = useDeleteDefaultCategory();
  const isSaving = isCreating || isUpdating;
  const categoryData = categoriesResponse?.data;
  const stats = categoryData?.stats;
  const categories = categoryData?.items ?? [];
  const total = categoryData?.total ?? 0;
  const totalPages = Math.max(1, categoryData?.total_pages ?? 1);
  const safePage = Math.min(page, totalPages);

  const formik = useFormik<DefaultCategoryForm>({
    initialValues: emptyForm(),
    validationSchema: Yup.object({
      name: Yup.string().trim().required("Category name is required."),
      description: Yup.string(),
      isActive: Yup.string().oneOf(["0", "1"]).required("Status is required."),
    }),
    onSubmit: async (values, { resetForm }) => {
      const payload = {
        description: values.description.trim(),
        is_active: Number(values.isActive),
        name: values.name.trim(),
      };

      try {
        const response = editingId
          ? await updateCategory({ id: editingId, payload })
          : await createCategory(payload);
        toast(response.message, { type: "success" });
        setModalOpen(false);
        resetForm();
        if (!editingId && page !== 1) setPage(1);
        else await refetchCategories();
      } catch (error) {
        toast(
          requestErrorMessage(
            error,
            editingId
              ? "Failed to update default category."
              : "Failed to create default category.",
          ),
          { type: "error" },
        );
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

  const pageData = useMemo(() => {
    const sorted = [...categories];
    if (sortCol < 0) return sorted;
    sorted.sort((first, second) => {
      if (sortCol === 0) {
        return sortAsc
          ? first.name.localeCompare(second.name)
          : second.name.localeCompare(first.name);
      }
      if (sortCol === 2) {
        return sortAsc
          ? first.customers_using - second.customers_using
          : second.customers_using - first.customers_using;
      }
      return 0;
    });
    return sorted;
  }, [categories, sortAsc, sortCol]);

  function handleSort(column: number) {
    if (sortCol === column) setSortAsc((current) => !current);
    else {
      setSortCol(column);
      setSortAsc(true);
    }
  }

  function openNew() {
    setEditingId(null);
    formik.resetForm({ values: emptyForm() });
    setModalOpen(true);
  }

  function openEdit(category: DefaultCategoryItem) {
    setEditingId(category.id);
    formik.resetForm({
      values: {
        name: category.name,
        description: category.description || "",
        isActive: String(category.is_active),
      },
    });
    setModalOpen(true);
  }

  function closeCategoryModal() {
    if (isSaving) return;
    formik.resetForm();
    setModalOpen(false);
  }

  function openDelete(id: number) {
    setDeletingId(id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingId) return;
    try {
      const response = await deleteCategory(deletingId);
      toast(response.message, { type: "success" });
      setDeleteOpen(false);
      setDeletingId(null);
      await refetchCategories();
    } catch (error) {
      toast(requestErrorMessage(error, "Failed to delete default category."), { type: "error" });
    }
  }

  const deleteTarget = categories.find((category) => category.id === deletingId);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Default Categories</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Category</button>
      </div>
      <p className="summary-text">Template categories offered to every new customer when their account is provisioned.</p>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {[
          { label: "Total Categories", value: stats?.total ?? 0, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: "Active", value: stats?.active ?? 0, color: "var(--green)", bg: "var(--green-bg)" },
          { label: "Customers Using", value: stats?.customers_using ?? 0, color: "var(--purple)", bg: "var(--purple-bg)" },
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
                placeholder="Search category…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}><IconPlus /> New</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Name" colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <th>Description</th>
                <SortTh label="Customers Using" colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 150, textAlign: "right" }} />
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 100, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isCategoriesLoading && !categoryData ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading categories…</td></tr>
              ) : isCategoriesError ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--red)" }}>Unable to load categories.</td></tr>
              ) : !pageData.length ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No categories found.</td></tr>
              ) : pageData.map((category) => (
                <tr key={category.id}>
                  <td className="name-cell">{category.name}</td>
                  <td style={{ color: "var(--text-2)", fontSize: "12.5px" }}>
                    {category.description || <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    {category.customers_using}
                  </td>
                  <td>
                    <span className={`badge badge-${category.is_active === 1 ? "green" : "gray"}`}>
                      {category.is_active === 1 ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns" style={{ justifyContent: "center" }}>
                      <button className="btn-icon edit" title="Edit" onClick={() => openEdit(category)}><IconEdit /></button>
                      <button className="btn-icon delete" title="Delete" onClick={() => openDelete(category.id)}><IconDelete /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={total} pageSize={PAGE_SIZE} onPage={setPage} label="categories" />
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? "Edit Category" : "New Category"}
        onClose={closeCategoryModal}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isSaving} onClick={closeCategoryModal}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={isSaving} onClick={() => formik.handleSubmit()}>
              <IconCheck /> {isSaving ? "Saving…" : "Save"}
            </button>
          </>
        )}
      >
        <TextInput
          variant="secondary"
          value={formik.values.name}
          onChange={(value) => formik.setFieldValue("name", value)}
          isRequired
          label="Name"
          placeholder="e.g. Floral"
          errorText={formik.touched.name ? formik.errors.name : undefined}
        />
        <TextInput
          variant="secondary"
          value={formik.values.description}
          onChange={(value) => formik.setFieldValue("description", value)}
          label="Description"
          placeholder="Short description (optional)"
          errorText={formik.touched.description ? formik.errors.description : undefined}
        />
        <div className="form-group">
          <label>Status <span style={{ color: "var(--red)" }}>*</span></label>
          <select value={formik.values.isActive} onChange={(event) => formik.setFieldValue("isActive", event.target.value)}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title="Delete Category"
        onClose={() => { if (!isDeleting) setDeleteOpen(false); }}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isDeleting} onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn-del-ok" disabled={isDeleting} onClick={confirmDelete}>
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </>
        )}
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}

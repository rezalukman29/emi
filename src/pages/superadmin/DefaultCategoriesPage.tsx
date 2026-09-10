import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";

import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import SortTh from "../../components/SortTh";
import TextInput from "../../components/TextInput";
import SearchableSelect from "../../components/SearchableSelect";
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
import { useTranslation } from "react-i18next";


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
  const { t } = useTranslation();
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
      name: Yup.string().trim().required(t("wording.categoryNameIsRequired")),
      description: Yup.string(),
      isActive: Yup.string().oneOf(["0", "1"]).required(t("wording.statusIsRequired")),
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
              ? t("wording.failedToUpdateDefaultCategory")
              : t("wording.failedToCreateDefaultCategory"),
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
        <h1 className="page-title" style={{ margin: 0 }}>{t("wording.defaultCategories")}</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> {t("wording.newCategory")}</button>
      </div>
      <p className="summary-text">{t("wording.templateCategoriesOfferedToEveryNewCustomerWhen")}</p>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {[
          { label: t("wording.totalCategories"), value: stats?.total ?? 0, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: t("wording.active"), value: stats?.active ?? 0, color: "var(--green)", bg: "var(--green-bg)" },
          { label: t("wording.customersUsing"), value: stats?.customers_using ?? 0, color: "var(--purple)", bg: "var(--purple-bg)" },
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
                placeholder={t("wording.searchCategory")}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}><IconPlus /> {t("wording.new")}</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label={t("wording.name")} colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <th>{t("wording.description")}</th>
                <SortTh label={t("wording.customersUsing")} colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 150, textAlign: "right" }} />
                <th style={{ width: 100 }}>{t("wording.status")}</th>
                <th style={{ width: 100, textAlign: "center" }}>{t("wording.action")}</th>
              </tr>
            </thead>
            <tbody>
              {isCategoriesLoading && !categoryData ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{t("wording.loadingCategories")}</td></tr>
              ) : isCategoriesError ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--red)" }}>{t("wording.unableToLoadCategories")}</td></tr>
              ) : !pageData.length ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{t("wording.noCategoriesFound")}</td></tr>
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
                      {category.is_active === 1 ? t("wording.active") : t("wording.inactive")}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns" style={{ justifyContent: "center" }}>
                      <button className="btn-icon edit" title={t("wording.edit")} onClick={() => openEdit(category)}><IconEdit /></button>
                      <button className="btn-icon delete" title={t("wording.delete")} onClick={() => openDelete(category.id)}><IconDelete /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={total} pageSize={PAGE_SIZE} onPage={setPage} label={t("wording.categories")} />
      </div>

      <Modal
        open={modalOpen}
        title={editingId ? t("wording.editCategory") : t("wording.newCategory")}
        onClose={closeCategoryModal}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isSaving} onClick={closeCategoryModal}><IconClose /> {t("wording.cancel")}</button>
            <button className="btn-save-modal" disabled={isSaving} onClick={() => formik.handleSubmit()}>
              <IconCheck /> {isSaving ? t("common.actions.saving") : t("common.actions.save")}
            </button>
          </>
        )}
      >
        <TextInput
          variant="secondary"
          value={formik.values.name}
          onChange={(value) => formik.setFieldValue("name", value)}
          isRequired
          label={t("wording.name")}
          placeholder={t("wording.eGFloral")}
          errorText={formik.touched.name ? formik.errors.name : undefined}
        />
        <TextInput
          variant="secondary"
          value={formik.values.description}
          onChange={(value) => formik.setFieldValue("description", value)}
          label={t("wording.description")}
          placeholder={t("wording.shortDescriptionOptional")}
          errorText={formik.touched.description ? formik.errors.description : undefined}
        />
        <div className="form-group">
          <label>{t("wording.status")} <span style={{ color: "var(--red)" }}>*</span></label>
          <SearchableSelect
            value={formik.values.isActive}
            onChange={(value) => formik.setFieldValue("isActive", String(value))}
            options={[
              { value: "1", label: t("wording.active") },
              { value: "0", label: t("wording.inactive") },
            ]}
            placeholder={t("wording.selectStatus")}
            errorText={formik.touched.isActive ? formik.errors.isActive : undefined}
          />
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        title={t("wording.deleteCategory")}
        onClose={() => { if (!isDeleting) setDeleteOpen(false); }}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isDeleting} onClick={() => setDeleteOpen(false)}>{t("wording.cancel")}</button>
            <button className="btn-del-ok" disabled={isDeleting} onClick={confirmDelete}>
              {isDeleting ? t("common.actions.deleting") : t("common.actions.delete")}
            </button>
          </>
        )}
      >
        <p className="confirm-msg">
          {t("wording.areYouSureYouWantToDelete")} <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>{t("wording.thisActionCannotBeUndone")}
        </p>
      </Modal>
    </>
  );
}

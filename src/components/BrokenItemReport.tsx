import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import {
  useCreateBrokenItemReport,
  useUpdateBrokenItemReport,
} from "../hooks/api/useBrokenItemReport";
import { validBrokenQuantity, type BrokenReport } from "../lib/sourcePreview";
import Modal from "./Modal";
import TextInput from "./TextInput";

function errorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as {
    response?: { data?: { message?: string } };
    message?: string;
  })?.response?.data?.message;
  return apiMessage || (error as { message?: string })?.message || fallback;
}

export default function BrokenItemReport({
  item,
  report,
  onSaved,
  onClose,
}: {
  item: { id: number; name: string; qty: number };
  report?: BrokenReport;
  onSaved: () => void | Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [qty, setQty] = useState(report?.qty ?? 1);
  const [note, setNote] = useState(report?.note ?? "");
  const createMutation = useCreateBrokenItemReport();
  const updateMutation = useUpdateBrokenItemReport();
  const isSaving = createMutation.isLoading || updateMutation.isLoading;
  const valid = validBrokenQuantity(qty, item.qty);

  async function save() {
    if (!valid || isSaving) return;
    const payload = { qty, notes: note.trim() };

    try {
      const response = report?.id
        ? await updateMutation.mutateAsync({ id: report.id, payload })
        : await createMutation.mutateAsync({
          barang_event_id: item.id,
          fix_list_item_id: item.id,
          ...payload,
        });
      await onSaved();
      toast.success(
        response.message ||
          t(report?.id ? "sourceUpgrade.reportUpdated" : "sourceUpgrade.reportCreated"),
      );
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, t("sourceUpgrade.reportSaveFailed")));
    }
  }

  return (
    <Modal
      open
      title={t(report ? "sourceUpgrade.editReport" : "sourceUpgrade.report")}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      footer={
        <>
          <button className="btn-cancel-modal" disabled={isSaving} onClick={onClose}>
            {t("wording.cancel")}
          </button>
          <button
            className="btn-save-modal"
            disabled={!valid || isSaving}
            onClick={() => void save()}
          >
            {t(isSaving ? "wording.saving" : "wording.save")}
          </button>
        </>
      }
    >
      <h3>{item.name}</h3>
      <div className="form-group">
        <label htmlFor="broken-quantity">
          {t("wording.qty")} (1–{item.qty})
        </label>
        <input
          id="broken-quantity"
          type="number"
          min={1}
          max={item.qty}
          step={1}
          value={qty}
          onChange={event => setQty(Number(event.target.value))}
        />
      </div>
      <TextInput label={t("wording.notes")} value={note} onChange={setNote} />
    </Modal>
  );
}

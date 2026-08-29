import { useState, useRef, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import type {
  AiAdditionalItemMatched,
  AiAnalysisContext,
  AiAnalysisResult,
  AiMaterial,
  AiMatchedBarang,
  AiWeatherAdvisory,
} from "../interfaces/AiMaterialAnalyzerInterface";
import { AiService } from "../service/AiService";
import useSearchEvents from "../hooks/api/useSearchEvents";

interface PageState {
  imageBase64: string | null;
  imageMimeType: string | null;
  imagePreviewUrl: string | null;
  loading: boolean;
  result: AiAnalysisResult | null;
}

type ContextMode = "none" | "event" | "manual";

function validEventDate(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  return Number.isNaN(Date.parse(value)) ? undefined : value;
}

function compressImage(
  file: File,
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1920;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        resolve({
          base64: dataUrl.split(",")[1],
          mimeType: "image/jpeg",
          previewUrl: dataUrl,
        });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function SkeletonResult() {
  return (
    <div style={{ padding: "4px 0" }}>
      <div
        style={{
          height: 16,
          width: "70%",
          background: "var(--border)",
          borderRadius: 6,
          marginBottom: 12,
          animation: "pulse 1.4s ease-in-out infinite",
        }}
      />
      <div
        style={{
          height: 13,
          width: "90%",
          background: "var(--border)",
          borderRadius: 6,
          marginBottom: 20,
          animation: "pulse 1.4s ease-in-out infinite",
        }}
      />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr 1fr 2fr",
            gap: 10,
            marginBottom: 10,
          }}
        >
          {[0, 1, 2, 3].map((j) => (
            <div
              key={j}
              style={{
                height: 13,
                background: "var(--border)",
                borderRadius: 5,
                opacity: 1 - i * 0.1,
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const ADVISORY_CONFIG = {
  ok: {
    bg: "#f0fdf4",
    border: "#86efac",
    text: "#166534",
    badgeBg: "#dcfce7",
    badgeText: "#15803d",
    label: "Safe Conditions",
  },
  warning: {
    bg: "#fff7ed",
    border: "#fdba74",
    text: "#9a3412",
    badgeBg: "#ffedd5",
    badgeText: "#c2410c",
    label: "Needs Attention",
  },
  danger: {
    bg: "#fef2f2",
    border: "#fca5a5",
    text: "#991b1b",
    badgeBg: "#fee2e2",
    badgeText: "#b91c1c",
    label: "High Risk",
  },
} as const;

function AdvisoryIcon({ level }: { level: "ok" | "warning" | "danger" }) {
  if (level === "ok")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16, flexShrink: 0 }}
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  if (level === "danger")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 16, height: 16, flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 16, height: 16, flexShrink: 0 }}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function WeatherAdvisoryBanner({ advisory }: { advisory: AiWeatherAdvisory }) {
  const [tipsOpen, setTipsOpen] = useState(advisory.level === "danger");
  const cfg = ADVISORY_CONFIG[advisory.level];

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 12,
        color: cfg.text,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: advisory.summary ? 6 : 0,
        }}
      >
        <AdvisoryIcon level={advisory.level} />
        <span style={{ fontWeight: 700, fontSize: 13 }}>{cfg.label}</span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            background: cfg.badgeBg,
            color: cfg.badgeText,
            borderRadius: 5,
            padding: "1px 7px",
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          {advisory.level}
        </span>
      </div>

      {advisory.summary && (
        <p style={{ fontSize: 12.5, margin: "0 0 8px", lineHeight: 1.55 }}>
          {advisory.summary}
        </p>
      )}

      {advisory.backup_plan && (
        <div
          style={{
            background: "rgba(0,0,0,0.05)",
            borderRadius: 7,
            padding: "8px 11px",
            fontSize: 12.5,
            marginBottom: 8,
            lineHeight: 1.55,
          }}
        >
          <strong>Backup Plan: </strong>
          {advisory.backup_plan}
        </div>
      )}

      {advisory.tips.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setTipsOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: cfg.text,
              fontFamily: "inherit",
              opacity: 0.8,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                width: 12,
                height: 12,
                transform: tipsOpen ? "rotate(180deg)" : "none",
                transition: "transform .15s",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {tipsOpen ? "Hide tips" : `View ${advisory.tips.length} practical tips`}
          </button>
          {tipsOpen && (
            <ul
              style={{
                margin: "8px 0 0",
                padding: "0 0 0 16px",
                fontSize: 12.5,
                lineHeight: 1.65,
              }}
            >
              {advisory.tips.map((tip, i) => (
                <li key={i} style={{ marginBottom: 3 }}>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function WeatherTipChip({
  tip,
  urgent,
}: {
  tip: string;
  urgent: boolean;
}) {
  const [open, setOpen] = useState(false);
  const color = urgent ? "#c2410c" : "#4f46e5";
  const bg = urgent ? "#fff7ed" : "var(--brand-bg)";
  const border = urgent ? "#fdba74" : "rgba(79,70,229,0.2)";

  return (
    <div style={{ marginTop: 5 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 6,
          padding: "2px 7px",
          fontSize: 10.5,
          fontWeight: 600,
          color,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {urgent ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 10, height: 10 }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 10, height: 10 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
        Weather Tip
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            width: 9,
            height: 9,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            marginTop: 5,
            padding: "6px 9px",
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 7,
            fontSize: 11.5,
            color,
            lineHeight: 1.55,
          }}
        >
          {tip}
        </div>
      )}
    </div>
  );
}

function AdditionalItemCard({ item }: { item: AiAdditionalItemMatched }) {
  const [imgError, setImgError] = useState(false);
  const barang = item.barang;
  const photoUrl = barang?.photo_url ?? null;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 14px",
        background: item.found ? "var(--white)" : "var(--bg)",
        border: `1px solid ${item.found ? "var(--border)" : "var(--border)"}`,
        borderRadius: 10,
        opacity: item.found ? 1 : 0.75,
        transition: "box-shadow .15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = "var(--shadow)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div
        style={{
          width: 52,
          height: 52,
          flexShrink: 0,
          background: item.found ? "var(--bg)" : "var(--border)",
          borderRadius: 8,
          border: "1px solid var(--border)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {photoUrl && !imgError ? (
          <img
            src={photoUrl}
            alt={barang?.nama}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgError(true)}
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ width: 20, height: 20, color: "var(--text-muted)" }}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "var(--text)",
            marginBottom: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.found ? barang!.nama : item.suggestion_nama}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
            flexWrap: "wrap",
          }}
        >
          {item.found ? (
            <>
              {barang?.kategori && (
                <span className="badge badge-gray" style={{ fontSize: 10.5 }}>
                  {barang.kategori}
                </span>
              )}
              <span className="badge badge-green" style={{ fontSize: 10.5 }}>
                Available in inventory
              </span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                Stock:{" "}
                <strong style={{ color: "var(--text-2)" }}>
                  {barang!.stok}
                </strong>
              </span>
            </>
          ) : (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                background: "var(--bg)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                borderRadius: 5,
                padding: "1px 7px",
              }}
            >
              Unavailable
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--text-muted)",
            fontStyle: "italic",
            lineHeight: 1.45,
          }}
        >
          {item.alasan}
        </div>
      </div>
    </div>
  );
}

function MaterialTable({ materials }: { materials: AiMaterial[] }) {
  const handleCopy = () => {
    const headers = [
      "Material Name",
      "Est. Qty",
      "Unit",
      "Usage Notes",
    ];
    const rows = materials.map((m) =>
      [m.nama, m.estimasi_qty, m.satuan, m.catatan].join("\t"),
    );
    navigator.clipboard
      .writeText([headers.join("\t"), ...rows].join("\n"))
      .then(() => {
        toast("Table copied successfully!", { type: "success", autoClose: 1800 });
      });
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          Analysis Results
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--white)",
            cursor: "pointer",
            fontSize: 12,
            color: "var(--text-2)",
            fontFamily: "inherit",
            transition: "border-color .15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = "var(--brand)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "var(--border)")
          }
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy table
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Material Name</th>
              <th style={{ width: 80 }}>Est. Qty</th>
              <th style={{ width: 80 }}>Unit</th>
              <th>Usage Notes</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m, i) => (
              <tr key={i}>
                <td className="name-cell">{m.nama}</td>
                <td
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                  }}
                >
                  {m.estimasi_qty}
                </td>
                <td>
                  <span className="badge badge-blue">{m.satuan}</span>
                </td>
                <td style={{ color: "var(--text-2)", fontSize: 12.5 }}>
                  {m.catatan}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryCard({ item }: { item: AiMatchedBarang }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 14px",
        background: "var(--white)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        transition: "box-shadow .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "var(--shadow)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div
        style={{
          width: 52,
          height: 52,
          flexShrink: 0,
          background: "var(--bg)",
          borderRadius: 8,
          border: "1px solid var(--border)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {item.photo_url && !imgError ? (
          <img
            src={item.photo_url}
            alt={item.nama}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgError(true)}
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ width: 20, height: 20, color: "var(--border)" }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "var(--text)",
            marginBottom: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.nama}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 3,
            flexWrap: "wrap",
          }}
        >
          {item.kategori && (
            <span className="badge badge-gray" style={{ fontSize: 10.5 }}>
              {item.kategori}
            </span>
          )}
          {item.weather_relevant && (
            <span
              className="badge badge-green"
              style={{ fontSize: 10.5 }}
              title="Suitable for the event weather conditions"
            >
              Weather Suitable
            </span>
          )}
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            Stock:{" "}
            <strong style={{ color: "var(--text-2)" }}>{item.stok}</strong>
          </span>
        </div>
        <div
          style={{ fontSize: 11.5, color: "var(--brand)", fontStyle: "italic" }}
        >
          ≈ {item.matched_material}
        </div>
        {item.weather_tip && (
          <WeatherTipChip tip={item.weather_tip} urgent={!!item.weather_relevant} />
        )}
      </div>
    </div>
  );
}

export default function AiMaterialAnalyzerPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<PageState>({
    imageBase64: null,
    imageMimeType: null,
    imagePreviewUrl: null,
    loading: false,
    result: null,
  });
  const [dragOver, setDragOver] = useState(false);

  const [contextMode, setContextMode] = useState<ContextMode>("none");
  const [eventQuery, setEventQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualLocation, setManualLocation] = useState("");

  const eventsQuery = useSearchEvents({ enabled: contextMode === "event" });
  const rawEvents = eventsQuery.data?.data?.data ?? [];
  const events = useMemo(() => {
    return [...rawEvents].sort((a: any, b: any) => {
      const ta = Date.parse(a.date_event);
      const tb = Date.parse(b.date_event);
      const va = Number.isNaN(ta) ? -Infinity : ta;
      const vb = Number.isNaN(tb) ? -Infinity : tb;
      return vb - va;
    });
  }, [rawEvents]);
  const filteredEvents = useMemo(() => {
    const q = eventQuery.trim().toLowerCase();
    const base = !q
      ? events
      : events.filter(
          (e: any) =>
            (e.name || "").toLowerCase().includes(q) ||
            (e.address || "").toLowerCase().includes(q) ||
            (e.event_code || "").toLowerCase().includes(q),
        );
    return base;
  }, [events, eventQuery]);

  const buildContext = (): AiAnalysisContext | undefined => {
    if (contextMode === "event" && selectedEvent) {
      const lat = parseFloat(selectedEvent.latitude);
      const lon = parseFloat(selectedEvent.longitude);
      return {
        eventId: selectedEvent.id,
        eventName: selectedEvent.name,
        date: validEventDate(selectedEvent.date_event),
        location: selectedEvent.address || undefined,
        ...(Number.isFinite(lat) && Number.isFinite(lon)
          ? { latitude: lat, longitude: lon }
          : {}),
      };
    }
    if (contextMode === "manual" && (manualDate || manualLocation)) {
      return {
        date: manualDate || undefined,
        location: manualLocation || undefined,
      };
    }
    return undefined;
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast("The file must be an image (JPG, PNG, WEBP).", { type: "error" });
      return;
    }
    try {
      const { base64, mimeType, previewUrl } = await compressImage(file);
      setState((prev) => ({
        ...prev,
        imageBase64: base64,
        imageMimeType: mimeType,
        imagePreviewUrl: previewUrl,
        result: null,
      }));
    } catch {
      toast("Failed to process the image.", { type: "error" });
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleAnalyze = async () => {
    if (!state.imageBase64 || !state.imageMimeType || state.loading) return;
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const result = await AiService.analyze(
        state.imageBase64,
        state.imageMimeType,
        buildContext(),
      );
      setState((prev) => ({ ...prev, loading: false, result }));
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false }));
      toast(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.",
        { type: "error" },
      );
    }
  };

  const handleReset = () => {
    setState({
      imageBase64: null,
      imageMimeType: null,
      imagePreviewUrl: null,
      loading: false,
      result: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Material Analyzer
          </h1>
          <p
            style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}
          >
            Upload a decoration image to analyze the materials needed using
            AI.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="badge badge-purple" style={{ fontSize: 11 }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 11, height: 11, marginRight: 4 }}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
            AI Powered
          </span>
        </div>
      </div>

      {/* Two-panel layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.5fr",
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* Left: Upload panel */}
        <div
          className="card"
          style={{
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: ".07em",
            }}
          >
            Upload Decoration Image
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {/* Drop zone */}
          <div
            onClick={() =>
              !state.imagePreviewUrl && fileInputRef.current?.click()
            }
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? "var(--brand)" : "var(--border)"}`,
              borderRadius: 10,
              background: dragOver ? "var(--brand-bg)" : "var(--bg)",
              minHeight: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: state.imagePreviewUrl ? "default" : "pointer",
              transition: "border-color .15s, background .15s",
              overflow: "hidden",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (!state.imagePreviewUrl)
                e.currentTarget.style.borderColor = "var(--brand)";
            }}
            onMouseLeave={(e) => {
              if (!state.imagePreviewUrl)
                e.currentTarget.style.borderColor = dragOver
                  ? "var(--brand)"
                  : "var(--border)";
            }}
          >
            {state.imagePreviewUrl ? (
              <>
                <img
                  src={state.imagePreviewUrl}
                  alt="Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    maxHeight: 240,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background .15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(0,0,0,0.35)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "rgba(0,0,0,0)")
                  }
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="btn btn-ghost"
                    style={{
                      opacity: 0,
                      transition: "opacity .15s",
                      fontSize: 12,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                  >
                    Change Image
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "28px 20px" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "var(--brand-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 24, height: 24 }}
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: "var(--brand)" }}>
                    Click to upload
                  </span>{" "}
                  or drag &amp; drop
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  JPG, PNG, WEBP
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{
                flex: 1,
                justifyContent: "center",
                opacity: !state.imageBase64 || state.loading ? 0.55 : 1,
              }}
              disabled={!state.imageBase64 || state.loading}
              onClick={handleAnalyze}
            >
              {state.loading ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      width: 14,
                      height: 14,
                      animation: "spin 1s linear infinite",
                    }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 14, height: 14 }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  Analyze Materials
                </>
              )}
            </button>
            {state.imagePreviewUrl && (
              <button
                className="btn btn-ghost"
                onClick={handleReset}
                title="Reset"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: 14, height: 14 }}
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-3" />
                </svg>
              </button>
            )}
          </div>

          {/* Event/weather context (optional) */}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
              }}
            >
              Event Context (optional)
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {(
                [
                  { key: "none", label: "No Context" },
                  { key: "event", label: "Select Event" },
                  { key: "manual", label: "Manual Input" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setContextMode(opt.key);
                    setEventPickerOpen(false);
                    setEventQuery("");
                  }}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    borderRadius: 7,
                    border: `1px solid ${
                      contextMode === opt.key ? "var(--brand)" : "var(--border)"
                    }`,
                    background:
                      contextMode === opt.key ? "var(--brand-bg)" : "var(--white)",
                    color:
                      contextMode === opt.key ? "var(--brand)" : "var(--text-2)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {contextMode === "event" && (
              <div style={{ position: "relative" }}>
                {selectedEvent && !eventPickerOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEventQuery("");
                      setEventPickerOpen(true);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 11px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--white)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {selectedEvent.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {validEventDate(selectedEvent.date_event) ??
                          "Date unknown"}{" "}
                        ·{" "}
                        {selectedEvent.address || "Location unknown"}
                      </div>
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        width: 14,
                        height: 14,
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                ) : (
                  <>
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Click to select or search for an event..."
                      value={eventQuery}
                      onFocus={() => setEventPickerOpen(true)}
                      onChange={(e) => {
                        setEventPickerOpen(true);
                        setEventQuery(e.target.value);
                      }}
                      onBlur={() =>
                        setTimeout(() => setEventPickerOpen(false), 150)
                      }
                      style={{ paddingLeft: 11, paddingRight: 28 }}
                    />
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        width: 14,
                        height: 14,
                        color: "var(--text-muted)",
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    {eventPickerOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          left: 0,
                          right: 0,
                          background: "var(--white)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          boxShadow: "var(--shadow)",
                          zIndex: 10,
                          maxHeight: 220,
                          overflowY: "auto",
                        }}
                      >
                        {eventsQuery.isLoading ? (
                          <div
                            style={{
                              padding: "10px 12px",
                              fontSize: 12.5,
                              color: "var(--text-muted)",
                            }}
                          >
                            Loading event list...
                          </div>
                        ) : filteredEvents.length === 0 ? (
                          <div
                            style={{
                              padding: "10px 12px",
                              fontSize: 12.5,
                              color: "var(--text-muted)",
                            }}
                          >
                            No events found.
                          </div>
                        ) : (
                          filteredEvents.map((ev: any) => (
                            <div
                              key={ev.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSelectedEvent(ev);
                                setEventQuery("");
                                setEventPickerOpen(false);
                              }}
                              style={{
                                padding: "8px 12px",
                                cursor: "pointer",
                                fontSize: 12.5,
                                borderBottom: "1px solid var(--border)",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "var(--bg)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "transparent")
                              }
                            >
                              <div style={{ fontWeight: 600, color: "var(--text)" }}>
                                {ev.name}
                              </div>
                              <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                {validEventDate(ev.date_event) ?? "-"} ·{" "}
                                {ev.address || "-"}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {contextMode === "manual" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    border: "1px solid var(--border)",
                    borderRadius: 7,
                    fontSize: 12.5,
                    fontFamily: "inherit",
                    color: "var(--text)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Location (city)"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  className="search-input"
                  style={{ flex: 1, paddingLeft: 11 }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Result panel */}
        <div className="card" style={{ padding: "20px 22px" }}>
          {state.loading ? (
            <SkeletonResult />
          ) : state.result ? (
            <>
              {state.result.context_used && (
                <div
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 12,
                    fontSize: 12,
                    color: "var(--text-2)",
                    lineHeight: 1.6,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--text)",
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    Context Used
                    {state.result.context_used.weather?.isEstimate && (
                      <span
                        className="badge badge-gray"
                        style={{ fontSize: 10 }}
                      >
                        Seasonal Estimate
                      </span>
                    )}
                  </div>
                  {(state.result.context_used.eventName ||
                    state.result.context_used.date ||
                    state.result.context_used.location) && (
                    <div>
                      {[
                        state.result.context_used.eventName,
                        state.result.context_used.date,
                        state.result.context_used.location,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                  {state.result.context_used.weather ? (
                    <div>
                      Weather: {state.result.context_used.weather.weatherDescription ?? "-"}
                      {state.result.context_used.weather.tempMinC !== undefined &&
                      state.result.context_used.weather.tempMaxC !== undefined
                        ? `, ${Math.round(
                            state.result.context_used.weather.tempMinC,
                          )}-${Math.round(
                            state.result.context_used.weather.tempMaxC,
                          )}°C`
                        : ""}
                      {state.result.context_used.weather.precipitationProbability !==
                      undefined
                        ? `, ${Math.round(
                            state.result.context_used.weather.precipitationProbability,
                          )}% chance of rain`
                        : ""}
                    </div>
                  ) : state.result.context_used.weatherError ? (
                    <div>
                      Weather unavailable — the analysis uses only the image and date.
                    </div>
                  ) : null}
                </div>
              )}
              {state.result.weather_advisory && (
                <WeatherAdvisoryBanner advisory={state.result.weather_advisory} />
              )}
              {state.result.deskripsi && (
                <div
                  style={{
                    background: "var(--brand-bg)",
                    border: "1px solid rgba(79,70,229,0.15)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 16,
                    fontSize: 13,
                    color: "var(--brand)",
                    lineHeight: 1.55,
                  }}
                >
                  <strong>Description: </strong>
                  {state.result.deskripsi}
                </div>
              )}
              <MaterialTable materials={state.result.material} />
            </>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: 220,
                color: "var(--text-muted)",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "var(--bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                  border: "1px solid var(--border)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: 24, height: 24 }}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                Analysis Results
              </p>
              <p
                style={{ fontSize: 12.5, textAlign: "center", lineHeight: 1.5 }}
              >
                Upload a decoration image to
                <br />
                start the analysis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inventory matches */}
      {state.result && (
        <div className="card" style={{ padding: "20px 22px", marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text)",
                letterSpacing: "-0.01em",
              }}
            >
              Inventory Availability
            </div>
            {(state.result.matched_barang?.length ?? 0) > 0 && (
              <span className="badge badge-green">
                {state.result.matched_barang!.length} items found
              </span>
            )}
          </div>

          {(state.result.matched_barang?.length ?? 0) === 0 ? (
            <div className="no-data">
              No matching materials found in inventory.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              {state.result.matched_barang!.map((item) => (
                <InventoryCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Additional items recommended by AI */}
      {state.result?.additional_items && state.result.additional_items.length > 0 && (
        <div className="card" style={{ padding: "20px 22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text)",
                  letterSpacing: "-0.01em",
                }}
              >
                Recommended Additional Items
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  background: "var(--brand-bg)",
                  color: "var(--brand)",
                  border: "1px solid rgba(79,70,229,0.2)",
                  borderRadius: 5,
                  padding: "1px 7px",
                }}
              >
                AI
              </span>
            </div>
            <span
              style={{
                fontSize: 11.5,
                color: "var(--text-muted)",
                fontStyle: "italic",
              }}
            >
              {state.result.additional_items.filter((i) => i.found).length} of{" "}
              {state.result.additional_items.length} available in inventory
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {state.result.additional_items.map((item, idx) => (
              <AdditionalItemCard key={idx} item={item} />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

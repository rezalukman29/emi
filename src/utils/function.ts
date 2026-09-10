import moment from "moment";
import i18n from "../i18n";

export const STORAGE_BOOQABLE = "https://storage-booqable.emi.web.id/booqable/"
export const noImage =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

export const isValidUrl = (urlString: string) => {
  var urlPattern = new RegExp(
    "^(https?:\\/\\/)?" + // validate protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // validate domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // validate OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // validate port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // validate query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // validate fragment locator
  return !!urlPattern.test(urlString);
};

export const currency = (value: number) => {
  if (!value) return "";

  return new Intl.NumberFormat("id-ID").format(value);
};

export const formatUtcToLocalDateTime = (value?: string) => {
  if (!value) return "-";

  const parsed = moment.utc(value, "YYYY-MM-DD HH:mm:ss", true);
  if (!parsed.isValid()) {
    return moment.utc(value).local().format("D MMM YYYY, HH:mm");
  }

  return parsed.local().format("D MMM YYYY, HH:mm");
};

const API_VALUE_TRANSLATION_KEYS: Record<string, string> = {
  active: "common.status.active",
  available: "common.status.available",
  canceled: "common.status.canceled",
  cancelled: "common.status.canceled",
  critical: "common.status.critical",
  done: "common.status.applied",
  draft: "common.status.draft",
  failed: "common.status.failed",
  inactive: "common.status.inactive",
  loaned: "common.status.loaned",
  low_stock: "common.status.lowStock",
  ongoing: "common.status.ongoing",
  out_of_stock: "common.status.outOfStock",
  overdue: "common.status.overdue",
  paid: "common.status.paid",
  past: "common.status.past",
  pending: "common.status.pending",
  refunded: "common.status.refunded",
  returned: "common.status.returned",
  safe: "common.status.safe",
  suspended: "common.status.suspended",
  trial: "common.status.trial",
  upcoming: "common.status.upcoming",
  warning: "common.status.warning",
  monthly: "common.billing.monthly",
  yearly: "common.billing.yearly",
  custom: "common.billing.custom",
  admin: "common.roles.admin",
  employee: "common.roles.employee",
  owner: "common.roles.owner",
  superadmin: "common.roles.superadmin",
};

/** Translate labels returned by the API without changing their payload value. */
export const translateApiValue = (value?: string | null) => {
  if (!value) return "-";
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const translationKey = API_VALUE_TRANSLATION_KEYS[normalized];
  return translationKey ? i18n.t(translationKey) : value;
};

export const getDateLocale = () => (i18n.resolvedLanguage === "id" ? "id-ID" : "en-GB");

/** Format a date-only API value without introducing a timezone shift. */
export const formatLocalDate = (value?: string | null) => {
  if (!value) return "—";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(getDateLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

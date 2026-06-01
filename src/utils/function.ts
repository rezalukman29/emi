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
// Uploaded images come back as absolute backend URLs; going through the same-origin proxy keeps them loadable anywhere
export function imageSrc(url: string) {
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/uploads/") ? u.pathname : url;
  } catch {
    return url;
  }
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol" });

export function formatPrice(value: string | number) {
  return money.format(Number(value));
}

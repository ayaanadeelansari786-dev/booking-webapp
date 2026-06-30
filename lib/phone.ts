const digitOnly = /\D/g;

export function formatPhone(value: string) {
  const digits = value.replace(digitOnly, "").slice(0, 10);
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);

  if (digits.length > 6) {
    return `(${area}) ${prefix}-${line}`;
  }

  if (digits.length > 3) {
    return `(${area}) ${prefix}`;
  }

  if (digits.length > 0) {
    return `(${area}`;
  }

  return "";
}

export function isValidUsPhone(value: string) {
  return value.replace(digitOnly, "").length === 10;
}

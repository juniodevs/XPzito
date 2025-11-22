export const isPositiveNumber = (value: unknown): value is number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

export const isNonNegativeNumber = (value: unknown): value is number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
};

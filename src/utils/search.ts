export const matchesSearch = (query: string, ...values: (string | null | undefined)[]): boolean => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return values.some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
};

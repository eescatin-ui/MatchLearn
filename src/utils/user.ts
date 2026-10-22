export const getUserInitials = (name?: string | null): string => {
  const value = (name || 'Student').trim();

  if (!value) {
    return 'ST';
  }

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

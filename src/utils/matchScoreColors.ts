export const getMatchScoreColors = (score: number) => {
  if (score >= 50) {
    return { backgroundColor: '#dcfce7', color: '#166534' };
  }
  if (score >= 25) {
    return { backgroundColor: '#fef3c7', color: '#92400e' };
  }
  return { backgroundColor: '#fee2e2', color: '#b91c1c' };
};

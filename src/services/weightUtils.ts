export const formatWeightDisplay = (grams: number, unit: 'g' | 'oz' | 'lbs_oz' | 'kg' = 'g'): string => {
  if (unit === 'kg') {
    return `${(grams / 1000).toFixed(2)}kg`;
  }
  if (unit === 'oz') {
    return `${(grams / 28.3495).toFixed(1)}oz`;
  }
  if (unit === 'lbs_oz') {
    const totalOz = grams / 28.3495;
    const lbs = Math.floor(totalOz / 16);
    const oz = (totalOz % 16).toFixed(1);
    return `${lbs}lb ${oz}oz`;
  }
  return `${grams}g`;
};

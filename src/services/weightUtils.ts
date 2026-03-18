export const formatWeightDisplay = (grams: number, unit: 'g' | 'oz' | 'lbs_oz' | 'kg' = 'g'): string => {
  if (unit === 'kg') {
    return `${(grams / 1000).toFixed(2)}kg`;
  }
  if (unit === 'oz') {
    const totalEighths = Math.round(grams / 3.5436875);
    const oz = Math.floor(totalEighths / 8);
    const eighths = totalEighths % 8;
    return eighths > 0 ? `${oz}.${eighths}oz` : `${oz}oz`;
  }
  if (unit === 'lbs_oz') {
    const totalEighths = Math.round(grams / 3.5436875);
    const totalOz = Math.floor(totalEighths / 8);
    const eighths = totalEighths % 8;
    const lbs = Math.floor(totalOz / 16);
    const oz = totalOz % 16;
    
    let result = `${lbs}lb ${oz}oz`;
    if (eighths > 0) result += ` ${eighths}/8`;
    return result;
  }
  return `${grams}g`;
};

export const convertToGrams = (unit: 'g' | 'oz' | 'lb', values: { g?: number; lb?: number; oz?: number; eighths?: number }): number => {
  if (unit === 'g') return values.g || 0;
  
  const eighthsInGrams = 3.5436875;
  const ozInGrams = 28.3495;
  
  if (unit === 'oz') {
    return (values.oz || 0) * ozInGrams + (values.eighths || 0) * eighthsInGrams;
  }
  
  if (unit === 'lb') {
    const lbInGrams = ozInGrams * 16;
    return (values.lb || 0) * lbInGrams + (values.oz || 0) * ozInGrams + (values.eighths || 0) * eighthsInGrams;
  }
  
  return 0;
};

export const convertFromGrams = (grams: number, unit: 'g' | 'oz' | 'lb'): { g?: number; lb?: number; oz?: number; eighths?: number } => {
  if (unit === 'g') return { g: Math.round(grams) };
  
  const totalEighths = Math.round(grams / 3.5436875);
  const eighths = totalEighths % 8;
  const totalOz = Math.floor(totalEighths / 8);
  
  if (unit === 'oz') {
    return { oz: totalOz, eighths };
  }
  
  if (unit === 'lb') {
    const lbs = Math.floor(totalOz / 16);
    const oz = totalOz % 16;
    return { lb: lbs, oz, eighths };
  }
  
  return {};
};

export const parseLegacyWeightToGrams = (raw: string | undefined | null): number | null => {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/\s/g, '');
  const num = parseFloat(s);
  if (isNaN(num)) return null;

  if (s.includes('kg')) return num * 1000;
  if (s.includes('oz')) return num * 28.3495;
  if (s.includes('lb')) return num * 453.592;
  return num; // Default assumption is grams
};

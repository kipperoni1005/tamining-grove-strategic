export function dryMatterKg(weightKg: number, moisturePct: number) {
  return weightKg * (1 - moisturePct / 100);
}
export function toStdMoistureKg(dryMatterKgValue: number, stdMoisturePct: number) {
  const denom = 1 - stdMoisturePct / 100;
  return denom === 0 ? 0 : dryMatterKgValue / denom;
}
export function saleValueKes(amountSoldKg: number, unitPrice: number) {
  return amountSoldKg * unitPrice;
}
export function totalCostsKes(t: number, s: number, o: number) {
  return (t || 0) + (s || 0) + (o || 0);
}
export function grossMarginKes(saleValue: number, totalCosts: number) {
  return saleValue - totalCosts;
}
export function daysSince(dateISO: string) {
  const d = new Date(dateISO);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}
export function addDaysISO(dateISO: string, days: number) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + (days || 0));
  return d.toISOString().slice(0,10);
}

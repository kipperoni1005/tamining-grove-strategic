export type Settings = { id: string; standard_moisture: number; currency: string; company_name: string; };
export type Field = { id: string; name: string; size_acres: number; };
export type Variety = { id: string; name: string; };
export type Store = { id: string; name: string; location: string | null; };

export type FieldCostEntry = {
  id: string; cost_date: string; field_id: string; category: string;
  description: string | null; amount_kes: number; reference_no: string | null;
};

export type Batch = {
  id: string; batch_code: string; harvest_date: string;
  field_id: string | null; variety_id: string | null; store_id: string | null;
  weight_harvested_kg: number | null; moisture_pct: number; weight_stored_kg: number;
  dry_matter_kg: number; stored_std_kg: number;
};

export type Sale = {
  id: string; sale_date: string; batch_id: string;
  buyer: string | null; buyer_type: string; invoice_no: string | null;
  amount_sold_kg: number; unit_price_kes: number; sale_value_kes: number;
  transport_cost_kes: number; storage_cost_kes: number; other_costs_kes: number;
  total_costs_kes: number; gross_margin_kes: number;
  payment_terms_days: number; expected_payment_date: string | null;
  amount_paid_kes: number; payment_status: string;
};

export type ReceivableRow = {
  id: string;
  sale_date: string;
  buyer: string | null;
  buyer_type: string;
  invoice_no: string | null;
  sale_value_kes: number;
  amount_paid_kes: number;
  outstanding_kes: number;
  payment_status: string;
  payment_terms_days: number;
  expected_payment_date_calc: string;
};

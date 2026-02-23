// TypeScript types mirroring backend Pydantic schemas exactly.

export interface MonthlyResult {
  month: number;
  monthly_volume: number;
  ai_cases: number;
  human_cases: number;
  coverage_pct: number;
  token_cost_per_case: number;
  voice_cost_per_case: number;
  image_cost_per_case: number;
  ai_cost_per_case: number;
  ai_total_cost: number;
  manual_labor_cost: number;
  monthly_savings: number;
  cumulative_savings: number;
  remaining_fte: number;
  freed_capacity_fte: number;
}

export interface ScenarioResults {
  monthly: MonthlyResult[];
  break_even_month: number | null;
  roi_12m: number;
  roi_24m: number;
  roi_36m: number;
  roi_48m: number;
  total_savings_48m: number;
  cost_savings_pct: number;
  total_ai_investment_48m: number;
  total_manual_cost_48m: number;
  remaining_fte: number;
  freed_capacity_fte: number;
}

export interface BusinessCaseScenario {
  id: string;
  business_case_id: string;
  name: string;
  sort_order: number;
  llm_input_price_per_1k: number;
  llm_output_price_per_1k: number;
  cached_input_price_per_1k: number;
  stt_price_per_minute: number;
  tts_price_per_1k_chars: number;
  ivr_price_per_minute: number;
  image_price_per_image: number;
  results: Partial<ScenarioResults>;
  created_at: string;
  updated_at: string;
}

export interface BusinessCase {
  id: string;
  use_case_id: string;

  // Modality
  has_voice: boolean;
  has_realtime_audio: boolean;
  has_image_processing: boolean;
  has_text_only: boolean;
  stt_service: string | null;
  tts_service: string | null;
  llm_model: string | null;
  ivr_service: string | null;

  // Volume & FTE
  weekly_volume: number;
  avg_duration_minutes: number;
  token_density_input: number;
  token_density_output: number;
  caching_ratio: number;
  fte_count: number;
  avg_fte_annual_cost: number;
  fte_monthly_overhead: number;
  coverage_ramp: number[];

  // Cost model
  implementation_cost: number;
  implementation_amortization_months: number;
  monthly_infra_cost: number;
  monthly_maintenance_cost: number;

  // Growth rates
  volume_growth_rate_yoy: number;
  complexity_growth_rate_yoy: number;
  inflation_rate_yoy: number;

  // Scenarios
  scenarios: BusinessCaseScenario[];

  created_at: string;
  updated_at: string;
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface ModalityUpdate {
  has_voice?: boolean;
  has_realtime_audio?: boolean;
  has_image_processing?: boolean;
  has_text_only?: boolean;
  stt_service?: string | null;
  tts_service?: string | null;
  llm_model?: string | null;
  ivr_service?: string | null;
}

export interface AssumptionsUpdate {
  weekly_volume?: number;
  avg_duration_minutes?: number;
  token_density_input?: number;
  token_density_output?: number;
  caching_ratio?: number;
  fte_count?: number;
  avg_fte_annual_cost?: number;
  fte_monthly_overhead?: number;
  coverage_ramp?: number[];
  implementation_cost?: number;
  implementation_amortization_months?: number;
  monthly_infra_cost?: number;
  monthly_maintenance_cost?: number;
  volume_growth_rate_yoy?: number;
  complexity_growth_rate_yoy?: number;
  inflation_rate_yoy?: number;
}

export interface ScenarioCreate {
  name: string;
  llm_input_price_per_1k?: number;
  llm_output_price_per_1k?: number;
  cached_input_price_per_1k?: number;
  stt_price_per_minute?: number;
  tts_price_per_1k_chars?: number;
  ivr_price_per_minute?: number;
  image_price_per_image?: number;
}

export interface ScenarioUpdate {
  name?: string;
  llm_input_price_per_1k?: number;
  llm_output_price_per_1k?: number;
  cached_input_price_per_1k?: number;
  stt_price_per_minute?: number;
  tts_price_per_1k_chars?: number;
  ivr_price_per_minute?: number;
  image_price_per_image?: number;
}

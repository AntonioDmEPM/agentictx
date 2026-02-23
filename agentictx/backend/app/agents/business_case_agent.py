"""Business Case financial model engine.

Pure deterministic Python — no LLM calls. Computes 48-month P&L model
for a given BusinessCase + Scenario pair.
"""
from __future__ import annotations

from app.schemas.business_case import MonthlyResult, ScenarioResults


def _pad_ramp(ramp: list[float], length: int = 48) -> list[float]:
    """Pad coverage_ramp to exactly `length` entries.

    Propagates the last value when the list is shorter; truncates if longer.
    """
    if not ramp:
        return [0.0] * length
    padded = list(ramp[:length])
    last = padded[-1]
    while len(padded) < length:
        padded.append(last)
    return padded


def compute_scenario(bc: object, scenario: object) -> ScenarioResults:
    """Run the 48-month financial model for one scenario.

    Parameters
    ----------
    bc:
        BusinessCase ORM instance (or any object with matching attributes).
    scenario:
        BusinessCaseScenario ORM instance.

    Returns
    -------
    ScenarioResults
        Fully computed results including per-month breakdown and summary metrics.
    """
    # ── Modality flags ────────────────────────────────────────────────────────
    use_stt = bool(bc.has_voice and not bc.has_realtime_audio)
    use_tts = bool(bc.has_voice and not bc.has_realtime_audio)
    use_audio_tokens = bool(bc.has_realtime_audio)
    use_image = bool(bc.has_image_processing)
    use_ivr = bool(bc.ivr_service)

    # ── Coverage ramp ─────────────────────────────────────────────────────────
    ramp = _pad_ramp(list(bc.coverage_ramp or []))

    # ── Pricing shortcuts ─────────────────────────────────────────────────────
    llm_in_price = scenario.llm_input_price_per_1k      # $ per 1k tokens
    llm_out_price = scenario.llm_output_price_per_1k
    cached_price = scenario.cached_input_price_per_1k
    stt_price = scenario.stt_price_per_minute            # $ per minute
    tts_price = scenario.tts_price_per_1k_chars          # $ per 1k chars
    ivr_price = scenario.ivr_price_per_minute            # $ per minute
    img_price = scenario.image_price_per_image           # $ per image

    # ── Assumption shortcuts ──────────────────────────────────────────────────
    weekly_vol: int = bc.weekly_volume or 0
    avg_dur: float = bc.avg_duration_minutes or 0.0
    tokens_in: int = bc.token_density_input or 0
    tokens_out: int = bc.token_density_output or 0
    caching_ratio: float = bc.caching_ratio if bc.caching_ratio is not None else 0.3
    fte_count: int = bc.fte_count or 1
    fte_annual: float = bc.avg_fte_annual_cost or 0.0
    fte_overhead: float = bc.fte_monthly_overhead or 0.0
    impl_cost: float = bc.implementation_cost or 0.0
    amort_months: int = bc.implementation_amortization_months or 12
    infra: float = bc.monthly_infra_cost or 0.0
    maintenance: float = bc.monthly_maintenance_cost or 0.0
    vol_growth: float = bc.volume_growth_rate_yoy or 0.0
    complexity_growth: float = bc.complexity_growth_rate_yoy or 0.0
    inflation: float = bc.inflation_rate_yoy or 0.0

    # ── Manual labor baseline (constant — represents the full team cost) ──────
    manual_labor_monthly = (fte_count * fte_annual / 12.0) + fte_overhead

    # ── Amortization per month ────────────────────────────────────────────────
    amort_per_month = impl_cost / max(amort_months, 1)

    # ── Main loop ─────────────────────────────────────────────────────────────
    monthly_results: list[MonthlyResult] = []
    cumulative_savings = 0.0
    cumulative_ai_cost = 0.0
    cumulative_manual_cost = 0.0
    break_even_month: int | None = None

    for m in range(48):
        year = m // 12          # 0-indexed year (0=Y1, 1=Y2, …)
        month_1indexed = m + 1

        # Volume growth
        vol_factor = (1.0 + vol_growth) ** year
        monthly_vol = weekly_vol * vol_factor * (52.0 / 12.0)

        coverage_pct = ramp[m]
        ai_cases = monthly_vol * coverage_pct
        human_cases = monthly_vol * (1.0 - coverage_pct)

        # Token count scaling by complexity growth
        complexity_factor = (1.0 + complexity_growth) ** year
        effective_tokens_in = tokens_in * complexity_factor
        effective_tokens_out = tokens_out * complexity_factor

        # ── Token cost per case ───────────────────────────────────────────────
        if use_audio_tokens:
            # Realtime audio: all tokens billed at audio rates (llm prices repurposed)
            token_cost_per_case = (
                (effective_tokens_in / 1000.0) * llm_in_price
                + (effective_tokens_out / 1000.0) * llm_out_price
            )
        else:
            # Standard text: split by caching_ratio
            cached_tokens = effective_tokens_in * caching_ratio
            uncached_tokens = effective_tokens_in * (1.0 - caching_ratio)
            token_cost_per_case = (
                (cached_tokens / 1000.0) * cached_price
                + (uncached_tokens / 1000.0) * llm_in_price
                + (effective_tokens_out / 1000.0) * llm_out_price
            )

        # ── Voice cost per case ───────────────────────────────────────────────
        voice_cost_per_case = 0.0
        if use_stt:
            voice_cost_per_case += avg_dur * stt_price
        if use_tts:
            # Approximate chars: tokens_out × 4
            chars = effective_tokens_out * 4.0
            voice_cost_per_case += (chars / 1000.0) * tts_price
        if use_ivr:
            voice_cost_per_case += avg_dur * ivr_price

        # ── Image cost per case ───────────────────────────────────────────────
        image_cost_per_case = img_price if use_image else 0.0

        # ── Total AI cost per case ────────────────────────────────────────────
        ai_cost_per_case = token_cost_per_case + voice_cost_per_case + image_cost_per_case

        # ── Inflation factor for fixed costs ──────────────────────────────────
        inflation_factor = (1.0 + inflation) ** year

        # ── Monthly AI total cost ─────────────────────────────────────────────
        variable_ai_cost = ai_cost_per_case * ai_cases
        fixed_ai_cost = (
            (infra + maintenance) * inflation_factor
            + (amort_per_month if month_1indexed <= amort_months else 0.0)
        )
        ai_total_cost = variable_ai_cost + fixed_ai_cost

        # ── Guard: cost per case when no AI cases ─────────────────────────────
        if ai_cases == 0:
            ai_cost_per_case_display = 0.0
        else:
            ai_cost_per_case_display = ai_total_cost / ai_cases

        # ── Savings ───────────────────────────────────────────────────────────
        monthly_savings = manual_labor_monthly - ai_total_cost
        cumulative_savings += monthly_savings

        if break_even_month is None and cumulative_savings > 0:
            break_even_month = month_1indexed

        cumulative_ai_cost += ai_total_cost
        cumulative_manual_cost += manual_labor_monthly

        # ── FTE impact ────────────────────────────────────────────────────────
        remaining_fte = fte_count * (1.0 - coverage_pct)
        freed_fte = fte_count * coverage_pct

        monthly_results.append(
            MonthlyResult(
                month=month_1indexed,
                monthly_volume=round(monthly_vol, 2),
                ai_cases=round(ai_cases, 2),
                human_cases=round(human_cases, 2),
                coverage_pct=round(coverage_pct, 4),
                token_cost_per_case=round(token_cost_per_case, 6),
                voice_cost_per_case=round(voice_cost_per_case, 6),
                image_cost_per_case=round(image_cost_per_case, 6),
                ai_cost_per_case=round(ai_cost_per_case_display, 6),
                ai_total_cost=round(ai_total_cost, 2),
                manual_labor_cost=round(manual_labor_monthly, 2),
                monthly_savings=round(monthly_savings, 2),
                cumulative_savings=round(cumulative_savings, 2),
                remaining_fte=round(remaining_fte, 2),
                freed_capacity_fte=round(freed_fte, 2),
            )
        )

    # ── Summary metrics ───────────────────────────────────────────────────────
    def _cumulative_savings_at(month: int) -> float:
        if month > len(monthly_results):
            return monthly_results[-1].cumulative_savings if monthly_results else 0.0
        return monthly_results[month - 1].cumulative_savings

    def _cumulative_ai_cost_at(month: int) -> float:
        return sum(r.ai_total_cost for r in monthly_results[:month])

    def _roi_at(month: int) -> float:
        total_inv = _cumulative_ai_cost_at(month)
        if total_inv == 0:
            return 0.0
        return (_cumulative_savings_at(month) / total_inv) * 100.0

    max_ramp = max(ramp) if ramp else 0.0
    remaining_fte_final = fte_count * (1.0 - max_ramp)
    freed_fte_final = fte_count * max_ramp

    total_savings_48m = cumulative_savings
    total_manual_cost_48m = cumulative_manual_cost
    cost_savings_pct = (
        (total_savings_48m / total_manual_cost_48m * 100.0)
        if total_manual_cost_48m > 0
        else 0.0
    )

    return ScenarioResults(
        monthly=monthly_results,
        break_even_month=break_even_month,
        roi_12m=round(_roi_at(12), 2),
        roi_24m=round(_roi_at(24), 2),
        roi_36m=round(_roi_at(36), 2),
        roi_48m=round(_roi_at(48), 2),
        total_savings_48m=round(total_savings_48m, 2),
        cost_savings_pct=round(cost_savings_pct, 2),
        total_ai_investment_48m=round(cumulative_ai_cost, 2),
        total_manual_cost_48m=round(total_manual_cost_48m, 2),
        remaining_fte=round(remaining_fte_final, 2),
        freed_capacity_fte=round(freed_fte_final, 2),
    )

-- Scenario Studio: group scenarios into a reusable topic with age-specific variants.
alter table public.scenarios
  add column if not exists scenario_group text,
  add column if not exists age_band text;

update public.scenarios
set scenario_group = coalesce(nullif(scenario_group, ''), slug),
    age_band = coalesce(
      nullif(age_band, ''),
      case age_rating
        when '12_plus' then '12_13'
        when '16_plus' then '16_17'
        when 'all_ages' then 'all'
        else age_rating
      end
    );

create index if not exists scenarios_scenario_group_idx
  on public.scenarios (scenario_group);

create index if not exists scenarios_age_band_idx
  on public.scenarios (age_band);

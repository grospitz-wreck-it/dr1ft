-- DR1FT interest taxonomy: IAB Content Taxonomy 3.1 crosswalk.
-- Additive only: stable DR1FT interest keys remain unchanged.
-- IAB IDs are the "Unique ID" values in the official v3.1 TSV.
-- This migration does not change feed ranking or write post tags.

alter table public.ambient_interests
  add column if not exists parent_key text null
    references public.ambient_interests(key) on update cascade on delete restrict,
  add column if not exists is_selectable boolean not null default true,
  add column if not exists taxonomy_status text not null default 'active'
    check (taxonomy_status in ('active', 'deprecated', 'hidden'));

create index if not exists idx_ambient_interests_parent_order
  on public.ambient_interests (parent_key, sort_order);

create table if not exists public.ambient_interest_iab_categories (
  interest_key text not null
    references public.ambient_interests(key) on update cascade on delete cascade,
  iab_taxonomy_version text not null default '3.1',
  iab_category_id text not null,
  mapping_kind text not null default 'broad'
    check (mapping_kind in ('direct', 'broad', 'extension')),
  mapping_note text,
  created_at timestamptz not null default now(),
  primary key (interest_key, iab_taxonomy_version, iab_category_id)
);

create index if not exists idx_ambient_interest_iab_categories_iab
  on public.ambient_interest_iab_categories (iab_taxonomy_version, iab_category_id);

alter table public.ambient_interest_iab_categories enable row level security;

drop policy if exists "read IAB mappings for active ambient interests"
  on public.ambient_interest_iab_categories;
create policy "read IAB mappings for active ambient interests"
  on public.ambient_interest_iab_categories for select
  using (
    exists (
      select 1
      from public.ambient_interests i
      where i.key = interest_key
        and i.is_active = true
        and i.taxonomy_status = 'active'
    )
  );

-- Curated initial crosswalk. Some DR1FT interests intentionally map to a broad
-- parent because IAB does not provide an exact equivalent. Content should still
-- be tagged by its actual topic, not solely by the interest that inspired it.
insert into public.ambient_interest_iab_categories
  (interest_key, iab_taxonomy_version, iab_category_id, mapping_kind, mapping_note)
values
  ('gaming','3.1','680','direct','Video Gaming parent'),
  ('minecraft','3.1','680','extension','DR1FT game-specific child'),
  ('fortnite','3.1','680','extension','DR1FT game-specific child'),
  ('roblox','3.1','680','extension','DR1FT game/platform-specific child'),
  ('esports','3.1','682','direct','eSports'),
  ('indie-games','3.1','680','extension','DR1FT subcategory'),
  ('gaming-news','3.1','680','broad','Classify the subject as well as the news format'),
  ('game-design','3.1','680','broad','Game design spans gaming and technology'),
  ('game-design','3.1','596','broad','Technology & Computing'),
  ('streaming','3.1','JLBCU7','broad','Entertainment; classify actual subject as well'),
  ('memes','3.1','432','broad','Pop Culture'),
  ('internet-culture','3.1','432','broad','Pop Culture'),
  ('social-media','3.1','80DV8O','broad','Communication'),
  ('creators','3.1','432','broad','Pop Culture; creators span topics'),
  ('podcasts','3.1','JLBCU7','broad','Entertainment format; also tag episode subject'),
  ('anime','3.1','641','direct','Animation & Anime'),
  ('manga','3.1','46','broad','Comics and Graphic Novels'),
  ('movies','3.1','324','direct','Movies'),
  ('series','3.1','640','broad','Television'),
  ('comedy','3.1','646','direct','Comedy'),
  ('horror','3.1','336','direct','Horror'),
  ('scifi','3.1','652','direct','Science Fiction'),
  ('fantasy','3.1','335','direct','Fantasy'),
  ('music','3.1','338','direct','Music'),
  ('pop','3.1','338','broad','Music; DR1FT subgenre'),
  ('hip-hop','3.1','338','broad','Music; DR1FT subgenre'),
  ('rock','3.1','363','direct','Rock Music'),
  ('electronic','3.1','338','broad','Music; DR1FT subgenre'),
  ('indie-music','3.1','343','broad','Alternative Music; approximate mapping'),
  ('classical-music','3.1','346','direct','Classical Music'),
  ('concerts','3.1','8VZQHL','broad','Events; also tag music where relevant'),
  ('sports','3.1','483','direct','Sports'),
  ('football','3.1','533','direct','Soccer'),
  ('basketball','3.1','547','direct','Basketball'),
  ('handball','3.1','483','extension','Sports parent; no exact node verified'),
  ('volleyball','3.1','541','direct','Volleyball'),
  ('tennis','3.1','539','direct','Tennis'),
  ('skateboarding','3.1','503','direct','Skateboarding'),
  ('cycling','3.1','492','direct','Cycling'),
  ('running','3.1','227','direct','Running and Jogging'),
  ('fitness','3.1','225','direct','Fitness and Exercise'),
  ('motorsport','3.1','518','broad','Auto Racing'),
  ('dance','3.1','203','direct','Dance'),
  ('drawing','3.1','251','direct','Drawing and Sketching'),
  ('painting','3.1','254','direct','Painting'),
  ('photography','3.1','255','direct','Photography'),
  ('video','3.1','596','broad','Production format; classify actual video topic too'),
  ('writing','3.1','42','broad','Books and Literature; writing is broader than literature'),
  ('fashion','3.1','552','direct','Style & Fashion'),
  ('design','3.1','204','direct','Design'),
  ('crafts','3.1','248','direct','Arts and Crafts'),
  ('technology','3.1','596','direct','Technology & Computing'),
  ('programming','3.1','596','extension','DR1FT child of Technology & Computing'),
  ('ai','3.1','597','direct','Artificial Intelligence'),
  ('space','3.1','464','broad','Science'),
  ('science','3.1','464','direct','Science'),
  ('psychology','3.1','464','broad','Science; not a health diagnosis category'),
  ('history','3.1','EZWB7V','direct','History'),
  ('geography','3.1','469','direct','Geography'),
  ('inventions','3.1','596','broad','Technology & Computing'),
  ('inventions','3.1','464','broad','Science'),
  ('nature','3.1','467','broad','Environment'),
  ('animals','3.1','422','broad','Pets; too narrow for all wildlife'),
  ('dogs','3.1','425','direct','Dogs'),
  ('cats','3.1','424','direct','Cats'),
  ('wildlife','3.1','464','broad','Science'),
  ('oceans','3.1','464','broad','Science'),
  ('hiking','3.1','159','broad','Outdoor Activities'),
  ('camping','3.1','159','broad','Outdoor Activities'),
  ('climate','3.1','467','direct','Environment'),
  ('food','3.1','210','direct','Food & Drink'),
  ('cooking','3.1','216','direct','Cooking'),
  ('baking','3.1','210','extension','DR1FT child of Food & Drink'),
  ('street-food','3.1','210','extension','DR1FT child of Food & Drink'),
  ('travel','3.1','653','direct','Travel'),
  ('cities','3.1','655','broad','Travel Locations; urban life may be broader'),
  ('cars','3.1','1','direct','Automotive'),
  ('architecture','3.1','274','broad','Home & Garden; context-dependent'),
  ('architecture','3.1','201','broad','Fine Art; context-dependent'),
  ('books','3.1','42','direct','Books and Literature'),
  ('comics','3.1','46','direct','Comics and Graphic Novels'),
  ('art','3.1','201','direct','Fine Art'),
  ('theatre','3.1','209','direct','Theater'),
  ('language','3.1','147','broad','Language Learning'),
  ('culture','3.1','432','broad','Pop Culture; culture is wider than this node'),
  ('culture','3.1','201','broad','Fine Art; context-dependent'),
  ('news','3.1','80DV8O','broad','Communication; also classify actual subject'),
  ('politics','3.1','386','direct','Politics'),
  ('society','3.1','386','broad','Politics; broad approximation'),
  ('justice','3.1','383','broad','Law; distinguish social theme from legal advice'),
  ('human-rights','3.1','383','broad','Law'),
  ('human-rights','3.1','386','broad','Politics; do not infer user political beliefs'),
  ('future','3.1','464','broad','Science'),
  ('future','3.1','596','broad','Technology & Computing'),
  ('school-life','3.1','132','broad','Education'),
  ('friends','3.1','186','broad','Family and Relationships'),
  ('relationships','3.1','186','direct','Family and Relationships'),
  ('humor','3.1','646','broad','Comedy'),
  ('self-expression','3.1','201','broad','Fine Art'),
  ('self-expression','3.1','552','broad','Style & Fashion'),
  ('mental-wellbeing','3.1','232','broad','Wellness; do not infer a health condition from engagement')
on conflict (interest_key, iab_taxonomy_version, iab_category_id) do update
set mapping_kind = excluded.mapping_kind,
    mapping_note = excluded.mapping_note;

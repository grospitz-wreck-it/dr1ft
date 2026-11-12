# DR1FT interest taxonomy — IAB Content Taxonomy 3.1 crosswalk (draft)

**Status:** design artifact / proposed mapping; not a production taxonomy or migration.  
**DR1FT source:** `supabase/migrations/0043_ambient_interest_preferences.sql` (94 stable keys).  
**IAB source:** IAB Tech Lab, `Content Taxonomy 3.1.tsv`, official repository, downloaded for this review from `InteractiveAdvertisingBureau/Taxonomies` (main; source file SHA `a3a76ad293ade6485187a2903ee916c16bf1cf01`; 704 rows in the TSV).  
**Purpose:** align content classification with a standard while retaining DR1FT's more granular opt-in interests.

## Design decision

Do **not** use IAB as the Player's interest list or replace DR1FT keys with IAB IDs. IAB Content Taxonomy describes what a post is about; a DR1FT interest expresses what a player chooses to see more of. They overlap, but are not the same data.

Recommended model:

1. **IAB content classification**: one or more IAB Content Taxonomy 3.1 IDs assigned to each post, with the taxonomy version stored explicitly.
2. **DR1FT interest taxonomy**: stable DR1FT keys such as `minecraft`, `k-pop`, `skin-care`; hierarchical and curated by DR1FT.
3. **Crosswalk**: many-to-many mapping from DR1FT interest keys to suitable IAB content categories. A mapping may be broad or marked as a DR1FT-only extension.
4. **Post tagging**: posts can have multiple DR1FT interests and multiple IAB categories. Editorial selects DR1FT interests; IAB categories can be suggested from them and reviewed.
5. **Player preferences**: store only explicitly selected DR1FT interest keys. Never infer sensitive traits or use the IAB content categories a young person viewed to silently build a sensitive profile.

The IAB IDs below are the official **Unique ID** values from the v3.1 TSV, not the dotted IDs from older taxonomy representations.

## Crosswalk of the existing 94 DR1FT keys

Mappings are **proposed primary content classifications**, not assertions that an IAB category is an exact synonym for the DR1FT interest. “Broad/extension” means the IAB node is only a useful parent, or DR1FT needs its own child category.

| DR1FT key | Current label | Proposed IAB v3.1 ID and node | Mapping note |
|---|---|---|---|
| `gaming` | Gaming | `680` Video Gaming | Direct parent |
| `minecraft` | Minecraft | `680` Video Gaming | DR1FT-specific game child |
| `fortnite` | Fortnite | `680` Video Gaming | DR1FT-specific game child |
| `roblox` | Roblox | `680` Video Gaming | DR1FT-specific game/platform child |
| `esports` | E-Sport | `682` eSports | Direct |
| `indie-games` | Indie Games | `680` Video Gaming | DR1FT-specific subcategory |
| `gaming-news` | Gaming-News | `680` Video Gaming | Topic is gaming; “news” is format/editorial intent |
| `game-design` | Game Design | `680` Video Gaming; `596` Technology & Computing | Cross-domain; allow multiple categories |
| `streaming` | Streaming | `JLBCU7` Entertainment | Broad/format-led; also allow game/music/video categories as relevant |
| `memes` | Memes | `432` Pop Culture | Broad approximation; DR1FT child needed |
| `internet-culture` | Internetkultur | `432` Pop Culture | Broad approximation |
| `social-media` | Social Media | `80DV8O` Communication | Broad approximation; keep as DR1FT child |
| `creators` | Creator & Influencer | `432` Pop Culture | Broad approximation; creator topic can span other categories |
| `podcasts` | Podcasts | `JLBCU7` Entertainment | Format is not a topic; also tag subject category |
| `anime` | Anime | `641` Animation & Anime | Direct |
| `manga` | Manga | `46` Comics and Graphic Novels | Best parent; keep manga as DR1FT child |
| `movies` | Filme | `324` Movies | Direct |
| `series` | Serien | `640` Television | Best parent; “series” can also be web/video content |
| `comedy` | Comedy | `646` Comedy | Direct genre |
| `horror` | Horror | `336` Horror | Direct genre |
| `scifi` | Sci-Fi | `652` Science Fiction | Direct genre |
| `fantasy` | Fantasy | `335` Fantasy | Direct genre |
| `music` | Musik | `338` Music | Direct parent |
| `pop` | Pop | `338` Music | DR1FT music subgenre; avoid assuming this means Pop Culture |
| `hip-hop` | Hip-Hop & Rap | `338` Music | DR1FT subgenre; no exact matching node verified in this pass |
| `rock` | Rock | `363` Rock Music | Direct |
| `electronic` | Elektronische Musik | `338` Music | DR1FT subgenre; no exact matching node verified in this pass |
| `indie-music` | Indie | `343` Alternative Music | Approximation; label is currently ambiguous (“Indie” should be clarified as music) |
| `classical-music` | Klassische Musik | `346` Classical Music | Direct |
| `concerts` | Konzerte & Festivals | `8VZQHL` Events | Broad event parent; use music as an additional tag |
| `sports` | Sport | `483` Sports | Direct parent |
| `football` | Fußball | `533` Soccer | Direct (IAB calls it “Soccer”) |
| `basketball` | Basketball | `547` Basketball | Direct |
| `handball` | Handball | `483` Sports | DR1FT child; no exact IAB node verified |
| `volleyball` | Volleyball | `541` Volleyball | Direct |
| `tennis` | Tennis | `539` Tennis | Direct |
| `skateboarding` | Skateboarding | `503` Skateboarding | Direct (under Extreme Sports) |
| `cycling` | Radfahren | `492` Cycling | Direct |
| `running` | Laufen | `227` Running and Jogging | Direct |
| `fitness` | Fitness | `225` Fitness and Exercise | Direct |
| `motorsport` | Motorsport | `518` Auto Racing | Best parent; include `1` Automotive where the post is about cars/vehicles |
| `dance` | Tanzen | `203` Dance | Direct topic node (Fine Art) |
| `drawing` | Zeichnen | `251` Drawing and Sketching | Direct |
| `painting` | Malen | `254` Painting | Direct |
| `photography` | Fotografie | `255` Photography | Direct |
| `video` | Videos drehen | `596` Technology & Computing | Broad/production-oriented; use topic categories for what the video is about |
| `writing` | Schreiben | `42` Books and Literature | Broad approximation; writing is a creative activity, not always literature |
| `fashion` | Mode | `552` Style & Fashion | Direct parent |
| `design` | Design | `204` Design | Direct |
| `crafts` | Basteln & DIY | `248` Arts and Crafts | Direct parent |
| `technology` | Technik | `596` Technology & Computing | Direct parent |
| `programming` | Programmieren | `596` Technology & Computing | DR1FT child |
| `ai` | KI & Künstliche Intelligenz | `597` Artificial Intelligence | Direct |
| `space` | Weltraum | `464` Science | Broad parent; DR1FT child |
| `science` | Wissenschaft | `464` Science | Direct parent |
| `psychology` | Psychologie | `464` Science | Broad parent; distinguish educational psychology content from health advice |
| `history` | Geschichte | `EZWB7V` History | Direct node under Genres in IAB; taxonomy placement is not ideal for DR1FT UX |
| `geography` | Geografie | `469` Geography | Direct |
| `inventions` | Erfindungen | `596` Technology & Computing; `464` Science | Cross-domain; allow multiple categories |
| `nature` | Natur | `467` Environment | Broad approximation; can also use `150` Attractions for outdoor-place content |
| `animals` | Tiere | `422` Pets | Too narrow for all animals; use `464` Science for wildlife/nature content |
| `dogs` | Hunde | `425` Dogs | Direct |
| `cats` | Katzen | `424` Cats | Direct |
| `wildlife` | Wildtiere | `464` Science | Broad parent; DR1FT child |
| `oceans` | Meere & Ozeane | `464` Science | Broad parent; DR1FT child |
| `hiking` | Wandern | `159` Outdoor Activities | Direct/broad |
| `camping` | Camping | `159` Outdoor Activities | Direct/broad |
| `climate` | Klima & Umwelt | `467` Environment | Direct/broad; political coverage can additionally use Politics |
| `food` | Essen | `210` Food & Drink | Direct parent |
| `cooking` | Kochen | `216` Cooking | Direct |
| `baking` | Backen | `210` Food & Drink | DR1FT child; IAB match not exact |
| `street-food` | Street Food | `210` Food & Drink | DR1FT child; add Attractions for event/place posts |
| `travel` | Reisen | `653` Travel | Direct parent |
| `cities` | Städte | `655` Travel Locations | Best parent; urban life is broader than travel |
| `cars` | Autos | `1` Automotive | Direct parent |
| `architecture` | Architektur | `274` Home & Garden; `201` Fine Art | No exact dedicated node selected; multi-map by post context |
| `books` | Bücher | `42` Books and Literature | Direct parent |
| `comics` | Comics | `46` Comics and Graphic Novels | Direct |
| `art` | Kunst | `201` Fine Art | Direct parent |
| `theatre` | Theater | `209` Theater | Direct |
| `language` | Sprachen | `147` Language Learning | Best parent when educational; language/culture posts may need other categories |
| `culture` | Kultur | `432` Pop Culture; `201` Fine Art | Too broad for a single IAB category; multiple tags recommended |
| `news` | News & Aktuelles | `80DV8O` Communication | Broad approximation; classify by actual subject too |
| `politics` | Politik | `386` Politics | Direct |
| `society` | Gesellschaft | `386` Politics | Broad approximation; also Education/Communication depending on content |
| `justice` | Gerechtigkeit | `383` Law | Broad approximation; distinguish justice as a social theme from legal advice |
| `human-rights` | Menschenrechte | `383` Law; `386` Politics | Cross-domain; do not infer a user's political beliefs |
| `future` | Zukunft | `464` Science; `596` Technology & Computing | Broad topic; classify the specific post |
| `school-life` | Schulleben | `132` Education | Direct/broad |
| `friends` | Freundschaft | `186` Family and Relationships | Best parent; not an exact synonym |
| `relationships` | Beziehungen | `186` Family and Relationships | Direct/broad |
| `humor` | Humor | `646` Comedy | Best genre parent |
| `self-expression` | Selbstausdruck | `201` Fine Art; `552` Style & Fashion | Broad; use DR1FT-only parent if no specific content subject |
| `mental-wellbeing` | Wohlbefinden | `232` Wellness | Broad; treat carefully and do not infer a health condition from content engagement |

## Taxonomy gaps and proposed DR1FT-only extensions

These are proposed additions to the **interest** tree, not claims that each has an exact IAB node. They should be reviewed before any migration. They broaden the catalog for different tastes and lived experiences without labeling topics as belonging to a gender.

| Proposed stable key | Display label | Parent interest | IAB crosswalk / note |
|---|---|---|---|
| `k-pop` | K-Pop | Music | `338` Music; DR1FT child |
| `rnb-soul` | R&B & Soul | Music | `338` Music; DR1FT child |
| `music-discovery` | Neue Musik entdecken | Music | `338` Music; format/discovery interest |
| `beauty` | Beauty & Pflege | Style & Fashion | `553` Beauty |
| `skin-care` | Hautpflege | Beauty & Pflege | `559` Skin Care |
| `hair-care` | Haarpflege & Frisuren | Beauty & Pflege | `554` Hair Care |
| `nail-art` | Nail Art | Beauty & Pflege | `556` Nail Care |
| `makeup` | Make-up | Beauty & Pflege | `555` Makeup and Accessories |
| `sewing` | Nähen & Textil | Basteln & DIY | `248` Arts and Crafts; DR1FT child |
| `jewelry-making` | Schmuck gestalten | Basteln & DIY | `252` Jewelry Making |
| `books-fantasy` | Fantasy-Bücher | Bücher | `48` Fiction + `335` Fantasy |
| `books-romance` | Romance & Liebesromane | Bücher | `48` Fiction; DR1FT child |
| `booktok` | BookTok & Lesetrends | Bücher / Creator & Influencer | Multi-map; DR1FT-specific |
| `fan-culture` | Fandoms & Fan-Kultur | Internetkultur | `432` Pop Culture; DR1FT child |
| `cosplay` | Cosplay | Anime / Comics / Kreativ | Multi-map; DR1FT-specific |
| `dance-styles` | Tanzstile & Choreos | Tanzen | `203` Dance; DR1FT child |
| `food-culture` | Food-Trends & Rezepte | Essen | `210` Food & Drink |
| `friendship-drama` | Freundschaft & Gruppendynamik | Freundschaft | `186` Family and Relationships; keep age-appropriate |
| `study-tips` | Lern- & Study-Tipps | Schulleben | `132` Education |
| `wellbeing` | Alltag & Wohlbefinden | Alltag | `232` Wellness; optional opt-in only, no inferred profile |

## Editorial and feed implications

- Replace the hardcoded `INTEREST_OPTIONS` in Editorial with data loaded from the same canonical catalog used by Player.
- Keep stable DR1FT keys as the preference and tagging contract; add hierarchy and IAB mapping as separate fields/relations.
- Editorial should select one or more DR1FT interest keys per generated post. Store them in a normalized mapping or validated metadata—not only as arbitrary free text in `content_items.extra`.
- Store IAB IDs separately from DR1FT interest keys. Do not overload `user_ambient_preferences.interest_keys` with IAB IDs.
- Feed ranking should match explicit player preferences against post DR1FT tags; IAB categories can support fallback/discovery but should not override explicit interests.
- Use taxonomy version metadata (for example `iab_content_taxonomy_version = '3.1'`) so future updates can be mapped safely.
- A post can be about multiple topics; use a many-to-many mapping. Avoid forcing every post into exactly one category.
- Keep the common tree broad and non-stereotyped. Interests are available to everyone, not gated or recommended based on gender.
- Because DR1FT is intended for young users, do not silently derive sensitive personal traits from content tags or behavior. The IAB taxonomy itself warns that content classifications can become sensitive when linked to individual IDs over time.

## Recommended implementation sequence

1. Approve the crosswalk and the extension list.
2. Add additive schema support for `parent_key`, display/selectability metadata, IAB taxonomy version/ID mapping, and normalized post-interest tags. Preserve all existing keys.
3. Seed and validate the canonical catalog; make Player and Editorial read the same catalog.
4. Update Ambient Editorial to assign structured interest keys and IAB tags to each post.
5. Add preference-aware feed ranking and tests for untagged, multi-tagged, scenario-independent, and non-personalized fallback posts.
6. Backfill existing content conservatively: only use explicit metadata or reviewed mappings; don't infer tags from a user's viewing history.

## Sources

- Official IAB Tech Lab Content Taxonomy page: https://iabtechlab.com/standards/content-taxonomy/ (lists Content Taxonomy 3.1 and December 2024 release).
- Official machine-readable taxonomy: https://github.com/InteractiveAdvertisingBureau/Taxonomies/blob/main/Content%20Taxonomies/Content%20Taxonomy%203.1.tsv
- IAB Taxonomies repository / distinction between Content and Audience Taxonomies: https://github.com/InteractiveAdvertisingBureau/Taxonomies
- IAB implementation guidance: https://github.com/InteractiveAdvertisingBureau/Taxonomies/blob/main/implementation.md


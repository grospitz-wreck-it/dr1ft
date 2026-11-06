-- DR1FT: atomically create a student comment and its learning interaction.
--
-- The interaction hardening migration removes direct browser INSERT rights on
-- user_interactions. The previous API route inserted a comment first and then
-- silently ignored a failed interaction insert. This RPC makes both writes a
-- single transaction and derives the student identity from auth.uid().

create or replace function public.create_student_comment_atomically(
  p_content_item_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_instance_id uuid;
  v_parent_status text;
  v_parent_type text;
  v_parent_instance_id uuid;
  v_display_name text;
  v_username text;
  v_avatar_seed text;
  v_comment public.content_items%rowtype;
begin
  if v_user_id is null then
    raise exception 'Nicht authentifiziert'
      using errcode = '42501';
  end if;

  if p_content_item_id is null or nullif(btrim(coalesce(p_body, '')), '') is null then
    raise exception 'Beitrag und Kommentartext sind erforderlich'
      using errcode = '22023';
  end if;

  if char_length(btrim(p_body)) > 500 then
    raise exception 'Kommentar ist zu lang'
      using errcode = '22023';
  end if;

  select cim.class_instance_id
    into v_instance_id
  from public.class_instance_memberships cim
  join public.class_instances ci on ci.id = cim.class_instance_id
  where cim.user_id = v_user_id
    and cim.role = 'student'::public.user_role
    and cim.left_at is null
    and ci.is_active = true
  limit 1;

  if v_instance_id is null then
    raise exception 'Ein aktiver Schülerzugang ist erforderlich'
      using errcode = '42501';
  end if;

  select ci.status::text, ci.type::text, ci.class_instance_id
    into v_parent_status, v_parent_type, v_parent_instance_id
  from public.content_items ci
  where ci.id = p_content_item_id;

  if not found or v_parent_status <> 'live' or v_parent_type <> 'post' then
    raise exception 'Beitrag nicht verfügbar'
      using errcode = '42501';
  end if;

  if v_parent_instance_id is not null
     and v_parent_instance_id <> v_instance_id then
    raise exception 'Beitrag gehört zu einer anderen Klasseninstanz'
      using errcode = '42501';
  end if;

  select up.display_name, up.username, up.avatar_seed
    into v_display_name, v_username, v_avatar_seed
  from public.user_profiles up
  where up.id = v_user_id;

  insert into public.content_items (
    type,
    scenario_id,
    creator_id,
    parent_id,
    class_instance_id,
    body,
    status,
    manipulation_techniques,
    target_competencies,
    difficulty,
    age_rating,
    extra
  )
  values (
    'comment'::public.content_type,
    null,
    null,
    p_content_item_id,
    v_instance_id,
    btrim(p_body),
    'live'::public.content_status,
    array[]::text[],
    array[]::uuid[],
    1,
    '12_plus'::public.age_rating,
    jsonb_build_object(
      'parentContentItemId', p_content_item_id,
      'createdBy', 'student',
      'userId', v_user_id,
      'displayName', coalesce(v_display_name, 'DR1FT User'),
      'username', coalesce(v_username, 'user'),
      'avatarSeed', coalesce(v_avatar_seed, v_user_id::text)
    )
  )
  returning * into v_comment;

  insert into public.user_interactions (
    user_id,
    content_item_id,
    interaction_type,
    class_instance_id,
    metadata
  )
  values (
    v_user_id,
    p_content_item_id,
    'comment',
    v_instance_id,
    jsonb_build_object('commentId', v_comment.id)
  );

  return jsonb_build_object(
    'id', v_comment.id,
    'body', v_comment.body,
    'parent_id', v_comment.parent_id,
    'class_instance_id', v_comment.class_instance_id,
    'created_at', v_comment.created_at,
    'extra', v_comment.extra
  );
end;
$function$;

revoke all on function public.create_student_comment_atomically(uuid, text)
  from public, anon, authenticated;
grant execute on function public.create_student_comment_atomically(uuid, text)
  to authenticated, service_role;

comment on function public.create_student_comment_atomically(uuid, text) is
  'Creates a comment and its mission-evaluation interaction in one transaction, deriving the student identity and class instance from the authenticated session.';

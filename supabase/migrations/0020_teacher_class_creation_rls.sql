-- ============================================================
-- DR1FT — Teacher: sichere Erstellung von Klassen
--
-- Fix für den Bootstrap-Flow:
-- Eine Lehrkraft muss eine Klasse erstellen können, bevor sie
-- Mitglied dieser Klasse ist. Danach wird sie als Teacher-Mitglied
-- eingetragen und die normalen Membership-Regeln greifen.
-- ============================================================

-- ---------- CLASSES ----------
-- Bereits authentifizierte Nutzer dürfen nur Klassen erstellen,
-- bei denen sie selbst als created_by eingetragen sind.
create policy "authenticated users can create own classes"
  on classes for insert
  to authenticated
  with check (created_by = auth.uid());

-- Ersteller dürfen ihre eigene Klasse sehen, auch bevor die
-- Membership-Zeile angelegt wurde.
create policy "class creators can view own classes"
  on classes for select
  to authenticated
  using (created_by = auth.uid());

-- ---------- CLASS MEMBERSHIPS ----------
-- Bootstrap-Fall: Der Ersteller einer Klasse darf sich selbst
-- als Teacher dieser neu erstellten Klasse eintragen.
create policy "class creators can bootstrap teacher membership"
  on class_memberships for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role in ('teacher', 'school_admin')
    and exists (
      select 1
      from classes c
      where c.id = class_memberships.class_id
        and c.created_by = auth.uid()
    )
  );

-- Bestehende Teacher/Admin-Mitglieder dürfen weiterhin
-- Memberships ihrer eigenen Klassen verwalten.
create policy "teachers can insert memberships of own class"
  on class_memberships for insert
  to authenticated
  with check (
    exists (
      select 1
      from class_memberships cm
      where cm.class_id = class_memberships.class_id
        and cm.user_id = auth.uid()
        and cm.role in ('teacher', 'school_admin')
    )
  );

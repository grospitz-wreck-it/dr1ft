-- Allow school administrators to view class instances and memberships
-- belonging to their own school, plus profiles of current class members.

DROP POLICY IF EXISTS "school admins view their school class instances"
ON public.class_instances;

CREATE POLICY "school admins view their school class instances"
ON public.class_instances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.school_memberships AS sm
    WHERE sm.user_id = (SELECT auth.uid())
      AND sm.school_id = class_instances.school_id
      AND sm.active = true
      AND sm.role IN ('school_admin', 'school_lead')
  )
);

DROP POLICY IF EXISTS "school admins view their school class memberships"
ON public.class_instance_memberships;

CREATE POLICY "school admins view their school class memberships"
ON public.class_instance_memberships
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.class_instances AS ci
    JOIN public.school_memberships AS sm
      ON sm.school_id = ci.school_id
    WHERE ci.id = class_instance_memberships.class_instance_id
      AND sm.user_id = (SELECT auth.uid())
      AND sm.active = true
      AND sm.role IN ('school_admin', 'school_lead')
  )
);

DROP POLICY IF EXISTS "school admins view profiles in their school classes"
ON public.user_profiles;

CREATE POLICY "school admins view profiles in their school classes"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.class_instance_memberships AS cim
    JOIN public.class_instances AS ci
      ON ci.id = cim.class_instance_id
    JOIN public.school_memberships AS sm
      ON sm.school_id = ci.school_id
    WHERE cim.user_id = user_profiles.id
      AND cim.left_at IS NULL
      AND sm.user_id = (SELECT auth.uid())
      AND sm.active = true
      AND sm.role IN ('school_admin', 'school_lead')
  )
);

"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

type PostInput = {
  id: string;
  postType: "text" | "image" | "embed" | "mixed" | "poll" | "true_false";
  interactionData?: { options?: string[]; responseMode?: "single" | "multiple" | "free_text"; resultDisplay?: "bar" | "pie"; correctAnswer?: "true" | "false"; explanation?: string };
  title: string;
  body: string;
  embedUrl?: string;
  sortOrder: number;
  imageField?: string;
};

function validateEmbed(raw: string) {
  if (!raw.trim()) return null;
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Bitte eine gültige Embed-URL einfügen."); }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    const id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
    if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) throw new Error("Ungültige YouTube-URL.");
    return { provider: "youtube", url: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean).pop();
    if (!id || !/^\d+$/.test(id)) throw new Error("Ungültige Vimeo-URL.");
    return { provider: "vimeo", url: `https://player.vimeo.com/video/${id}` };
  }
  throw new Error("Unterstützt werden aktuell YouTube und Vimeo.");
}

export async function getTeacherModulePosts(classInstanceId: string, moduleId: string) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  // The assignment lookup is class-scoped and subject to the existing RLS
  // policies. Never return posts for a module not assigned to this class.
  // Run the independent, class-scoped assignment check and post query in
  // parallel. RLS still protects the post table; the assignment check remains
  // mandatory before any post data is returned to the client.
  const [assignmentResult, postsResult] = await Promise.all([
    supabase
      .from("teacher_module_class_assignments")
      .select("id")
      .eq("class_instance_id", classInstanceId)
      .eq("module_id", moduleId)
      .maybeSingle(),
    supabase
      .from("teacher_module_posts")
      .select("id,post_type,title,body,image_path,embed_url,interaction_data,sort_order,status")
      .eq("module_id", moduleId)
      .eq("status", "published")
      .order("sort_order", { ascending: true }),
  ]);
  const { data: assignment, error: assignmentError } = assignmentResult;
  const { data: posts, error: postsError } = postsResult;

  if (assignmentError || !assignment) {
    throw new Error("Du hast keinen Zugriff auf dieses Modul.");
  }
  if (postsError) throw new Error("Modulbeiträge konnten nicht geladen werden.");

  return await Promise.all((posts ?? []).map(async (post: any) => {
    const { data: imageData, error: imageError } = post.image_path
      ? await supabase.storage.from("teacher-module-assets").createSignedUrl(post.image_path, 60 * 60)
      : { data: null, error: null };

    if (imageError) {
      throw new Error("Ein Modulbild konnte nicht geladen werden.");
    }

    return {
      id: post.id,
      postType: post.post_type,
      title: post.title ?? "",
      body: post.body ?? "",
      embedUrl: post.embed_url ?? "",
      imageUrl: imageData?.signedUrl ?? null,
      interactionData: post.interaction_data ?? { options: ["Echt", "Fake"] },
    };
  }));
}

export async function saveTeacherCreatedModule(formData: FormData) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const classInstanceId = String(formData.get("classInstanceId") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const titleCardEnabled = formData.get("titleCardEnabled") !== "false";
  const visibilityScope = ["private", "school", "class"].includes(String(formData.get("visibilityScope"))) ? String(formData.get("visibilityScope")) : "class";
  const postsRaw = String(formData.get("posts") ?? "[]");
  if (!classInstanceId || !schoolId) throw new Error("Klassen- oder Schulzuordnung fehlt.");
  if (!title || title.length > 120) throw new Error("Bitte einen Modultitel mit maximal 120 Zeichen angeben.");

  // Resolve the target class first. A school administrator is not required to
  // have a separate class_instance_memberships row: their authority is scoped
  // to their own school via the canonical is_school_admin_of() helper.
  const { data: classInstance, error: classError } = await supabase
    .from("class_instances")
    .select("id,school_id")
    .eq("id", classInstanceId)
    .maybeSingle();

  if (classError || !classInstance) {
    throw new Error("Die ausgewählte Klasse wurde nicht gefunden.");
  }
  if (classInstance.school_id !== schoolId) {
    throw new Error("Die Klasse gehört nicht zu dieser Schule.");
  }

  const { data: schoolMembership } = await supabase
    .from("school_memberships")
    .select("school_id,role")
    .eq("school_id", schoolId)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  const isSchoolAdmin = ["school_admin"].includes(schoolMembership?.role ?? "");
  let isClassTeacher = false;
  if (!isSchoolAdmin) {
    const { data: membership, error: membershipError } = await supabase
      .from("class_instance_memberships")
      .select("id,role")
      .eq("class_instance_id", classInstanceId)
      .eq("user_id", user.id)
      .eq("role", "teacher")
      .is("left_at", null)
      .maybeSingle();
    isClassTeacher = !membershipError && Boolean(membership);
  }

  // A class teacher may be assigned directly to a class instance even if
  // no separate school_memberships row exists (legacy/imported memberships).
  // School admins and school leads are authorized at school scope.
  if (!isSchoolAdmin && !isClassTeacher) {
    throw new Error("Du hast keine Berechtigung, Inhalte für diese Klasse zu erstellen.");
  }

  let posts: PostInput[];
  try { posts = JSON.parse(postsRaw); } catch { throw new Error("Die Beitragsdaten sind ungültig."); }
  if (!Array.isArray(posts) || posts.length < 1 || posts.length > 40) throw new Error("Ein Modul benötigt mindestens einen und höchstens 40 Beiträge.");

  const { data: module, error: moduleError } = await supabase
    .from("teacher_modules")
    .insert({ school_id: schoolId, created_by: user.id, title, description, title_card_enabled: titleCardEnabled, intro_title: null, intro_text: null, visibility_scope: visibilityScope, status: "draft" })
    .select("id")
    .single();
  if (moduleError || !module) throw new Error(moduleError?.message ?? "Modul konnte nicht angelegt werden.");

  const rows = [];
  for (let index = 0; index < posts.length; index++) {
    const post = posts[index];
    if (!post.id || !["text", "image", "embed", "mixed", "poll", "true_false"].includes(post.postType)) throw new Error("Ungültiger Beitrag.");
    // Always let the server mint the database primary key. Client draft IDs are
    // only correlation keys for uploaded files and must never become DB IDs.
    const postId = crypto.randomUUID();
    const embed = post.embedUrl ? validateEmbed(post.embedUrl) : null;
    const file = post.imageField ? formData.get(post.imageField) : null;
    let imagePath: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.type !== "image/webp" || file.size > 8 * 1024 * 1024) {
        throw new Error("Bilder müssen vor dem Upload in WebP umgewandelt werden und dürfen maximal 8 MB groß sein.");
      }
      imagePath = `${schoolId}/${module.id}/${postId}.webp`;
      const { error: uploadError } = await supabase.storage.from("teacher-module-assets").upload(imagePath, file, { contentType: file.type, upsert: true });
      if (uploadError) throw new Error(uploadError.message);
    }
    rows.push({
      id: postId,
      module_id: module.id,
      post_type: post.postType,
      title: String(post.title ?? "").slice(0, 180),
      body: String(post.body ?? "").slice(0, 12000),
      image_path: imagePath,
      interaction_data: post.interactionData ?? {},
      embed_provider: embed?.provider ?? null,
      embed_url: embed?.url ?? null,
      sort_order: index,
      status: "published",
    });
  }

  const { error: postsError } = await supabase.from("teacher_module_posts").insert(rows);
  if (postsError) throw new Error(postsError.message);

  const { error: assignmentError } = await supabase.from("teacher_module_class_assignments").insert({
    module_id: module.id,
    school_id: schoolId,
    class_instance_id: classInstanceId,
    assigned_by: user.id,
    is_active: true,
  });
  if (assignmentError) throw new Error(assignmentError.message);

  const { error: publishError } = await supabase
    .from("teacher_modules")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", module.id)
    .eq("created_by", user.id);
  if (publishError) throw new Error(publishError.message);

  revalidatePath(`/classes/${classInstanceId}`);
  return { moduleId: module.id };
}


export async function updateTeacherCreatedModule(formData: FormData) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  const moduleId = String(formData.get("moduleId") ?? "");
  const classInstanceId = String(formData.get("classInstanceId") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const titleCardEnabled = formData.get("titleCardEnabled") !== "false";
  let posts: PostInput[];
  try { posts = JSON.parse(String(formData.get("posts") ?? "[]")); }
  catch { throw new Error("Die Beitragsdaten sind ungültig."); }
  if (!moduleId || !classInstanceId || !schoolId) throw new Error("Modul- oder Klassenzuordnung fehlt.");
  if (!title || title.length > 120) throw new Error("Bitte einen Modultitel mit maximal 120 Zeichen angeben.");
  if (!Array.isArray(posts) || posts.length < 1 || posts.length > 40) throw new Error("Ein Modul benötigt mindestens einen und höchstens 40 Beiträge.");

  const { data: module, error: moduleError } = await supabase.from("teacher_modules")
    .select("id,school_id,created_by")
    .eq("id", moduleId).eq("school_id", schoolId).maybeSingle();
  if (moduleError || !module) throw new Error("Das Modul wurde nicht gefunden.");
  if (module.created_by !== user.id) throw new Error("Nur die erstellende Lehrkraft kann dieses Modul bearbeiten.");

  const { data: classInstance } = await supabase.from("class_instances").select("id,school_id").eq("id", classInstanceId).maybeSingle();
  if (!classInstance || classInstance.school_id !== schoolId) throw new Error("Die Klasse gehört nicht zu dieser Schule.");
  const { data: admin } = await supabase.from("school_memberships").select("role").eq("school_id", schoolId).eq("user_id", user.id).eq("active", true).maybeSingle();
  const { data: teacher } = await supabase.from("class_instance_memberships").select("id").eq("class_instance_id", classInstanceId).eq("user_id", user.id).eq("role", "teacher").is("left_at", null).maybeSingle();
  if (admin?.role !== "school_admin" && !teacher) throw new Error("Du darfst dieses Modul nicht bearbeiten.");

  const { data: currentPosts, error: currentError } = await supabase.from("teacher_module_posts")
    .select("id,image_path").eq("module_id", moduleId);
  if (currentError) throw new Error(currentError.message);
  const currentById = new Map((currentPosts ?? []).map((post: any) => [post.id, post]));
  const keepIds = new Set<string>();
  const rows = [];
  for (let index = 0; index < posts.length; index++) {
    const post = posts[index];
    if (!post.id || !["text","image","embed","mixed","poll","true_false"].includes(post.postType)) throw new Error("Ungültiger Beitrag.");
    const isExisting = currentById.has(post.id);
    const postId = isExisting ? post.id : crypto.randomUUID();
    keepIds.add(postId);
    const embed = post.embedUrl ? validateEmbed(post.embedUrl) : null;
    const file = post.imageField ? formData.get(post.imageField) : null;
    let imagePath: string | null = isExisting ? (currentById.get(post.id) as any).image_path : null;
    if (file instanceof File && file.size > 0) {
      if (file.type !== "image/webp" || file.size > 8 * 1024 * 1024) throw new Error("Bilder müssen vor dem Upload in WebP umgewandelt werden und dürfen maximal 8 MB groß sein.");
      imagePath = `${schoolId}/${moduleId}/${postId}.webp`;
      const { error: uploadError } = await supabase.storage.from("teacher-module-assets").upload(imagePath, file, { contentType: file.type, upsert: true });
      if (uploadError) throw new Error(uploadError.message);
    }
    rows.push({ id: postId, module_id: moduleId, post_type: post.postType, title: String(post.title ?? "").slice(0,180), body: String(post.body ?? "").slice(0,12000), image_path: imagePath, interaction_data: post.interactionData ?? {}, embed_provider: embed?.provider ?? null, embed_url: embed?.url ?? null, sort_order: index, status: "published" });
  }
  const visibilityScope = ["private", "school", "class"].includes(String(formData.get("visibilityScope"))) ? String(formData.get("visibilityScope")) : "class";
  const { error: updateModuleError } = await supabase.from("teacher_modules").update({ title, description, title_card_enabled: titleCardEnabled, visibility_scope: visibilityScope }).eq("id", moduleId);
  if (updateModuleError) throw new Error(updateModuleError.message);
  const removedIds = (currentPosts ?? []).filter((post: any) => !keepIds.has(post.id)).map((post: any) => post.id);
  if (removedIds.length) {
    const { error } = await supabase.from("teacher_module_posts").delete().in("id", removedIds).eq("module_id", moduleId);
    if (error) throw new Error(error.message);
  }
  const { error: postsError } = await supabase.from("teacher_module_posts").upsert(rows, { onConflict: "id" });
  if (postsError) throw new Error(postsError.message);
  revalidatePath(`/classes/${classInstanceId}`);
  return { moduleId };
}



export async function getTeacherModulePollResults(classInstanceId: string, moduleId: string, postId: string) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: assignment, error: assignmentError } = await supabase
    .from("teacher_module_class_assignments")
    .select("id,school_id")
    .eq("class_instance_id", classInstanceId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (assignmentError || !assignment) throw new Error("Du hast keinen Zugriff auf diese Klasse.");

  const { data: admin } = await supabase.from("school_memberships").select("role")
    .eq("school_id", assignment.school_id).eq("user_id", user.id).eq("active", true).maybeSingle();
  const { data: teacher } = await supabase.from("class_instance_memberships").select("id")
    .eq("class_instance_id", classInstanceId).eq("user_id", user.id).eq("role", "teacher").is("left_at", null).maybeSingle();
  if (admin?.role !== "school_admin" && !teacher) throw new Error("Nur die Lehrkraft dieser Klasse kann Ergebnisse einsehen.");

  const { data: post, error: postError } = await supabase.from("teacher_module_posts")
    .select("id,post_type,title,interaction_data").eq("id", postId).eq("module_id", moduleId).maybeSingle();
  if (postError || !post || post.post_type !== "poll") throw new Error("Für diesen Beitrag gibt es keine Umfrageergebnisse.");
  const config = (post.interaction_data ?? {}) as { options?: string[]; responseMode?: string; resultDisplay?: "bar" | "pie" };
  if (config.responseMode === "free_text") throw new Error("Freitextantworten werden separat angezeigt.");

  const { data: votes, error } = await supabase.from("teacher_module_post_votes")
    .select("choice,selected_choices").eq("post_id", postId).eq("class_instance_id", classInstanceId);
  if (error) throw new Error("Umfrageergebnisse konnten nicht geladen werden.");

  const counts = (config.options ?? []).map((label, index) => {
    const key = "option_" + (index + 1);
    const count = (votes ?? []).filter((vote: any) => {
      const choices = Array.isArray(vote.selected_choices) && vote.selected_choices.length
        ? vote.selected_choices : [vote.choice];
      return choices.includes(key);
    }).length;
    return { label, count };
  });
  return { title: post.title ?? "Umfrage", total: (votes ?? []).length, counts, resultDisplay: config.resultDisplay ?? "bar" };
}

export async function getTeacherModuleFreeTextReport(classInstanceId: string, moduleId: string) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: assignment, error: assignmentError } = await supabase
    .from("teacher_module_class_assignments")
    .select("id,school_id,teacher_modules(title)")
    .eq("class_instance_id", classInstanceId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (assignmentError || !assignment) throw new Error("Modulzuordnung nicht gefunden.");

  const { data: admin } = await supabase.from("school_memberships").select("role")
    .eq("school_id", assignment.school_id).eq("user_id", user.id).eq("active", true).maybeSingle();
  const { data: teacher } = await supabase.from("class_instance_memberships").select("id")
    .eq("class_instance_id", classInstanceId).eq("user_id", user.id).eq("role", "teacher").is("left_at", null).maybeSingle();
  if (admin?.role !== "school_admin" && !teacher) throw new Error("Nur die Lehrkraft dieser Klasse kann Antworten einsehen.");

  const [{ data: posts, error: postsError }, { data: members, error: membersError }, { data: votes, error: votesError }] = await Promise.all([
    supabase.from("teacher_module_posts").select("id,title,interaction_data,post_type")
      .eq("module_id", moduleId).eq("post_type", "poll").order("sort_order", { ascending: true }),
    supabase.from("class_instance_memberships").select("user_id,user_profiles(display_name,username)")
      .eq("class_instance_id", classInstanceId).eq("role", "student").is("left_at", null),
    supabase.from("teacher_module_post_votes").select("post_id,user_id,text_answer,created_at")
      .eq("module_id", moduleId).eq("class_instance_id", classInstanceId).not("text_answer", "is", null),
  ]);
  if (postsError || membersError || votesError) throw new Error("Die Antwortübersicht konnte nicht geladen werden.");

  const freeTextPosts = (posts ?? []).filter((post: any) => (post.interaction_data as { responseMode?: string } | null)?.responseMode === "free_text");
  const profiles = new Map((members ?? []).map((member: any) => [member.user_id, member.user_profiles]));
  const rows = freeTextPosts.flatMap((post: any) => {
    const byStudent = new Map((votes ?? []).filter((vote: any) => vote.post_id === post.id).map((vote: any) => [vote.user_id, vote]));
    return (members ?? []).map((member: any) => {
      const vote: any = byStudent.get(member.user_id);
      const profile: any = profiles.get(member.user_id);
      return {
        postId: post.id,
        question: post.title?.trim() || "Freitextfrage ohne Titel",
        student: profile?.display_name || profile?.username || "Schüler:in",
        username: profile?.username ? "@" + profile.username : "",
        answer: vote?.text_answer ?? "",
        submittedAt: vote?.created_at ?? null,
      };
    });
  });
  return {
    moduleTitle: (assignment as any).teacher_modules?.title ?? "Lernmodul",
    generatedAt: new Date().toISOString(),
    rows,
    questionCount: freeTextPosts.length,
    studentCount: members?.length ?? 0,
  };
}

export async function getTeacherModuleFreeTextResponses(classInstanceId: string, moduleId: string, postId: string) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: assignment, error: assignmentError } = await supabase
    .from("teacher_module_class_assignments")
    .select("id,school_id")
    .eq("class_instance_id", classInstanceId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (assignmentError || !assignment) throw new Error("Du hast keinen Zugriff auf diese Klasse.");

  const { data: admin } = await supabase.from("school_memberships").select("role")
    .eq("school_id", assignment.school_id).eq("user_id", user.id).eq("active", true).maybeSingle();
  const { data: teacher } = await supabase.from("class_instance_memberships").select("id")
    .eq("class_instance_id", classInstanceId).eq("user_id", user.id).eq("role", "teacher").is("left_at", null).maybeSingle();
  if (admin?.role !== "school_admin" && !teacher) throw new Error("Nur die Lehrkraft dieser Klasse kann Antworten einsehen.");

  const { data: post, error: postError } = await supabase.from("teacher_module_posts")
    .select("id,interaction_data,post_type").eq("id", postId).eq("module_id", moduleId).maybeSingle();
  const interactionConfig = post?.interaction_data as { responseMode?: string } | null;
  if (postError || !post || post.post_type !== "poll" || interactionConfig?.responseMode !== "free_text") {
    throw new Error("Für diesen Beitrag gibt es keine Freitextantworten.");
  }

  const { data: responses, error } = await supabase.from("teacher_module_post_votes")
    .select("user_id,text_answer,created_at")
    .eq("post_id", postId).eq("class_instance_id", classInstanceId)
    .not("text_answer", "is", null).order("created_at", { ascending: false });
  if (error) throw new Error("Antworten konnten nicht geladen werden.");

  const userIds = Array.from(new Set((responses ?? []).map(row => row.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("user_profiles").select("id,display_name,username").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null; username: string | null }[] };
  const profileById = new Map((profiles ?? []).map(profile => [profile.id, profile]));
  return (responses ?? []).map(row => ({
    answer: row.text_answer ?? "",
    submittedAt: row.created_at,
    student: profileById.get(row.user_id)?.display_name || profileById.get(row.user_id)?.username || "Schüler:in",
  }));
}

export async function setTeacherModuleAssignmentActive(classInstanceId: string, assignmentId: string, active: boolean) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: assignment, error: assignmentError } = await supabase
    .from("teacher_module_class_assignments")
    .select("id,school_id,class_instance_id,assigned_by")
    .eq("id", assignmentId)
    .eq("class_instance_id", classInstanceId)
    .maybeSingle();
  if (assignmentError || !assignment) throw new Error("Modulzuordnung nicht gefunden.");

  const { data: schoolMembership } = await supabase
    .from("school_memberships")
    .select("role")
    .eq("school_id", assignment.school_id)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  const isSchoolAdmin = ["school_admin"].includes(schoolMembership?.role ?? "");
  let isClassTeacher = false;
  if (!isSchoolAdmin) {
    const { data: membership } = await supabase
      .from("class_instance_memberships")
      .select("id")
      .eq("class_instance_id", classInstanceId)
      .eq("user_id", user.id)
      .eq("role", "teacher")
      .is("left_at", null)
      .maybeSingle();
    isClassTeacher = Boolean(membership);
  }
  if (!isSchoolAdmin && !isClassTeacher) throw new Error("Du darfst dieses Modul nicht verwalten.");

  const { error } = await supabase
    .from("teacher_module_class_assignments")
    .update({ is_active: active })
    .eq("id", assignmentId)
    .eq("class_instance_id", classInstanceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/classes/${classInstanceId}`);
}

export async function archiveTeacherModuleAssignment(classInstanceId: string, assignmentId: string) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  const { data: assignment, error: lookupError } = await supabase.from("teacher_module_class_assignments")
    .select("id,school_id").eq("id", assignmentId).eq("class_instance_id", classInstanceId).maybeSingle();
  if (lookupError || !assignment) throw new Error("Modulzuordnung nicht gefunden.");
  const { data: admin } = await supabase.from("school_memberships").select("role")
    .eq("school_id", assignment.school_id).eq("user_id", user.id).eq("active", true).maybeSingle();
  const { data: teacher } = await supabase.from("class_instance_memberships").select("id")
    .eq("class_instance_id", classInstanceId).eq("user_id", user.id).eq("role", "teacher").is("left_at", null).maybeSingle();
  if (admin?.role !== "school_admin" && !teacher) throw new Error("Du darfst dieses Modul nicht archivieren.");
  const { error } = await supabase.from("teacher_module_class_assignments")
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq("id", assignmentId).eq("class_instance_id", classInstanceId);
  if (error) throw new Error(error.message);
  revalidatePath("/classes/" + classInstanceId);
}

export async function deleteTeacherCreatedModule(classInstanceId: string, moduleId: string) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  const { data: module, error: moduleError } = await supabase.from("teacher_modules")
    .select("id,school_id,created_by").eq("id", moduleId).maybeSingle();
  if (moduleError || !module) throw new Error("Eigenes Modul nicht gefunden.");
  if (module.created_by !== user.id) throw new Error("Nur die erstellende Person darf dieses Modul endgültig löschen.");
  const { data: classInstance } = await supabase.from("class_instances").select("id,school_id").eq("id", classInstanceId).maybeSingle();
  if (!classInstance || classInstance.school_id !== module.school_id) throw new Error("Klasse und Modul gehören nicht zur selben Schule.");
  const { data: admin } = await supabase.from("school_memberships").select("role")
    .eq("school_id", module.school_id).eq("user_id", user.id).eq("active", true).maybeSingle();
  const { data: teacher } = await supabase.from("class_instance_memberships").select("id")
    .eq("class_instance_id", classInstanceId).eq("user_id", user.id).eq("role", "teacher").is("left_at", null).maybeSingle();
  if (admin?.role !== "school_admin" && !teacher) throw new Error("Du darfst dieses Modul nicht löschen.");
  const { data: files, error: listError } = await supabase.storage.from("teacher-module-assets").list(module.school_id + "/" + module.id);
  if (listError) throw new Error("Modulmedien konnten nicht geladen werden: " + listError.message);
  const objectPaths = (files ?? []).filter((file: any) => file.name).map((file: any) => module.school_id + "/" + module.id + "/" + file.name);
  if (objectPaths.length) {
    const { error: storageError } = await supabase.storage.from("teacher-module-assets").remove(objectPaths);
    if (storageError) throw new Error("Modulmedien konnten nicht gelöscht werden: " + storageError.message);
  }
  const { error: deleteError } = await supabase.from("teacher_modules").delete().eq("id", moduleId).eq("created_by", user.id);
  if (deleteError) throw new Error(deleteError.message);
  revalidatePath("/classes/" + classInstanceId);
}

export async function updateTeacherModuleSchedule(classInstanceId: string, assignmentId: string, startAt: string | null, endAt: string | null) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  if (startAt && endAt && new Date(endAt) <= new Date(startAt)) throw new Error("Das Ende muss nach dem Start liegen.");

  const { data: assignment, error: lookupError } = await supabase
    .from("teacher_module_class_assignments")
    .select("id,school_id")
    .eq("id", assignmentId)
    .eq("class_instance_id", classInstanceId)
    .maybeSingle();
  if (lookupError || !assignment) throw new Error("Modulzuordnung nicht gefunden.");

  const { data: schoolMembership } = await supabase
    .from("school_memberships")
    .select("role")
    .eq("school_id", assignment.school_id)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  const isSchoolAdmin = ["school_admin"].includes(schoolMembership?.role ?? "");
  let isClassTeacher = false;
  if (!isSchoolAdmin) {
    const { data: membership } = await supabase
      .from("class_instance_memberships")
      .select("id")
      .eq("class_instance_id", classInstanceId)
      .eq("user_id", user.id)
      .eq("role", "teacher")
      .is("left_at", null)
      .maybeSingle();
    isClassTeacher = Boolean(membership);
  }
  if (!isSchoolAdmin && !isClassTeacher) throw new Error("Du darfst diesen Zeitplan nicht ändern.");

  const { error } = await supabase
    .from("teacher_module_class_assignments")
    .update({ scheduled_start_at: startAt, scheduled_end_at: endAt })
    .eq("id", assignmentId)
    .eq("class_instance_id", classInstanceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/classes/${classInstanceId}`);
}


export async function assignExistingTeacherModule(classInstanceId: string, moduleId: string) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  const { data: targetClass, error: classError } = await supabase.from("class_instances").select("id,school_id").eq("id", classInstanceId).maybeSingle();
  if (classError || !targetClass?.school_id) throw new Error("Klasse nicht gefunden.");
  const { data: module, error: moduleError } = await supabase.from("teacher_modules").select("id,school_id,created_by,visibility_scope,status").eq("id", moduleId).maybeSingle();
  if (moduleError || !module || module.school_id !== targetClass.school_id || module.status !== "published") throw new Error("Dieses Modul ist nicht verfügbar.");
  const { data: schoolMember } = await supabase.from("school_memberships").select("role").eq("school_id", targetClass.school_id).eq("user_id", user.id).eq("active", true).maybeSingle();
  const { data: classMember } = await supabase.from("class_instance_memberships").select("role").eq("class_instance_id", classInstanceId).eq("user_id", user.id).eq("left_at", null).maybeSingle();
  const authorized = schoolMember?.role === "school_admin" || classMember?.role === "teacher" || (module.created_by === user.id && module.visibility_scope !== "school");
  if (!authorized) throw new Error("Du darfst dieses Modul dieser Klasse nicht zuweisen.");
  const { error } = await supabase.from("teacher_module_class_assignments").upsert({
    module_id: moduleId, school_id: targetClass.school_id, class_instance_id: classInstanceId, assigned_by: user.id, is_active: true, archived_at: null,
  }, { onConflict: "module_id,class_instance_id" });
  if (error) throw new Error(error.message);
  revalidatePath(`/classes/${classInstanceId}`);
}

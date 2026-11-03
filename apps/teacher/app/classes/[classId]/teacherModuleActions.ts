"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

type PostInput = {
  id: string;
  postType: "text" | "image" | "embed" | "mixed";
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

export async function saveTeacherCreatedModule(formData: FormData) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const classInstanceId = String(formData.get("classInstanceId") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
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

  const isSchoolAdmin = schoolMembership?.role === "school_admin";
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

  if (!schoolMembership || (!isSchoolAdmin && !isClassTeacher)) {
    throw new Error("Du hast keine Berechtigung, Inhalte für diese Klasse zu erstellen.");
  }

  let posts: PostInput[];
  try { posts = JSON.parse(postsRaw); } catch { throw new Error("Die Beitragsdaten sind ungültig."); }
  if (!Array.isArray(posts) || posts.length < 1 || posts.length > 40) throw new Error("Ein Modul benötigt mindestens einen und höchstens 40 Beiträge.");

  const { data: module, error: moduleError } = await supabase
    .from("teacher_modules")
    .insert({ school_id: schoolId, created_by: user.id, title, description, status: "draft" })
    .select("id")
    .single();
  if (moduleError || !module) throw new Error(moduleError?.message ?? "Modul konnte nicht angelegt werden.");

  const rows = [];
  for (let index = 0; index < posts.length; index++) {
    const post = posts[index];
    if (!post.id || !["text", "image", "embed", "mixed"].includes(post.postType)) throw new Error("Ungültiger Beitrag.");
    // Always let the server mint the database primary key. Client draft IDs are
    // only correlation keys for uploaded files and must never become DB IDs.
    const postId = crypto.randomUUID();
    const embed = post.embedUrl ? validateEmbed(post.embedUrl) : null;
    const file = post.imageField ? formData.get(post.imageField) : null;
    let imagePath: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 10 * 1024 * 1024) {
        throw new Error("Bilder müssen JPG, PNG, WebP oder GIF sein und dürfen maximal 10 MB groß sein.");
      }
      const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      imagePath = `${schoolId}/${module.id}/${postId}.${ext}`;
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
  const isSchoolAdmin = schoolMembership?.role === "school_admin";
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
  return setTeacherModuleAssignmentActive(classInstanceId, assignmentId, false);
}

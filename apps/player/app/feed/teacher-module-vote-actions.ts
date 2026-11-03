"use server";

import { supabaseServerClient } from "../../lib/supabaseServerClient";

export async function submitTeacherModulePostVote(input: {
  postId: string;
  classInstanceId: string;
  choice: "option_1" | "option_2" | "true" | "false";
}) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Bitte melde dich erneut an.");

  const { data: post, error: postError } = await supabase
    .from("teacher_module_posts")
    .select("id,post_type,interaction_data")
    .eq("id", input.postId)
    .maybeSingle();
  if (postError || !post) throw new Error("Diese Lernkarte ist nicht verfügbar.");

  const { data, error } = await supabase.rpc("submit_teacher_module_post_vote", {
    p_post_id: input.postId,
    p_class_instance_id: input.classInstanceId,
    p_choice: input.choice,
  });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ choice: string; vote_count: number; total_votes: number; my_choice: string }>;
  const counts = Object.fromEntries(rows.map(row => [row.choice, Number(row.vote_count)]));
  const total = rows[0] ? Number(rows[0].total_votes) : 0;
  const config = (post.interaction_data ?? {}) as { correctAnswer?: "true" | "false"; explanation?: string };
  return {
    counts,
    total,
    isCorrect: post.post_type === "true_false" ? input.choice === config.correctAnswer : null,
    explanation: post.post_type === "true_false" ? config.explanation ?? "" : "",
    correctAnswer: post.post_type === "true_false" ? config.correctAnswer ?? "true" : null,
  };
}

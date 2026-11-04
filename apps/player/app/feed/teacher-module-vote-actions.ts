"use server";

import { supabaseServerClient } from "../../lib/supabaseServerClient";

export async function submitTeacherModulePostVote(input: {
  postId: string;
  classInstanceId: string;
  choices?: string[];
  textAnswer?: string;
}) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Bitte melde dich erneut an.");

  const { data: post, error: postError } = await supabase
    .from("teacher_module_posts")
    .select("id,post_type,interaction_data")
    .eq("id", input.postId)
    .maybeSingle();
  if (postError || !post || !["poll", "true_false"].includes(post.post_type)) {
    throw new Error("Diese Umfrage ist nicht verfügbar.");
  }

  const config = (post.interaction_data ?? {}) as {
    responseMode?: "single" | "multiple" | "free_text";
    correctAnswer?: "true" | "false";
    explanation?: string;
  };
  const choices = post.post_type === "true_false"
    ? [(input.choices?.[0] === "option_2" ? "option_2" : "option_1")]
    : (input.choices ?? []);

  const { data, error } = await supabase.rpc("submit_teacher_module_post_vote", {
    p_post_id: input.postId,
    p_class_instance_id: input.classInstanceId,
    p_choices: choices,
    p_text_answer: input.textAnswer ?? null,
  });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ choice: string; vote_count: number; total_votes: number; my_choice: string }>;
  const counts = Object.fromEntries(rows.map(row => [row.choice, Number(row.vote_count)]));
  const total = rows[0] ? Number(rows[0].total_votes) : 0;
  const responseMode = post.post_type === "true_false" ? "single" : (config.responseMode ?? "single");
  return {
    counts,
    total,
    responseMode,
    isCorrect: post.post_type === "true_false" ? choices[0] === (config.correctAnswer === "false" ? "option_2" : "option_1") : null,
    explanation: post.post_type === "true_false" ? config.explanation ?? "" : "",
    correctAnswer: post.post_type === "true_false" ? config.correctAnswer ?? "true" : null,
  };
}

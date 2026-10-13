/**
 * submit.ts
 * Pengiriman data feedback: mendukung mode dummy dan Supabase.
 * Tidak memakai .select() setelah insert (sesuai aturan RLS).
 */

import { DATA_MODE } from "@/lib/data-mode";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSession } from "@/lib/supabase/session";
import type { FeedbackInput } from "./validate";

export class FeedbackUnavailableError extends Error {
  constructor() {
    super("Form belum bisa dipakai sekarang. Coba lagi nanti, atau chat lewat WhatsApp.");
    this.name = "FeedbackUnavailableError";
  }
}

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const clean = {
    name: input.name.trim(),
    email: input.email.trim(),
    subject: input.subject.trim(),
    message: input.message.trim(),
  };

  if (DATA_MODE === "dummy") {
    // Mode demo: simulasi jeda tanpa jaringan
    await new Promise((resolve) => setTimeout(resolve, 700));
    return;
  }

  if (DATA_MODE === "none") {
    throw new FeedbackUnavailableError();
  }

  const sb = createSupabaseBrowserClient();
  // Coba inisialisasi sesi jika auth anonim aktif, tetapi jangan gagalkan submit feedback jika anon auth belum diaktifkan
  try {
    await ensureSession(sb);
  } catch {
    // Abaikan error auth anonim: policy RLS feedback_messages mengizinkan publik anonim insert langsung
  }

  // Tanpa .select() karena policy RLS publik hanya insert
  const { error } = await sb.from("feedback_messages").insert(clean);
  if (error) {
    throw error;
  }
}

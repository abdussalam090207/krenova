/**
 * validate.ts
 * Aturan validasi input feedback (selaras dengan constraint SQL feedback_messages).
 * Tidak menggunakan library luar (pure TypeScript).
 */

export interface FeedbackInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export type FeedbackErrors = Partial<Record<keyof FeedbackInput, string>>;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateFeedback(v: FeedbackInput): FeedbackErrors {
  const e: FeedbackErrors = {};
  const name = v.name.trim();
  const email = v.email.trim();
  const subject = v.subject.trim();
  const message = v.message.trim();

  if (name.length < 2) {
    e.name = "Nama minimal 2 karakter.";
  } else if (name.length > 60) {
    e.name = "Nama maksimal 60 karakter.";
  }

  if (!EMAIL.test(email) || email.length > 254) {
    e.email = "Masukkan email yang valid, contoh: nama@email.com.";
  }

  if (subject.length < 3) {
    e.subject = "Subjek minimal 3 karakter.";
  } else if (subject.length > 100) {
    e.subject = "Subjek maksimal 100 karakter.";
  }

  if (message.length < 10) {
    e.message = "Pesan minimal 10 karakter.";
  } else if (message.length > 1000) {
    e.message = "Pesan maksimal 1000 karakter.";
  }

  return e;
}

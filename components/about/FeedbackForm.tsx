"use client";

import React, { useState, useRef, useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { FormField } from "./FormField";
import { validateFeedback, type FeedbackInput, type FeedbackErrors } from "@/lib/feedback/validate";
import { submitFeedback, FeedbackUnavailableError } from "@/lib/feedback/submit";
import { AnonAuthError } from "@/lib/supabase/session";
import { siteConfig, waLink } from "@/config/site";

export function FeedbackForm() {
  const [values, setValues] = useState<FeedbackInput>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [honeypot, setHoneypot] = useState("");
  const [touched, setTouched] = useState<Record<keyof FeedbackInput, boolean>>({
    name: false,
    email: false,
    subject: false,
    message: false,
  });
  const [errors, setErrors] = useState<FeedbackErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; isAuthOrUnavailable?: boolean } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Jebakan waktu anti-spam (harus > 3 detik sebelum kirim)
  const mountTimeRef = useRef<number>(0);
  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  // Ref elemen untuk memindahkan fokus saat error atau sukses
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  const handleChange = (field: keyof FeedbackInput, val: string) => {
    const updated = { ...values, [field]: val };
    setValues(updated);

    if (touched[field]) {
      const errs = validateFeedback(updated);
      setErrors((prev) => ({ ...prev, [field]: errs[field] }));
    }
  };

  const handleBlur = (field: keyof FeedbackInput) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validateFeedback(values);
    setErrors((prev) => ({ ...prev, [field]: errs[field] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Tandai semua disentuh
    setTouched({
      name: true,
      email: true,
      subject: true,
      message: true,
    });

    const errs = validateFeedback(values);
    setErrors(errs);

    // Cek error validasi pertama dan fokus ke elemennya
    if (Object.keys(errs).length > 0) {
      if (errs.name) nameRef.current?.focus();
      else if (errs.email) emailRef.current?.focus();
      else if (errs.subject) subjectRef.current?.focus();
      else if (errs.message) messageRef.current?.focus();
      return;
    }

    setLoading(true);

    // Anti-spam honeypot
    if (honeypot.trim().length > 0) {
      // Tampilkan sukses palsu untuk bot
      setTimeout(() => {
        setLoading(false);
        setSubmitted(true);
      }, 700);
      return;
    }

    try {
      await submitFeedback(values);
      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof AnonAuthError || err instanceof FeedbackUnavailableError) {
        setSubmitError({
          message: "Form belum bisa dipakai sekarang. Coba lagi nanti, atau chat lewat WhatsApp.",
          isAuthOrUnavailable: true,
        });
      } else if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P0001") {
        setSubmitError({
          message: (err as { message?: string }).message || "Terlalu banyak permintaan. Coba beberapa saat lagi.",
        });
      } else {
        setSubmitError({
          message: "Pesan gagal terkirim. Periksa koneksi, lalu coba lagi.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setValues({ name: "", email: "", subject: "", message: "" });
    setTouched({ name: false, email: false, subject: false, message: false });
    setErrors({});
    setSubmitError(null);
    setSubmitted(false);
    mountTimeRef.current = Date.now();
  };

  // Fokus ke heading sukses saat berhasil terkirim
  useEffect(() => {
    if (submitted) {
      successHeadingRef.current?.focus();
    }
  }, [submitted]);

  return (
    <div className="space-y-3">

      <GlassCard className="glass glass-strong glass-sheen rounded-[32px] p-6 md:p-8 min-h-[540px] flex flex-col justify-between">
        {submitted ? (
          /* ── State Sukses ────────────────────────────────────── */
          <div
            role="status"
            className="my-auto py-8 text-center flex flex-col items-center justify-center space-y-4"
          >
            <div className="w-14 h-14 rounded-full bg-[--aqua]/10 border border-[--aqua]/30 flex items-center justify-center text-[--aqua]">
              <CheckCircle2 className="w-8 h-8" strokeWidth={1.5} />
            </div>

            <h2
              ref={successHeadingRef}
              tabIndex={-1}
              className="font-display text-2xl md:text-3xl font-bold text-[--text] outline-none"
            >
              Pesan terkirim
            </h2>

            <p className="text-[--text-2] text-sm md:text-base max-w-md mx-auto leading-relaxed">
              Terima kasih atas feedback-mu. Kalau perlu dibalas, kami hubungi lewat email yang kamu isi.
            </p>

            <div className="pt-4">
              <Button onClick={handleReset} variant="glass" size="lg">
                Kirim pesan lain
              </Button>
            </div>
          </div>
        ) : (
          /* ── Form Masukan ────────────────────────────────────── */
          <form noValidate onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[--text] tracking-tight">
                Kirim feedback
              </h2>
              <p className="text-xs text-[--text-2] mt-2 font-medium">
                Semua kolom wajib diisi.
              </p>
            </div>

            {/* Honeypot field (tersembunyi dari manusia & tab order) */}
            <div
              style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
              aria-hidden="true"
            >
              <label htmlFor="hp-website">Website</label>
              <input
                id="hp-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <FormField
                ref={nameRef}
                id="feedback-name"
                label="Nama"
                type="text"
                autoComplete="name"
                placeholder="Nama kamu"
                value={values.name}
                error={touched.name ? errors.name : undefined}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
              />

              <FormField
                ref={emailRef}
                id="feedback-email"
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="nama@email.com"
                value={values.email}
                error={touched.email ? errors.email : undefined}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
              />

              <FormField
                ref={subjectRef}
                id="feedback-subject"
                label="Subjek"
                type="text"
                autoComplete="off"
                placeholder="Tentang apa pesanmu?"
                value={values.subject}
                error={touched.subject ? errors.subject : undefined}
                onChange={(e) => handleChange("subject", e.target.value)}
                onBlur={() => handleBlur("subject")}
              />

              <FormField
                ref={messageRef}
                as="textarea"
                id="feedback-message"
                label="Pesan"
                placeholder="Tulis pesanmu di sini"
                value={values.message}
                maxLengthCount={1000}
                currentLength={values.message.length}
                error={touched.message ? errors.message : undefined}
                onChange={(e) => handleChange("message", e.target.value)}
                onBlur={() => handleBlur("message")}
              />
            </div>

            {/* Error pengiriman */}
            {submitError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 text-xs md:text-sm text-[#FF6B6B] flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="space-y-1">
                  <p>{submitError.message}</p>
                  {submitError.isAuthOrUnavailable && siteConfig.contacts[0] && (
                    <a
                      href={waLink(siteConfig.contacts[0].wa)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium underline text-[--aqua] hover:brightness-110"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      Chat WhatsApp sekarang
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full sm:w-auto min-h-[48px]"
              >
                {loading ? "Mengirim..." : "Kirim feedback"}
              </Button>
            </div>
          </form>
        )}
      </GlassCard>
    </div>
  );
}

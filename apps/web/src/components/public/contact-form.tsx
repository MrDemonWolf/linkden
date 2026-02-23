"use client";

import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ContactFormProps {
  captchaSiteKey?: string;
  captchaType?: string;
}

function generateMathChallenge() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { a, b, answer: a + b };
}

export function ContactForm({ captchaSiteKey, captchaType = "none" }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const captchaRef = useRef<HTMLDivElement>(null);
  const [mathChallenge, setMathChallenge] = useState(generateMathChallenge);
  const [mathAnswer, setMathAnswer] = useState("");

  const submitMutation = trpc.contact.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setName("");
      setEmail("");
      setMessage("");
      setCaptchaToken("");
    },
    onError: (err) => {
      setError(err.message || "Failed to submit. Please try again.");
    },
  });

  // Load Turnstile widget
  useEffect(() => {
    if (captchaType !== "turnstile" || !captchaSiteKey || !captchaRef.current) return;

    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      renderWidget();
    }

    function renderWidget() {
      if (
        captchaRef.current &&
        (window as any).turnstile &&
        captchaRef.current.children.length === 0
      ) {
        (window as any).turnstile.render(captchaRef.current, {
          sitekey: captchaSiteKey,
          callback: (token: string) => setCaptchaToken(token),
          "expired-callback": () => setCaptchaToken(""),
          theme: "dark",
        });
      }
    }
  }, [captchaSiteKey, captchaType]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!name.trim() || !email.trim() || !message.trim()) {
        setError("All fields are required.");
        return;
      }

      if (captchaType === "math") {
        if (Number.parseInt(mathAnswer, 10) !== mathChallenge.answer) {
          setError("Incorrect answer. Please try again.");
          setMathChallenge(generateMathChallenge());
          setMathAnswer("");
          return;
        }
      }

      if (captchaType === "turnstile" && captchaSiteKey && !captchaToken) {
        setError("Please complete the CAPTCHA verification.");
        return;
      }

      submitMutation.mutate({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        captchaToken: captchaType === "turnstile" ? captchaToken || "bypass" : "bypass",
      });
    },
    [name, email, message, captchaToken, captchaSiteKey, captchaType, mathAnswer, mathChallenge, submitMutation],
  );

  if (submitted) {
    return (
      <div className="glass-card text-center py-8">
        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-1">Message Sent!</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Thank you for reaching out. You will hear back soon.
        </p>
        <button onClick={() => setSubmitted(false)} className="glass-button mt-4">
          Send Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card space-y-4">
      <h3 className="text-lg font-semibold">Get in Touch</h3>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={200}
          className="glass-input"
          placeholder="Your name"
        />
      </div>

      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={200}
          className="glass-input"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm text-[var(--text-secondary)] mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          maxLength={5000}
          rows={4}
          className="glass-input resize-y"
          placeholder="Write your message..."
        />
      </div>

      {captchaType === "turnstile" && captchaSiteKey && <div ref={captchaRef} className="flex justify-center" />}

      {captchaType === "math" && (
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            What is {mathChallenge.a} + {mathChallenge.b}?
          </label>
          <input
            type="number"
            value={mathAnswer}
            onChange={(e) => setMathAnswer(e.target.value)}
            required
            className="glass-input"
            placeholder="Your answer"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={submitMutation.isPending}
        className="glass-button-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50"
      >
        {submitMutation.isPending ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {submitMutation.isPending ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}

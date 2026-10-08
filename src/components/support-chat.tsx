"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function SupportChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [error, setError] = useState("");
  const launcher = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    nameInput.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const result: { sent?: boolean; error?: string } = await response.json().catch(() => ({}));
      if (response.status === 503) {
        const name = String(data.get("name") || "");
        const email = String(data.get("email") || "");
        const message = String(data.get("message") || "");
        const subject = encodeURIComponent(`38 RICHES support - ${name}`);
        const body = encodeURIComponent(`${message}\n\nName: ${name}\nEmail: ${email}`);
        window.location.href = `mailto:38richiesclothing@gmail.com?subject=${subject}&body=${body}`;
        setHandoff(true);
        setSent(true);
        return;
      }
      if (!response.ok || result.sent !== true) throw new Error(result.error || "Your message could not be sent.");
      setSent(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Connection failed. Please email us directly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="support-chat">
      {open && (
        <section className="support-chat__panel" id="support-chat-panel" aria-labelledby="support-chat-title">
          <header>
            <div><small>38 RICHES CARE</small><h2 id="support-chat-title">How can we help?</h2></div>
            <button type="button" aria-label="Close support" onClick={() => { setOpen(false); launcher.current?.focus(); }}>Close</button>
          </header>
          <p>Send our team a message. We reply by email, not live chat. Never include passwords or payment details.</p>
          {sent ? (
            <div role="status">
              <p>{handoff ? "Your email app has opened with your message. Tap Send to reach 38richiesclothing@gmail.com." : "Your message was sent. Look out for our reply in your email inbox."}</p>
              <button type="button" className="button button--paper" onClick={() => { setSent(false); setError(""); }}>Send another message</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label>Your name<input ref={nameInput} name="name" autoComplete="name" required maxLength={100} /></label>
              <label>Email for our reply<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
              <label>Order reference (optional)<input name="reference" maxLength={100} /></label>
              <label>Message<textarea name="message" required minLength={10} maxLength={3000} rows={4} /></label>
              <div className="support-chat__trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              {error && <p role="alert" className="support-chat__error">{error}</p>}
              <button className="button button--paper" type="submit" disabled={pending}>{pending ? "Sending..." : "Send message"}</button>
            </form>
          )}
          <a className="support-chat__email" href="mailto:38richiesclothing@gmail.com">38richiesclothing@gmail.com</a>
        </section>
      )}
      <button ref={launcher} className="support-chat__launcher" type="button" aria-expanded={open} aria-controls="support-chat-panel" onClick={() => setOpen(!open)}>
        {open ? "Close support" : "Chat with us"}
      </button>
    </div>
  );
}

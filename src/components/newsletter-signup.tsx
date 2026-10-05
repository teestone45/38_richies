"use client";

import { FormEvent, useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setSubmitted(true);
    setEmail("");
  }

  return (
    <section className="newsletter page-shell" aria-label="Newsletter sign up">
      <div className="newsletter__content">
        <p className="eyebrow">DROP ALERTS</p>
        <h2>Stay close to the next run.</h2>
        <p>Get first access to new drops, restocks, styling notes, and community updates from the studio.</p>
      </div>

      <form className="newsletter__form" onSubmit={handleSubmit}>
        <label className="newsletter__label">
          <span>Email address</span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
            required
          />
        </label>
        <button type="submit" className="button button--lime">Join the list</button>
      </form>

      {submitted && (
        <p className="newsletter__status" role="status">
          You’re on the list. The next drop is already heading your way.
        </p>
      )}
    </section>
  );
}

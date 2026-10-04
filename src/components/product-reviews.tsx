"use client";

import { useState, type FormEvent } from "react";
import type { ProductReview } from "@/lib/products";

const ratings = [1, 2, 3, 4, 5];

function ReviewStars({ rating }: { rating: number }) {
  return <span className="review-stars" role="img" aria-label={`${rating} out of 5 stars`}>{ratings.map((star) => <span key={star} aria-hidden="true">{star <= rating ? "★" : "☆"}</span>)}</span>;
}

export default function ProductReviews({ productSlug, sizes, reviews: initialReviews }: { productSlug: string; sizes: string[]; reviews: ProductReview[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [sizePurchased, setSizePurchased] = useState(sizes[0] ?? "");
  const [height, setHeight] = useState("");
  const [fitFeedback, setFitFeedback] = useState<NonNullable<ProductReview["fitFeedback"]>>("true-to-size");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const average = reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0;

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(`/api/products/${encodeURIComponent(productSlug)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, email, orderReference, rating, comment, sizePurchased, height, fitFeedback, website: formData.get("website") }),
      });
      const result = await response.json() as { review?: ProductReview; error?: string };
      if (!response.ok || !result.review) throw new Error(result.error ?? "Could not submit your review.");
      setReviews((current) => [result.review!, ...current]);
      setCustomerName("");
      setEmail("");
      setOrderReference("");
      setSizePurchased(sizes[0] ?? "");
      setHeight("");
      setFitFeedback("true-to-size");
      setRating(5);
      setComment("");
      setMessage("Thanks for sharing your review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit your review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="product-reviews" aria-labelledby="product-reviews-title">
      <div className="product-reviews__heading">
        <div><p className="eyebrow">CUSTOMER NOTES</p><h2 id="product-reviews-title">REVIEWS</h2></div>
        <div className="product-reviews__summary" aria-live="polite">
          {reviews.length ? <><ReviewStars rating={Math.round(average)} /><strong>{average.toFixed(1)}</strong><span>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span></> : <span>No reviews yet</span>}
        </div>
      </div>

      <div className="product-reviews__layout">
        <div className="product-review-list">
          {reviews.length ? reviews.map((review) => (
            <article className="product-review" key={review._key}>
              <div className="product-review__byline"><strong>{review.customerName}</strong><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" })}</time></div>
              <div className="product-review__rating"><ReviewStars rating={review.rating} />{review.verifiedPurchase && <span>VERIFIED PURCHASE</span>}</div>
              {(review.sizePurchased || review.height || review.fitFeedback) && <p className="product-review__fit">{[review.sizePurchased && `Wore ${review.sizePurchased}`, review.height, review.fitFeedback && ({ "runs-small": "Fits small", "true-to-size": "True to size", oversized: "Oversized fit" } as const)[review.fitFeedback]].filter(Boolean).join(" / ")}</p>}
              <p>{review.comment}</p>
            </article>
          )) : <p className="product-reviews__empty">No reviews yet. Be the first to share your thoughts.</p>}
        </div>

        <form className="product-review-form" onSubmit={submitReview}>
          <p className="eyebrow">LEAVE A REVIEW</p>
          <label>Your name<input type="text" required minLength={2} maxLength={60} autoComplete="name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
          <label>Checkout email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Order reference<input type="text" required minLength={5} maxLength={128} autoComplete="off" value={orderReference} onChange={(event) => setOrderReference(event.target.value)} /></label>
          <label>Size purchased<select required value={sizePurchased} onChange={(event) => setSizePurchased(event.target.value)}>{sizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          <label>Height (optional)<input type="number" inputMode="numeric" min="120" max="220" step="1" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="Height in cm" /></label>
          <label>How did the fit feel?<select value={fitFeedback} onChange={(event) => setFitFeedback(event.target.value as NonNullable<ProductReview["fitFeedback"]>)}><option value="runs-small">Runs small</option><option value="true-to-size">True to size</option><option value="oversized">Oversized</option></select></label>
          <fieldset>
            <legend>Your rating</legend>
            <div className="product-review-form__rating" role="group" aria-label="Choose a star rating">
              {ratings.map((value) => <button type="button" key={value} aria-label={`${value} ${value === 1 ? "star" : "stars"}`} aria-pressed={rating === value} onClick={() => setRating(value)}>{value <= rating ? "★" : "☆"}</button>)}
            </div>
          </fieldset>
          <label>Your opinion<textarea required minLength={10} maxLength={800} rows={4} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
          <label className="product-review-form__website" aria-hidden="true">Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
          <button className="button button--lime" type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit review"}<span aria-hidden="true">↗</span></button>
          {message && <p className="product-review-form__message" role="status">{message}</p>}
        </form>
      </div>
    </section>
  );
}
# 38 RICHES

A Next.js App Router storefront with product search and filters, optional Sanity catalog management, per-size inventory, Paystack checkout in Ghanaian cedis, durable orders, fulfillment tools, and optional email notifications.

## Run locally

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>. The built-in catalog works without Sanity. Persistent admin edits, inventory, and order storage require Sanity. Real checkout requires a Paystack secret key.

## Admin and Sanity

Open <http://localhost:3000/admin>. The dashboard supports product search, multi-select Live/Draft/Featured actions, detail/price edits, per-size stock, up to eight product photos, order status, and tracking numbers.

Create a Sanity project and dataset. Add both the default export from `src/sanity/schemas/product.ts` and its `orderSchema` named export to your Studio schema types, then configure these server-only values in `.env.local` and in the deployment environment:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `SANITY_API_WRITE_TOKEN` with dataset write permission
- `SANITY_API_READ_TOKEN` when using a private dataset
- `ADMIN_USERNAME` and/or `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a random `ADMIN_SESSION_SECRET` of at least 32 bytes

Do not expose Sanity tokens or admin credentials through `NEXT_PUBLIC_` variables. After changing environment values, restart Next.js. Admin sessions use an HttpOnly SameSite cookie and expire after eight hours.

Stock is untracked until you enter a quantity for every available size, e.g. `M:4, L:2`. Tracked stock blocks checkout when a variant lacks enough units and is decremented only after Paystack verifies payment. Existing catalog entries are not assigned invented stock values.

Product photos support JPG, PNG, and WebP, up to eight images per product and 8 MB per file. Featured products sort before the rest of the catalog.

Selecting the first photo in the new-product form can draft a title, URL slug, category, colors, and description with OpenAI vision. Set the server-only `OPENAI_API_KEY` locally and in Vercel to enable it; optionally set `OPENAI_VISION_MODEL` (defaults to `gpt-4o-mini`). Review all suggestions and enter price, fabric, and stock yourself before uploading. AI drafting does not publish products; publishing still requires the Sanity write configuration above and an explicit form submission.

The new-product form accepts optional JPG, PNG, or WebP artwork up to 4 MB as a visual reference, then uses one action to generate a mockup, draft its name/category/description/suggested GHS price, and publish the product to Sanity. Set the server-only `VENICE_API_KEY` locally and in Vercel; optionally set `VENICE_IMAGE_MODEL` (defaults to `gpt-image-2-5-flare`), `VENICE_REFERENCE_IMAGE_MODEL` (defaults to `krea-v2-large` for artwork references), and `VENICE_TEXT_MODEL` (defaults to the vision-capable `qwen3-5-9b`). Each image/detail generation consumes Venice credits. Artwork guides the design, but generated logos/text may not reproduce exactly.

## Paystack and orders

Set `PAYSTACK_SECRET_KEY` to your Paystack test secret key (`sk_test_...`) in `.env.local` while developing. Add the same variable in Vercel Project Settings > Environment Variables for production, using your live secret key (`sk_live_...`) only when you are ready to accept live payments. This is a server-only secret: do not add a `NEXT_PUBLIC_` prefix or commit the key.

In the Paystack Dashboard, open Settings > API Keys & Webhooks and set the webhook URL to `<your-site-origin>/api/paystack/webhook`. Subscribe to the `charge.success` event. Paystack signs webhook requests with your secret key; no separate webhook signing secret is needed. For local webhook testing, expose your local server with a secure tunnel and use that public URL with `/api/paystack/webhook`.

Checkout calculates prices on the server in GHS pesewas, collects customer email and Ghana delivery details, and redirects to Paystack-hosted checkout. Shipping is GH₵8 below GH₵100 and complimentary at or above GH₵100. Orders are created only after the callback or signed webhook independently verifies the transaction with Paystack. Inventory is decremented once; if stock changed during payment, the order is flagged and a refund is requested.

The callback URL is `<your-site-origin>/success`. Configure `NEXT_PUBLIC_SITE_URL` to your production origin so Paystack returns customers to the correct site. The Orders tab appears in `/admin` after a verified payment and lets you mark orders paid, packing, shipped, or cancelled and save tracking numbers. Existing Stripe orders remain visible, but new checkout uses Paystack.

Keep using Paystack test keys until a full test checkout, callback, webhook, order record, and inventory update have been confirmed. Then switch Vercel to the live key and configure the production webhook URL in your Paystack live dashboard.

## Customer emails

Order confirmations and shipped notifications are sent only when `RESEND_API_KEY` and `ORDER_EMAIL_FROM` are configured. Verify the sender domain/address in Resend first. The webhook still records orders if email sending is not configured; shipping email status is shown in the admin notice.

## Deployment

Deploy the Next.js app to Vercel and set all required Sanity, admin, Paystack, and optional Resend environment variables there. Add `OPENAI_API_KEY` to enable admin photo drafting. Set `NEXT_PUBLIC_SITE_URL` to the production origin and configure `<your-site-origin>/api/paystack/webhook` in the Paystack Dashboard. Test checkout, callback, webhook, order/stock updates, fulfillment, and email flows before accepting live payments.

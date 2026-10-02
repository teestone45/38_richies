# 38 RICHES

A Next.js App Router storefront with 50 original vintage-inspired DTF/DTG tees, product search and filters, optional Sanity catalog management, per-size inventory, Stripe checkout, durable orders, fulfillment tools, and optional email notifications.

## Run locally

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>. The built-in catalog works without Sanity. Persistent admin edits, inventory, and order storage require Sanity. Real checkout requires Stripe.

## Admin and Sanity

Open <http://localhost:3000/admin>. The dashboard supports product search, multi-select Live/Draft/Featured actions, detail/price edits, per-size stock, up to eight product photos, order status, and tracking numbers.

Create a Sanity project and dataset. Add both the default export from `src/sanity/schemas/product.ts` and its `orderSchema` named export to your Studio schema types, then configure these server-only values in `.env.local` and in the deployment environment:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `SANITY_API_WRITE_TOKEN` with dataset write permission
- `SANITY_API_READ_TOKEN` when using a private dataset
- `ADMIN_USERNAME` and/or `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a random `ADMIN_SESSION_SECRET` of at least 32 bytes

Do not expose Sanity tokens or admin credentials through `NEXT_PUBLIC_` variables. After changing environment values, restart Next.js. Admin sessions use an HttpOnly SameSite cookie and expire after eight hours.

Stock is untracked until you enter a quantity for every available size, e.g. `M:4, L:2`. Tracked stock blocks checkout when a variant lacks enough units and is decremented only after Stripe confirms payment. Existing catalog entries are not assigned invented stock values.

Product photos support JPG, PNG, and WebP, up to eight images per product and 8 MB per file. Featured products sort before the rest of the catalog.

Selecting the first photo in the new-product form can draft a title, URL slug, category, colors, and description with OpenAI vision. Set the server-only `OPENAI_API_KEY` locally and in Vercel to enable it; optionally set `OPENAI_VISION_MODEL` (defaults to `gpt-4o-mini`). Review all suggestions and enter price, fabric, and stock yourself before uploading. AI drafting does not publish products; publishing still requires the Sanity write configuration above and an explicit form submission.

The new-product form accepts optional JPG, PNG, or WebP artwork up to 4 MB as a visual reference, then uses one action to generate a mockup, draft its name/category/description/suggested USD price, and publish the product to Sanity. Set the server-only `VENICE_API_KEY` locally and in Vercel; optionally set `VENICE_IMAGE_MODEL` (defaults to `gpt-image-2-5-flare`), `VENICE_REFERENCE_IMAGE_MODEL` (defaults to `krea-v2-large` for artwork references), and `VENICE_TEXT_MODEL` (defaults to the vision-capable `qwen3-5-9b`). Each image/detail generation consumes Venice credits. Artwork guides the design, but generated logos/text may not reproduce exactly.

## Stripe and orders

Set `STRIPE_SECRET_KEY` to a test key while developing. Checkout uses server-side catalog prices, US shipping ($8 below $100, complimentary at or above $100), and Stripe promotion codes. Test discount codes must be created in Stripe.

Orders are created and stock is decremented only by the signed Stripe webhook. Configure the endpoint `<your-site-origin>/api/stripe/webhook` in Stripe to receive `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and set its signing secret as `STRIPE_WEBHOOK_SECRET`. For local testing, use the Stripe CLI:

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the CLI webhook signing secret into `.env.local` as `STRIPE_WEBHOOK_SECRET`. A production deployment must use the signing secret from its Stripe webhook endpoint. The Orders tab appears in `/admin` after paid events arrive and lets you mark orders paid, packing, shipped, or cancelled and save tracking numbers. Inventory conflicts are recorded as `inventory_issue` and trigger a refund attempt.

Stripe automatic tax is off by default. To enable, turn on Stripe Tax for the account, confirm product tax configuration and registration obligations, then set `STRIPE_AUTOMATIC_TAX=true`. Validate tax behavior with a test transaction before launch.

## Customer emails

Order confirmations and shipped notifications are sent only when `RESEND_API_KEY` and `ORDER_EMAIL_FROM` are configured. Verify the sender domain/address in Resend first. The webhook still records orders if email sending is not configured; shipping email status is shown in the admin notice.

## Deployment

Deploy the Next.js app to Vercel and set all required Sanity, admin, Stripe, webhook, and optional Resend environment variables there. Add `OPENAI_API_KEY` to enable admin photo drafting. Set `NEXT_PUBLIC_SITE_URL` to the production origin. Add the Stripe webhook endpoint for the deployed origin, test a complete checkout including a promotion code, verify order/stock updates, then check fulfillment and email flows before accepting live payments.

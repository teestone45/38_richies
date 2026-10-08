import Link from "next/link";
import Image from "next/image";
import FeaturedProductHero from "@/components/featured-product-hero";
import FitBuilder from "@/components/fit-builder";
import NewsletterSignup from "@/components/newsletter-signup";
import ProductCollection from "@/components/product-collection";
import StoreDashboard from "@/components/store-dashboard";
import { getProducts } from "@/lib/products";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProducts();
  const siteUrl = getSiteUrl();
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: "38 RICHES",
    alternateName: "38 RICHIES Clothing",
    url: siteUrl.toString(),
    logo: new URL("/images/38-richies-embroidered.svg", siteUrl).toString(),
    description: "Premium streetwear and clothing in Ghana, including graphic tees, hoodies, shorts, and jeans.",
    areaServed: { "@type": "Country", name: "Ghana" },
    sameAs: ["https://www.tiktok.com/@38richies0"],
  }).replace(/</g, "\\u003c");

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <StoreDashboard products={products} />
      <FeaturedProductHero products={products} />

      <section className="ticker" aria-label="Brand statement">
        <div className="ticker__track">
          <span>MORE THAN CLOTHES / IT&apos;S 38 RICHES</span><i>✳</i><span>MADE FOR THE ONES WHO MOVE DIFFERENT</span><i>✳</i><span>MORE THAN CLOTHES / IT&apos;S 38 RICHES</span><i>✳</i>
        </div>
      </section>

      <section className="shop-section page-shell" id="shop">
        <div className="section-heading">
          <div><p className="eyebrow">THE FIRST DROP / 001</p><h2>THE ROTATION</h2></div>
          <p className="section-heading__note">Small run. Heavy feel.<br />Find your uniform.</p>
        </div>
        <ProductCollection products={products} />
      </section>

      <FitBuilder products={products} />

      <section className="feature-band page-shell" aria-label="Brand benefits">
        <article>
          <span>01</span>
          <h3>Built for motion</h3>
          <p>Premium basics cut for everyday wear, long days, and zero compromise.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Fast local delivery</h3>
          <p>Quick Ghana shipping on orders above GH₵100, with transparent tracking.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Small-batch quality</h3>
          <p>Every piece is produced in limited quantities with a focused, intentional run.</p>
        </article>
      </section>

      <section className="editorial-grid page-shell" aria-label="Editorial highlights">
        <div className="editorial-grid__header">
          <p className="eyebrow">DROP NOTES</p>
          <h2>Built on rhythm, not hype.</h2>
        </div>
        <article className="editorial-card editorial-card--feature">
          <div className="editorial-card__image editorial-card__image--one" />
          <div className="editorial-card__content">
            <p>Studio diary</p>
            <h3>How we build a uniform that lasts.</h3>
            <Link href="/journal">Read the story <span aria-hidden="true">↗</span></Link>
          </div>
        </article>
        <article className="editorial-card">
          <div className="editorial-card__image editorial-card__image--two" />
          <div className="editorial-card__content">
            <p>Fit guide</p>
            <h3>Choose the right profile for your build.</h3>
            <Link href="#shop">See the drop <span aria-hidden="true">↗</span></Link>
          </div>
        </article>
        <article className="editorial-card">
          <div className="editorial-card__image editorial-card__image--three" />
          <div className="editorial-card__content">
            <p>Customer voice</p>
            <h3>Streetwear that moves with your routine.</h3>
            <Link href="/journal">See the journal <span aria-hidden="true">↗</span></Link>
          </div>
        </article>
      </section>

      <section className="manifesto" id="story">
        <div className="manifesto__mark">38</div>
        <div className="manifesto__copy">
          <p className="eyebrow">A DIFFERENT KIND OF RICH</p>
          <h2>RICH IN<br /><span>THE WAY</span><br />YOU MOVE.</h2>
        </div>
        <p className="manifesto__aside">Not a flex. A feeling.<br />38 RICHES is for the ones<br />building their own lane.</p>
        <span className="manifesto__stamp">EST. 2026<br />MADE TO LAST</span>
      </section>

      <NewsletterSignup />

      <section className="details-strip page-shell" aria-label="Product details">
        <div><span>01</span><p>Heavyweight<br />280 GSM cotton</p></div>
        <div><span>02</span><p>Built to wear<br />Oversized fit</p></div>
        <div><span>03</span><p>Small-batch<br />Made with intent</p></div>
        <Link href="#shop">Find your piece <span aria-hidden="true">↗</span></Link>
      </section>
      <p className="home-journal-link page-shell"><Link href="/journal">Explore the drop journal <span aria-hidden="true">↗</span></Link></p>
      <footer className="site-footer">
        <Link className="wordmark" href="/" aria-label="38 RICHES home"><Image src="/images/38-richies-embroidered.svg" alt="38 RICHIES" width={54} height={42} /></Link>
        <p>© 2026 38 RICHES. MOVE DIFFERENT.</p>
        <Link href="/track">TRACK ORDER</Link>
        <Link href="/admin">ADMIN</Link>
        <a href="mailto:hello@38riches.com">CONTACT ↗</a>
      </footer>
    </main>
  );
}

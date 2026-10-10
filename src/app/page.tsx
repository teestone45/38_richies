import Link from "next/link";
import Image from "next/image";
import FeaturedProductHero from "@/components/featured-product-hero";
import NewsletterSignup from "@/components/newsletter-signup";
import ProductCollection from "@/components/product-collection";
import StoreDashboard from "@/components/store-dashboard";
import BrandFaq from "@/components/brand-faq";
import { getProducts } from "@/lib/products";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProducts();
  const siteUrl = getSiteUrl();
  const remainingUnits = products.length > 0 && products.every((product) => product.inventory && Object.keys(product.inventory).length > 0)
    ? products.reduce((total, product) => total + Object.values(product.inventory ?? {}).reduce((stock, quantity) => stock + quantity, 0), 0)
    : null;
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: "38 RICHES",
    alternateName: ["38 RICHIES Clothing", "38 Richies clothng"],
    url: siteUrl.toString(),
    logo: new URL("/images/38-richies-embroidered.svg", siteUrl).toString(),
    description: "38 RICHES is a Ghana-based streetwear label offering T-shirts, hoodies, jeans, and selected graphic pieces. Product sizes and materials are listed by design.",
    areaServed: { "@type": "Country", name: "Ghana" },
    sameAs: ["https://www.tiktok.com/@38richies0", "https://www.instagram.com/38r_ichies/"],
  }).replace(/</g, "\\u003c");

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      <section className="brand-snapshot page-shell" aria-labelledby="brand-snapshot-title">
        <p className="eyebrow">A GHANAIAN STREETWEAR LABEL</p>
        <h2 id="brand-snapshot-title">38 RICHES, built from vision.</h2>
        <p>38 RICHES is a Ghanaian streetwear brand offering premium oversized T-shirts, hoodies, jeans, and selected graphic pieces. Sizes and materials vary by design; check each product page for available options, including XL and 2XL on selected pieces. Selected tees use heavyweight 280 GSM cotton with original A3 DTF prints. The 38 RICHES Fit Builder pairs an available top and bottom, shows the combined price, and adds both pieces to your bag together. Ghana delivery is free on orders of GH₵100 or more after discounts.</p>
        <Link href="/fit-builder">Try the 38 RICHES Fit Builder <span aria-hidden="true">→</span></Link>
      </section>
      <BrandFaq />
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
          <div className="section-heading__aside">
            <p className="section-heading__note">Small run. Heavy feel.<br />Find your uniform.</p>
            {remainingUnits !== null && <p className="rotation-stock">{remainingUnits} TRACKED UNITS AVAILABLE</p>}
          </div>
        </div>
        <ProductCollection products={products} />
      </section>

      <section className="fit-builder-promo page-shell" aria-labelledby="fit-builder-promo-title">
        <div>
          <p className="eyebrow">BUILD THE FULL LOOK</p>
          <h2 id="fit-builder-promo-title">One fit. Your choices.</h2>
          <p>Pair an available top and bottom, compare the total, and add both pieces to your bag in one step.</p>
        </div>
        <Link href="/fit-builder">Try the 38 RICHES Fit Builder <span aria-hidden="true">→</span></Link>
      </section>

      <section className="feature-band page-shell" aria-label="Brand benefits">
        <article>
          <span>01</span>
          <h3>Built for motion</h3>
          <p>Premium basics cut for everyday wear, long days, and zero compromise.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Fast local delivery</h3>
          <p>Free Ghana shipping on orders of GH₵100 or more, with transparent tracking.</p>
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

      <section className="home-seo-copy page-shell" aria-labelledby="home-seo-heading">
        <p className="eyebrow">38 RICHES / GHANA</p>
        <h2 id="home-seo-heading">Ghanaian streetwear with its own point of view.</h2>
        <p>38 RICHES is a Ghanaian fashion label creating oversized streetwear for people who move differently. Our collections bring together graphic T-shirts, hoodies, and everyday pieces with a confident identity rooted in individuality and ambition.</p>
        <p>Selected tees are made with heavyweight 280 GSM cotton and original A3 DTF prints, with considered fits and colorways for everyday wear. Explore the latest 38 RICHES drop online and discover premium urban fashion from Ghana.</p>
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
        <div className="site-footer__socials">
          <a href="mailto:hello@38riches.com">CONTACT ↗</a>
          <a href="https://www.tiktok.com/@38richies0?is_from_webapp=1&amp;sender_device=pc" target="_blank" rel="noreferrer">TIKTOK ↗</a>
          <a href="https://www.instagram.com/38r_ichies/" target="_blank" rel="noreferrer">INSTAGRAM ↗</a>
        </div>
      </footer>
    </main>
  );
}

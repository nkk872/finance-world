import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editorial Policy | Finance World",
  description: "How Finance World selects, attributes, updates and corrects financial news and market information."
};

export default function EditorialPolicyPage(){
  return <main className="container article-page">
    <a className="article-back" href="/">← Back to Finance World</a>
    <article className="article-main">
      <div className="eyebrow">Our standards</div>
      <h1>Editorial Policy</h1>
      <p><strong>Last updated: November 12, 2026</strong></p>
      <p>Finance World is an independent financial news and information website. We bring together financial headlines, source-provided descriptions and public information to help readers follow developments across markets, business, banking, economics and digital assets.</p>
      <h2>Sources and attribution</h2>
      <p>News items identify the originating publisher, institution or data provider whenever that information is available. Headlines, excerpts, images and links may belong to third parties. We do not claim ownership of third-party reporting, and readers should consult the linked original source for the publisher's complete report and context.</p>
      <h2>Summaries and context</h2>
      <p>Where a feed supplies a description or summary, Finance World may display it with source attribution. Where source material is unavailable, we aim to say so rather than invent facts or quotes. General explanatory context is not presented as a statement from the original publisher.</p>
      <h2>Accuracy and updates</h2>
      <p>Financial news and market information can change quickly. We aim to preserve source details and publication times where provided, identify delayed or reference market data, and update coverage when reliable information becomes available. A displayed price may be delayed and should not be used as a trading feed.</p>
      <h2>Corrections</h2>
      <p>If you believe a headline, attribution, summary or other page detail is inaccurate, please email <a href="mailto:financialw08@gmail.com">financialw08@gmail.com</a>. Include the page URL, the specific issue and a reliable supporting source. We review correction requests and update or clarify content when warranted.</p>
      <h2>Independence and conflicts</h2>
      <p>Finance World is an independent information website. Advertising, if displayed, is separate from editorial content and does not determine our news classifications or summaries. We do not provide paid investment recommendations through this website.</p>
      <h2>Not investment advice</h2>
      <p>All content is for general information and education only. It is not investment, legal, tax or financial advice, or a recommendation to buy or sell any asset. Readers should verify important information with original sources and qualified professionals.</p>
      <h2>Contact</h2>
      <p>For editorial questions or corrections, contact <a href="mailto:financialw08@gmail.com">financialw08@gmail.com</a>.</p>
    </article>
  </main>;
}

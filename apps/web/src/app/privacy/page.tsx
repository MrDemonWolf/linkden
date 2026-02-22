export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="legal-content">
          <h1>Privacy Policy</h1>

          <h2>1. Information We Collect</h2>
          <p>We collect minimal information necessary to operate this service:</p>
          <ul>
            <li>Contact form submissions (name, email, message) when voluntarily provided</li>
            <li>Basic analytics data (page views, link clicks, referrer URLs)</li>
            <li>No cookies or tracking pixels are used</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>Information collected is used solely to:</p>
          <ul>
            <li>Respond to contact form inquiries</li>
            <li>Provide aggregate analytics to the page owner</li>
          </ul>

          <h2>3. Data Sharing</h2>
          <p>We do not sell, trade, or share your personal information with third parties.</p>

          <h2>4. Data Retention</h2>
          <p>
            Contact submissions are retained until manually deleted by the page owner. Analytics
            data is aggregated and does not contain personally identifiable information.
          </p>

          <h2>5. Your Rights</h2>
          <p>
            You may request deletion of any personal data by contacting the page owner directly.
          </p>

          <h2>6. Changes</h2>
          <p>
            This policy may be updated from time to time. Changes will be reflected on this page.
          </p>
        </div>
        <div className="mt-8 text-center">
          <a href="/" className="text-sm text-[var(--primary)] hover:underline">
            &larr; Back to home
          </a>
        </div>
      </div>
    </div>
  );
}

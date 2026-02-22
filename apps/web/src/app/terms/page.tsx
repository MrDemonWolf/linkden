export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="legal-content">
          <h1>Terms of Service</h1>

          <h2>1. Acceptance of Terms</h2>
          <p>By accessing this page, you agree to these Terms of Service.</p>

          <h2>2. Use of Service</h2>
          <p>
            This is a personal link-in-bio page. The links and content provided are for
            informational purposes. We make no guarantees about the availability or accuracy of
            linked third-party content.
          </p>

          <h2>3. Contact Form</h2>
          <p>
            If a contact form is available, you agree to provide accurate information and not to use
            it for spam or malicious purposes.
          </p>

          <h2>4. Intellectual Property</h2>
          <p>All content on this page belongs to the page owner unless otherwise stated.</p>

          <h2>5. Limitation of Liability</h2>
          <p>
            This service is provided &quot;as is&quot; without warranties of any kind. We are not
            liable for any damages arising from use of this service or linked content.
          </p>

          <h2>6. Changes</h2>
          <p>
            These terms may be updated at any time. Continued use constitutes acceptance of updated
            terms.
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

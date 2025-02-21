export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-6 py-32">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-light mb-8">
          Privacy Policy
          <span className="block text-2xl mt-2 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Mithram Medical Analysis Platform
          </span>
        </h1>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              At Mithram, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, 
              and safeguard your information when you use our Clinical Decision Support (CDS) system.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">2. Information We Collect</h2>
            <p className="text-gray-600 mb-4">We collect the following types of information:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Medical data provided through the FHIR integration</li>
              <li>User authentication information</li>
              <li>System usage and interaction data</li>
              <li>Technical information about your device and connection</li>
            </ul>
            <p className="text-gray-600 mb-4">
              Note that none of these data is stored in our servers or databases. Only non personally identifiable data is collected for AI analysis.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">Your information is used for:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Providing AI-powered medical analysis</li>
              <li>Improving our clinical decision support algorithms</li>
              <li>Maintaining and enhancing platform security</li>
              <li>Complying with legal and regulatory requirements</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">4. Data Protection</h2>
            <p className="text-gray-600 mb-4">
              We implement robust security measures including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>End-to-end encryption of all medical data</li>
              <li>Blockchain-based data integrity verification</li>
              <li>Strict access controls and authentication</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">5. HIPAA Compliance</h2>
            <p className="text-gray-600 mb-4">
              As a healthcare technology provider, we fully comply with HIPAA regulations:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Implement required technical safeguards</li>
              <li>Secure processing of medical data</li>
              <li>No storage of medical data</li>
              <li>AI analysis is done only on non personally identifiable information</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">6. Contact Information</h2>
            <p className="text-gray-600">
              For privacy-related questions, please contact us at:
              <br />
              Email: adarshron(at)gmail(dot)com
              <br />
            </p>
          </section>

          <div className="mt-12 p-6 bg-gray-50 rounded-2xl">
            <p className="text-sm text-gray-500">
              Last updated: February 21, 2025
              <br />
              This privacy policy is subject to change. Please review periodically for updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

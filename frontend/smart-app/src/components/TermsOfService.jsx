export default function TermsOfService() {
  return (
    <div className="container mx-auto px-6 py-32">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-light mb-8">
          Terms of Service
          <span className="block text-2xl mt-2 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Mithram Medical Analysis Platform
          </span>
        </h1>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Welcome to Mithram. By accessing or using our platform, you agree to comply with and be bound by these Terms of Service.
              Mithram is a Clinical Decision Support (CDS) system that uses artificial intelligence to analyze medical data.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">2. Service Description</h2>
            <p className="text-gray-600 mb-4">
              Mithram provides AI-powered medical analysis through our GENESIS protocol, which includes:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Multi-perspective AI analysis of medical data</li>
              <li>Integration with FHIR-compliant healthcare systems</li>
              <li>Secure storage of medical analyses using blockchain technology</li>
              <li>Intelligent chat system for medical queries</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">3. Data Privacy & Security</h2>
            <p className="text-gray-600 mb-4">
              We prioritize the security and privacy of medical data:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>All data is encrypted and stored securely</li>
              <li>We comply with HIPAA regulations</li>
              <li>Patient data is never shared without explicit authorization</li>
              <li>Blockchain technology ensures data integrity</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">4. Limitations</h2>
            <p className="text-gray-600 mb-4">
              Please note the following limitations:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Mithram is a decision support tool and does not replace professional medical judgment</li>
              <li>Healthcare providers should verify all recommendations</li>
              <li>The service is provided "as is" without warranties</li>
              <li>We are not responsible for decisions made based on the analysis</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4">5. Contact Information</h2>
            <p className="text-gray-600">
              For questions about these terms, please contact us at:
              <br />
              Email: adarshron(at)gmail(dot)com
              <br />
            </p>
          </section>

          <div className="mt-12 p-6 bg-gray-50 rounded-2xl">
            <p className="text-sm text-gray-500">
              Last updated: February 21, 2025
              <br />
              These terms are subject to change. Please review periodically for updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

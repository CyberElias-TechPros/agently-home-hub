import { Link } from 'react-router-dom';
import { useSEO } from '@/lib/seo/useSEO';

const LAST_UPDATED = '8 September 2026';

const CONTENT: Record<'privacy' | 'terms', { title: string; intro: string; sections: Array<{ heading: string; body: string[] }> }> = {
  privacy: {
    title: 'Privacy policy',
    intro:
      'This policy explains what data Agently collects, why we collect it, and the choices you have. It is written to be read, not to be skimmed past.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Account information: your name, email address, phone number if you provide one, and your role on the platform.',
          'Listing information: the property details, photographs and documents you upload.',
          'Usage information: pages viewed, searches run and messages sent, together with your IP address and browser type.',
        ],
      },
      {
        heading: 'Why we collect it',
        body: [
          'To create and secure your account, and to let the right people see your listings and documents.',
          'To operate the platform: matching tenants to properties, routing maintenance requests, and notifying you when something needs your attention.',
          'To keep the platform safe: detecting abuse, preventing fraud, and investigating violations of our terms.',
        ],
      },
      {
        heading: 'Who can see your data',
        body: [
          'Other users only see what is necessary. A landlord sees enquiries on their listings; a tenant sees the landlord of a property they have enquired about.',
          'We do not sell your personal data. Service providers who help us run the platform (for example, email delivery) process data only on our instructions.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'Account records are kept while your account is open. Documents you upload stay until you delete them.',
          'Backups are retained for a rolling period and are encrypted at rest.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'You can access, correct or delete your personal data from your account settings.',
          'You can request a full export or the deletion of your account by emailing hello@agently.app.',
        ],
      },
      {
        heading: 'Security',
        body: [
          'Passwords are stored using a slow, salted hash — never in a form we can read.',
          'Traffic is encrypted in transit. Documents are stored in access-controlled object storage and downloaded through short-lived signed links.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of service',
    intro:
      'These terms govern your use of Agently. By creating an account you agree to them.',
    sections: [
      {
        heading: 'Your account',
        body: [
          'You are responsible for the accuracy of the information you provide and for keeping your password secure.',
          'You must be at least 18 years old to create an account.',
        ],
      },
      {
        heading: 'Listings',
        body: [
          'If you list a property, you confirm you are its owner or are authorised by the owner to let it.',
          'Listings must be accurate. Misleading photographs, prices or availability may be removed.',
        ],
      },
      {
        heading: 'Messages and conduct',
        body: [
          'Use the messaging features only for genuine enquiries and tenancy matters.',
          'Harassment, spam, fraud and attempts to move a transaction off-platform in order to evade these terms are not permitted.',
        ],
      },
      {
        heading: 'Agently’s role',
        body: [
          'Agently provides the platform. We are not a party to any tenancy, lease or service agreement between users.',
          'We do not hold rent or deposits on your behalf, and we do not guarantee that any listing is available or suitable.',
        ],
      },
      {
        heading: 'Availability and changes',
        body: [
          'We aim to keep the platform available but cannot promise uninterrupted service.',
          'We may update these terms; where a change is material we will tell you in advance.',
        ],
      },
      {
        heading: 'Ending your use',
        body: [
          'You can close your account at any time by contacting us.',
          'We may suspend accounts that breach these terms, typically after a warning unless the breach is serious.',
        ],
      },
    ],
  },
};

export default function Legal({ doc }: { doc: 'privacy' | 'terms' }) {
  const content = CONTENT[doc];

  useSEO({
    title: content.title,
    description: content.intro,
    canonicalPath: doc === 'privacy' ? '/privacy' : '/terms',
  });

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">{content.title}</h1>
        <p className="mt-3 text-muted-foreground">Last updated {LAST_UPDATED}</p>
      </header>

      <p className="mb-10 text-lg leading-relaxed">{content.intro}</p>

      <div className="space-y-8">
        {content.sections.map((section, index) => (
          <section key={section.heading}>
            <h2 className="mb-2 text-xl font-semibold">
              {index + 1}. {section.heading}
            </h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mb-2 leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm text-muted-foreground">
        Questions about this document?{' '}
        <Link to="/contact" className="underline hover:text-foreground">
          Contact us
        </Link>
        .
      </p>
    </div>
  );
}

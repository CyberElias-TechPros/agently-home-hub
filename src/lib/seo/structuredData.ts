/**
 * schema.org structured data.
 *
 * Only facts that are true of the product are emitted. No reviews, ratings,
 * prices or events are invented — fabricated structured data is a manual-action
 * risk and offers no legitimate benefit.
 */

import type { PropertySummary } from '@/lib/api/types';

type JsonObject = Record<string, unknown>;

export function organisationSchema(): JsonObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'Agently',
    description:
      'Agently is a property rental platform that connects tenants, landlords and agents with verified listings, maintenance tracking and secure agreements.',
    url: 'https://agently.app',
    areaServed: { '@type': 'Country', name: 'Nigeria' },
    knowsAbout: [
      'Property rentals',
      'Property management',
      'Tenant screening',
      'Maintenance coordination',
    ],
  };
}

export function websiteSchema(): JsonObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Agently',
    url: 'https://agently.app',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://agently.app/properties?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>): JsonObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** schema.org typing depends on the kind of accommodation being listed. */
const TYPE_MAP: Record<string, string> = {
  apartment: 'Apartment',
  house: 'SingleFamilyResidence',
  condo: 'Apartment',
  townhouse: 'Townhouse',
  studio: 'Apartment',
  room: 'Room',
};

export function propertySchema(property: PropertySummary, url: string): JsonObject {
  return {
    '@context': 'https://schema.org',
    '@type': TYPE_MAP[property.type] ?? 'Residence',
    name: property.title,
    description: property.description ?? undefined,
    url,
    numberOfRooms: property.bedrooms || undefined,
    numberOfBathroomsTotal: property.bathrooms || undefined,
    floorSize: property.area_sqft
      ? { '@type': 'QuantitativeValue', value: property.area_sqft, unitCode: 'FTK' }
      : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address_line1,
      addressLocality: property.city,
      addressRegion: property.state,
      postalCode: property.zip_code,
      addressCountry: property.country,
    },
    ...(property.latitude && property.longitude
      ? { geo: { '@type': 'GeoCoordinates', latitude: property.latitude, longitude: property.longitude } }
      : {}),
    ...(property.images.length > 0 ? { image: property.images } : {}),
    ...(property.status === 'available'
      ? {
          offers: {
            '@type': 'Offer',
            price: property.price,
            priceCurrency: property.currency,
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}

export function faqSchema(entries: Array<{ question: string; answer: string }>): JsonObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

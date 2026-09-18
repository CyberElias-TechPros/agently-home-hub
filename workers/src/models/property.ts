/**
 * Property row → public JSON mapper (snake_case DB → camelCase API).
 */

export const Property = {
  toPublic(row: any): Record<string, unknown> {
    const parseJson = (v: unknown): unknown => {
      if (typeof v !== 'string') return v;
      try {
        return JSON.parse(v);
      } catch {
        return [];
      }
    };

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      price: row.price,
      currency: row.currency ?? 'USD',
      location: {
        address: row.address ?? '',
        city: row.city ?? '',
        state: row.state ?? '',
        zipCode: row.zip_code ?? '',
        coordinates: { lat: row.lat ?? null, lng: row.lng ?? null },
      },
      images: parseJson(row.images),
      bedrooms: row.bedrooms ?? 0,
      bathrooms: row.bathrooms ?? 0,
      area: row.area ?? 0,
      yearBuilt: row.year_built ?? null,
      amenities: parseJson(row.amenities),
      status: row.status,
      landlordId: row.landlord_id,
      availableFrom: row.available_from ?? null,
      rules: row.rules ?? null,
      featured: row.featured === 1,
      verified: row.verified === 1,
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    };
  },
};

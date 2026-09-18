-- =============================================================
-- Agently D1 seed data: properties  (v2.0)
-- Images use the Vite-bundled assets served from the app origin.
-- =============================================================

INSERT OR IGNORE INTO properties
  (id, landlord_id, title, description, type, price, address, city, state, zip_code, country, lat, lng,
   images, bedrooms, bathrooms, area, year_built, amenities, status, available_from, featured, verified)
VALUES
  (
    'seed-prop-1', 'seed-landlord',
    'Aurora Skyline Loft',
    'A cinematic two-bedroom loft in the heart of the city with floor-to-ceiling windows, a gourmet kitchen, and sweeping skyline views. Designed for people who want light, space, and velocity.',
    'apartment', 2500,
    '123 Lumière Boulevard', 'San Francisco', 'CA', '94102', 'US', 37.7749, -122.4194,
    '["/src/assets/property-1.jpg","/src/assets/property-2.jpg"]',
    2, 2, 1200, 2019,
    '["Parking","Gym","Pool","Pet-friendly","Laundry","Concierge"]',
    'available', '2024-12-01', 1, 1
  ),
  (
    'seed-prop-2', 'seed-landlord',
    'Vela High-Rise Condo',
    'An upscale one-bedroom condo with panoramic views, premium building amenities, and a concierge that never sleeps.',
    'condo', 3200,
    '456 Tower Plaza', 'New York', 'NY', '10001', 'US', 40.7128, -74.0060,
    '["/src/assets/property-2.jpg","/src/assets/property-3.jpg"]',
    1, 1, 850, 2021,
    '["Doorman","Gym","Roof deck","Storage","High-speed internet"]',
    'available', '2024-11-20', 1, 1
  ),
  (
    'seed-prop-3', 'seed-landlord',
    'Solace Garden House',
    'A serene three-bedroom family house with a landscaped garden, generous natural light and room to grow.',
    'house', 4200,
    '78 Acacia Drive', 'Austin', 'TX', '78704', 'US', 30.2672, -97.7431,
    '["/src/assets/property-3.jpg","/src/assets/property-1.jpg"]',
    3, 3, 2100, 2015,
    '["Backyard","Driveway","Pet-friendly","Smart home","Laundry"]',
    'available', '2025-01-10', 1, 1
  ),
  (
    'seed-prop-4', 'seed-landlord',
    'Mesa Studio Retreat',
    'A compact, light-filled studio curated for focused living — ideal for remote work and city weekends.',
    'studio', 1650,
    '12 Juniper Lane', 'Denver', 'CO', '80202', 'US', 39.7392, -104.9903,
    '["/src/assets/property-1.jpg"]',
    0, 1, 520, 2020,
    '["Furnished","Gym","High-speed internet","Bike storage"]',
    'available', '2024-11-01', 0, 0
  ),
  (
    'seed-prop-5', 'seed-landlord',
    'Brixton Townhouse',
    'A refined three-story townhouse blending heritage brickwork with warm, modern interiors.',
    'townhouse', 3900,
    '210 Cedar Row', 'Chicago', 'IL', '60614', 'US', 41.9205, -87.6545,
    '["/src/assets/property-2.jpg","/src/assets/property-3.jpg"]',
    4, 3.5, 2400, 2012,
    '["Backyard","Garage","Pet-friendly","Air conditioning","Laundry"]',
    'available', '2025-02-01', 1, 1
  ),
  (
    'seed-prop-6', 'seed-landlord',
    'Harborline Apartment',
    'A bright corner apartment minutes from the waterfront, with an open-flow living space and harbor breezes.',
    'apartment', 2100,
    '900 Marina Walk', 'Seattle', 'WA', '98101', 'US', 47.6062, -122.3321,
    '["/src/assets/property-3.jpg"]',
    1, 1, 760, 2018,
    '["Gym","Rooftop","Pet-friendly","High-speed internet"]',
    'occupied', '2024-12-15', 0, 0
  );

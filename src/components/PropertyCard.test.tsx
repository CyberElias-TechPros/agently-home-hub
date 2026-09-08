import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { PropertyCard } from './PropertyCard';
import { renderApp } from '@/test/render';
import { makeProperty } from '@/test/factories';

describe('PropertyCard', () => {
  it('shows the price exactly as the API reports it', () => {
    renderApp(<PropertyCard property={makeProperty({ price: 4_500_000 })} />);
    expect(screen.getByText('\u20A64.5M')).toBeInTheDocument();
    expect(screen.queryByText('\u20A645,000')).not.toBeInTheDocument();
  });

  it('links to the canonical slug URL', () => {
    renderApp(<PropertyCard property={makeProperty()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/properties/sunlit-2-bed-apartment-in-lekki-phase-1');
  });

  it('falls back to the id when there is no slug', () => {
    renderApp(<PropertyCard property={makeProperty({ slug: '' })} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/properties/prop-1');
  });

  it('describes the location and room count', () => {
    renderApp(<PropertyCard property={makeProperty()} />);
    expect(screen.getByText('Lekki, Lagos')).toBeInTheDocument();
    expect(screen.getByText('2 beds')).toBeInTheDocument();
    expect(screen.getByText('2 baths')).toBeInTheDocument();
  });

  it('renders a placeholder when there are no photos', () => {
    renderApp(<PropertyCard property={makeProperty({ images: [] })} />);
    expect(screen.getByText('No photo available')).toBeInTheDocument();
  });
});

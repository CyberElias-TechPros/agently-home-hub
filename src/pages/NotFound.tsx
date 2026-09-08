import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/lib/seo/useSEO';

export default function NotFound() {
  useSEO({
    title: 'Page not found',
    description: 'The page you were looking for does not exist.',
    noindex: true,
  });

  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <p className="text-sm font-semibold text-accent">404</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">We could not find that page</h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        The link may be out of date, or the page may have moved. Try starting from the home page.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/properties">Browse properties</Link>
        </Button>
      </div>
    </div>
  );
}

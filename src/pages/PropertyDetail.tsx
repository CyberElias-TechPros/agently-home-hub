import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  MapPin, Bed, Bath, Square, Calendar, Heart, Share2, MessageSquare, CheckCircle2, Loader2, Shield, Zap, ArrowLeft,
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { apiPut } from '@/lib/http';
import { resolveImage } from '@/lib/backend';
import { Property } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) return;
    apiService.getProperty(id).then((p) => {
      if (active) {
        setProperty(p);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
        <p className="text-muted-foreground mb-6">This listing may have been removed or the link is incorrect.</p>
        <Link to="/properties"><Button>Back to Properties</Button></Link>
      </div>
    );
  }

  const requiresAuth = (action: string) => {
    if (!isAuthenticated) {
      toast({ title: 'Sign in required', description: `Please sign in to ${action}.`, variant: 'destructive' });
      navigate('/auth');
      return true;
    }
    return false;
  };

  const toggleFavorite = async () => {
    if (requiresAuth('save favorites')) return;
    setFavorited((f) => !f);
    try {
      await apiPut(`/properties/${property.id}/favorite`, { favorite: !favorited });
    } catch { /* non-fatal */ }
    toast({ title: favorited ? 'Removed from favorites' : 'Saved to favorites' });
  };

  const handleRequestBooking = async () => {
    if (requiresAuth('request a booking')) return;
    if (!startDate || !endDate) {
      toast({ title: 'Dates required', description: 'Pick a move-in and move-out date.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await apiService.createBooking({
        propertyId: property.id,
        startDate,
        endDate,
        message: bookingMessage,
      });
      toast({ title: 'Booking request sent', description: "The landlord has been notified and will respond soon." });
      setShowBooking(false);
    } catch (e) {
      toast({ title: 'Booking failed', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContact = async () => {
    if (requiresAuth('message the landlord')) return;
    if (!contactMessage.trim()) return;
    setIsSubmitting(true);
    try {
      await apiService.sendMessage({
        receiver_id: property.landlordId,
        content: contactMessage,
        property_id: property.id,
        message_type: 'text',
      }).catch(async () => {
        // fall back to submitContact if messaging endpoint unavailable
        await apiService.submitContact({ name: 'Tenant inquiry', email: '', message: `[${property.title}] ${contactMessage}` });
      });
      toast({ title: 'Message sent', description: "The landlord will get back to you soon." });
      setShowContact(false);
      setContactMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied', description: 'Property link copied to clipboard.' });
    } catch {
      toast({ title: 'Share', description: window.location.href });
    }
  };

  const image = resolveImage(property.images?.[0]);
  const gallery = (property.images?.length ? property.images : [image]).map(resolveImage);

  return (
    <div className="min-h-screen py-8 pb-20 md:pb-8">
      <div className="container mx-auto px-4">
        <button onClick={() => navigate('/properties')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to properties
        </button>

        {/* Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl overflow-hidden mb-8">
          <div className="aspect-[4/3] md:col-span-1 md:row-span-2 md:aspect-auto">
            <img src={gallery[0]} alt={property.title} className="w-full h-full object-cover" />
          </div>
          {gallery.slice(1, 3).map((src, i) => (
            <div key={i} className="aspect-[4/3] hidden md:block">
              <img src={src} alt={`${property.title} ${i + 2}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="capitalize">{property.type}</Badge>
                    {property.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
                    <Badge className="glass-strong border-0 gap-1"><Shield className="h-3 w-3 text-accent" /> Verified</Badge>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">{property.title}</h1>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.location?.address && <span>{property.location.address}, </span>}
                    {property.location?.city}, {property.location?.state}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={toggleFavorite}>
                    <Heart className={`h-4 w-4 ${favorited ? 'fill-current text-red-400' : ''}`} />
                  </Button>
                  <Button size="icon" variant="outline" onClick={share}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 py-4">
                {property.bedrooms > 0 && (
                  <div className="flex items-center gap-2"><Bed className="h-5 w-5 text-primary" /><span className="font-semibold">{property.bedrooms}</span><span className="text-muted-foreground">Bedrooms</span></div>
                )}
                <div className="flex items-center gap-2"><Bath className="h-5 w-5 text-primary" /><span className="font-semibold">{property.bathrooms}</span><span className="text-muted-foreground">Bathrooms</span></div>
                {property.area > 0 && (
                  <div className="flex items-center gap-2"><Square className="h-5 w-5 text-primary" /><span className="font-semibold">{property.area.toLocaleString()}</span><span className="text-muted-foreground">sq ft</span></div>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-display font-bold mb-4">About This Property</h2>
              <p className="text-muted-foreground leading-relaxed">{property.description}</p>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-display font-bold mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(property.amenities ?? []).map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-2xl font-display font-bold mb-4">Availability</h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <span>Available from {property.availableFrom ? new Date(property.availableFrom).toLocaleDateString() : 'inquiry'}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24 card-cinematic border-0">
              <CardHeader>
                <CardTitle className="flex items-baseline gap-2">
                  <span className="text-4xl font-display font-bold text-gradient">${property.price?.toLocaleString()}</span>
                  <span className="text-muted-foreground text-base font-normal">/month</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog open={showBooking} onOpenChange={setShowBooking}>
                  <DialogTrigger asChild>
                    <Button className="btn-cinematic w-full" size="lg">Request Booking</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Request booking — {property.title}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="start">Move-in</Label>
                          <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="end">Move-out</Label>
                          <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="booking-message">Message to landlord (optional)</Label>
                        <Textarea id="booking-message" rows={3} placeholder="Tell the landlord why you love this place…" value={bookingMessage} onChange={(e) => setBookingMessage(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleRequestBooking} disabled={isSubmitting} className="flex-1 btn-cinematic">
                          {isSubmitting ? 'Sending…' : 'Send Request'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowBooking(false)}>Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showContact} onOpenChange={setShowContact}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline" size="lg">
                      <MessageSquare className="mr-2 h-4 w-4" /> Contact Landlord
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Message the landlord</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="contact-message">Your message</Label>
                        <Textarea id="contact-message" rows={4} placeholder="Ask about availability, viewing times, or anything else…" value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleContact} disabled={isSubmitting || !contactMessage.trim()} className="flex-1 btn-cinematic">
                          {isSubmitting ? 'Sending…' : 'Send Message'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowContact(false)}>Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Separator />
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="flex justify-between"><span>Security deposit</span><span className="font-semibold text-foreground">${property.price?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Monthly rent</span><span className="font-semibold text-foreground">${property.price?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Flexible installments</span><Badge className="gap-1"><Zap className="h-3 w-3" /> Available</Badge></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

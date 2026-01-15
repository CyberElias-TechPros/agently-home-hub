import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  X,
  ArrowUpDown,
  Star,
  Heart,
  Share2,
  Phone,
  Mail,
  MapPin,
  Home,
  Bed,
  Bath,
  Square,
  DollarSign,
  Calendar,
  Car,
  Check,
  AlertTriangle,
  TrendingUp,
  Users,
  Wifi,
  Dumbbell,
  Coffee,
  TreePine
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  description: string;
  type: string;
  price: number;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: { lat: number; lng: number };
    neighborhood?: string;
  };
  images: string[];
  bedrooms: number;
  bathrooms: number;
  area: number;
  amenities: string[];
  status: string;
  landlordId: string;
  availableFrom: string;
  featured?: boolean;
  year_built?: number;
  parking_spaces?: number;
  pet_friendly?: boolean;
  furnished?: boolean;
  lease_term?: string;
  security_deposit?: number;
  application_fee?: number;
  landlord_name?: string;
  landlord_email?: string;
  landlord_phone?: string;
  landlord_rating?: number;
  price_per_sqft?: number;
  days_on_market?: number;
  walk_score?: number;
  transit_score?: number;
  school_rating?: number;
}

interface ComparisonItem {
  property: Property;
  score: number;
  pros: string[];
  cons: string[];
}

interface PropertyComparisonProps {
  properties?: Property[];
  onPropertySelect?: (property: Property) => void;
  maxProperties?: number;
}

const amenityIcons: Record<string, React.ReactNode> = {
  'Parking': <Car className="w-4 h-4" />,
  'Gym': <Dumbbell className="w-4 h-4" />,
  'WiFi': <Wifi className="w-4 h-4" />,
  'Pool': <div className="w-4 h-4 bg-blue-500 rounded-full" />,
  'Pet-friendly': <TreePine className="w-4 h-4" />,
  'Laundry': <div className="w-4 h-4 bg-gray-500 rounded" />,
  'Doorman': <Users className="w-4 h-4" />,
  'Elevator': <div className="w-4 h-4 bg-gray-400 rounded" />,
  'Storage': <div className="w-4 h-4 bg-orange-500 rounded" />,
  'Air Conditioning': <div className="w-4 h-4 bg-cyan-500 rounded" />,
  'Balcony': <div className="w-4 h-4 bg-green-500 rounded-full" />,
  'Dishwasher': <div className="w-4 h-4 bg-purple-500 rounded" />,
  'Microwave': <div className="w-4 h-4 bg-red-500 rounded" />,
  'Coffee Maker': <Coffee className="w-4 h-4" />
};

export default function PropertyComparison({ 
  properties: initialProperties = [], 
  onPropertySelect,
  maxProperties = 4 
}: PropertyComparisonProps) {
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'price' | 'area' | 'bedrooms'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  // Initialize comparison items from properties prop
  useEffect(() => {
    if (initialProperties.length > 0) {
      const items = initialProperties.map(property => ({
        property,
        score: calculatePropertyScore(property),
        pros: generatePros(property),
        cons: generateCons(property)
      }));
      setComparisonItems(items);
    }
  }, [initialProperties]);

  // Calculate property score based on various factors
  const calculatePropertyScore = (property: Property): number => {
    let score = 0;
    
    // Price factor (lower is better)
    const avgPricePerSqft = 3; // Average price per sqft in the area
    const priceScore = property.price_per_sqft ? 
      Math.max(0, 100 - (property.price_per_sqft / avgPricePerSqft) * 50) : 50;
    score += priceScore * 0.3;
    
    // Amenities factor
    const amenityScore = Math.min(100, property.amenities.length * 10);
    score += amenityScore * 0.2;
    
    // Location scores
    const locationScore = (
      (property.walk_score || 50) * 0.3 +
      (property.transit_score || 50) * 0.3 +
      (property.school_rating || 50) * 0.4
    ) / 100 * 100;
    score += locationScore * 0.2;
    
    // Features factor
    let featureScore = 0;
    if (property.parking_spaces) featureScore += 20;
    if (property.pet_friendly) featureScore += 15;
    if (property.furnished) featureScore += 10;
    if (property.year_built && property.year_built > 2010) featureScore += 15;
    if (property.landlord_rating) featureScore += property.landlord_rating * 4;
    score += Math.min(100, featureScore) * 0.2;
    
    // Days on market factor (lower is better)
    const daysOnMarketScore = property.days_on_market ? 
      Math.max(0, 100 - (property.days_on_market / 30) * 25) : 75;
    score += daysOnMarketScore * 0.1;
    
    return Math.round(score);
  };

  // Generate pros for a property
  const generatePros = (property: Property): string[] => {
    const pros: string[] = [];
    
    if (property.price_per_sqft && property.price_per_sqft < 3) {
      pros.push('Great value for money');
    }
    
    if (property.amenities.length > 5) {
      pros.push('Lots of amenities');
    }
    
    if (property.walk_score && property.walk_score > 80) {
      pros.push('Excellent walkability');
    }
    
    if (property.transit_score && property.transit_score > 80) {
      pros.push('Great public transit access');
    }
    
    if (property.school_rating && property.school_rating > 8) {
      pros.push('Highly rated schools');
    }
    
    if (property.parking_spaces && property.parking_spaces > 1) {
      pros.push('Multiple parking spaces');
    }
    
    if (property.pet_friendly) {
      pros.push('Pet-friendly');
    }
    
    if (property.furnished) {
      pros.push('Furnished');
    }
    
    if (property.year_built && property.year_built > 2015) {
      pros.push('Recently built');
    }
    
    if (property.landlord_rating && property.landlord_rating > 4.5) {
      pros.push('Highly rated landlord');
    }
    
    if (property.featured) {
      pros.push('Featured property');
    }
    
    return pros;
  };

  // Generate cons for a property
  const generateCons = (property: Property): string[] => {
    const cons: string[] = [];
    
    if (property.price_per_sqft && property.price_per_sqft > 4) {
      cons.push('Expensive for area');
    }
    
    if (property.amenities.length < 3) {
      cons.push('Limited amenities');
    }
    
    if (property.walk_score && property.walk_score < 50) {
      cons.push('Poor walkability');
    }
    
    if (property.transit_score && property.transit_score < 50) {
      cons.push('Limited public transit');
    }
    
    if (property.school_rating && property.school_rating < 5) {
      cons.push('Low rated schools');
    }
    
    if (!property.parking_spaces) {
      cons.push('No parking included');
    }
    
    if (!property.pet_friendly) {
      cons.push('No pets allowed');
    }
    
    if (property.year_built && property.year_built < 1980) {
      cons.push('Older building');
    }
    
    if (property.days_on_market && property.days_on_market > 60) {
      cons.push('On market for a while');
    }
    
    if (property.security_deposit && property.security_deposit > property.price) {
      cons.push('High security deposit');
    }
    
    return cons;
  };

  // Add property to comparison
  const addProperty = (property: Property) => {
    if (comparisonItems.length >= maxProperties) {
      toast({
        title: 'Maximum Properties Reached',
        description: `You can only compare up to ${maxProperties} properties at once`,
        variant: 'destructive'
      });
      return;
    }
    
    if (comparisonItems.some(item => item.property.id === property.id)) {
      toast({
        title: 'Already Added',
        description: 'This property is already in your comparison',
        variant: 'destructive'
      });
      return;
    }
    
    const newItem: ComparisonItem = {
      property,
      score: calculatePropertyScore(property),
      pros: generatePros(property),
      cons: generateCons(property)
    };
    
    setComparisonItems(prev => [...prev, newItem]);
    
    toast({
      title: 'Property Added',
      description: `${property.title} added to comparison`
    });
  };

  // Remove property from comparison
  const removeProperty = (propertyId: string) => {
    setComparisonItems(prev => prev.filter(item => item.property.id !== propertyId));
  };

  // Sort comparison items
  const sortedItems = [...comparisonItems].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'score':
        comparison = a.score - b.score;
        break;
      case 'price':
        comparison = a.property.price - b.property.price;
        break;
      case 'area':
        comparison = a.property.area - b.property.area;
        break;
      case 'bedrooms':
        comparison = a.property.bedrooms - b.property.bedrooms;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Get winner for each attribute
  const getWinner = (getValue: (item: ComparisonItem) => number, higherIsBetter = true) => {
    if (sortedItems.length === 0) return null;
    
    const values = sortedItems.map(item => getValue(item));
    const extremeValue = higherIsBetter ? Math.max(...values) : Math.min(...values);
    const winnerIndex = values.indexOf(extremeValue);
    
    return winnerIndex;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get amenity icon
  const getAmenityIcon = (amenity: string) => {
    return amenityIcons[amenity] || <div className="w-4 h-4 bg-gray-400 rounded" />;
  };

  if (comparisonItems.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <ArrowUpDown className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">No Properties to Compare</h3>
              <p className="text-gray-500 mb-4">
                Select up to {maxProperties} properties to compare their features side by side
              </p>
              <Button onClick={() => onPropertySelect?.({} as Property)}>
                <Plus className="w-4 h-4 mr-2" />
                Browse Properties
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Property Comparison</h2>
          <p className="text-gray-600">
            Comparing {comparisonItems.length} property{comparisonItems.length !== 1 ? 'ies' : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="score">Match Score</option>
              <option value="price">Price</option>
              <option value="area">Area</option>
              <option value="bedrooms">Bedrooms</option>
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-4 border font-medium">Feature</th>
              {sortedItems.map((item, index) => (
                <th key={item.property.id} className="text-center p-4 border min-w-48">
                  <div className="space-y-2">
                    <div className="text-sm font-medium line-clamp-2">
                      {item.property.title}
                    </div>
                    <Badge className={item.score >= 80 ? 'bg-green-100 text-green-800' : 
                                   item.score >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                                   'bg-red-100 text-red-800'}>
                      Score: {item.score}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProperty(item.property.id)}
                      className="ml-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {/* Price */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 border font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Price
              </td>
              {sortedItems.map((item, index) => {
                const isWinner = getWinner(i => i.property.price, false) === index;
                return (
                  <td key={item.property.id} className="p-4 border text-center">
                    <div className={`font-bold ${isWinner ? 'text-green-600' : ''}`}>
                      {formatCurrency(item.property.price)}/mo
                      {isWinner && <div className="text-xs text-green-600">Best Price</div>}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Price per sqft */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 border font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Price per sqft
              </td>
              {sortedItems.map((item, index) => {
                const isWinner = getWinner(i => i.property.price_per_sqft || 0, false) === index;
                return (
                  <td key={item.property.id} className="p-4 border text-center">
                    <div className={isWinner ? 'text-green-600 font-medium' : ''}>
                      {item.property.price_per_sqft ? 
                        formatCurrency(item.property.price_per_sqft) : 
                        'N/A'
                      }
                      {isWinner && <div className="text-xs text-green-600">Best Value</div>}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Area */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 border font-medium flex items-center gap-2">
                <Square className="w-4 h-4" />
                Area
              </td>
              {sortedItems.map((item, index) => {
                const isWinner = getWinner(i => i.property.area, true) === index;
                return (
                  <td key={item.property.id} className="p-4 border text-center">
                    <div className={isWinner ? 'text-green-600 font-medium' : ''}>
                      {item.property.area} ft²
                      {isWinner && <div className="text-xs text-green-600">Largest</div>}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Bedrooms */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 border font-medium flex items-center gap-2">
                <Bed className="w-4 h-4" />
                Bedrooms
              </td>
              {sortedItems.map((item, index) => {
                const isWinner = getWinner(i => i.property.bedrooms, true) === index;
                return (
                  <td key={item.property.id} className="p-4 border text-center">
                    <div className={isWinner ? 'text-green-600 font-medium' : ''}>
                      {item.property.bedrooms}
                      {isWinner && <div className="text-xs text-green-600">Most Bedrooms</div>}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Bathrooms */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 border font-medium flex items-center gap-2">
                <Bath className="w-4 h-4" />
                Bathrooms
              </td>
              {sortedItems.map((item, index) => {
                const isWinner = getWinner(i => i.property.bathrooms, true) === index;
                return (
                  <td key={item.property.id} className="p-4 border text-center">
                    <div className={isWinner ? 'text-green-600 font-medium' : ''}>
                      {item.property.bathrooms}
                      {isWinner && <div className="text-xs text-green-600">Most Bathrooms</div>}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Year Built */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 border font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Year Built
              </td>
              {sortedItems.map((item, index) => {
                const isWinner = getWinner(i => i.property.year_built || 0, true) === index;
                return (
                  <td key={item.property.id} className="p-4 border text-center">
                    <div className={isWinner ? 'text-green-600 font-medium' : ''}>
                      {item.property.year_built || 'N/A'}
                      {isWinner && <div className="text-xs text-green-600">Newest</div>}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Parking */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 border font-medium flex items-center gap-2">
                <Car className="w-4 h-4" />
                Parking
              </td>
              {sortedItems.map((item, index) => {
                const isWinner = getWinner(i => i.property.parking_spaces || 0, true) === index;
                return (
                  <td key={item.property.id} className="p-4 border text-center">
                    <div className={isWinner ? 'text-green-600 font-medium' : ''}>
                      {item.property.parking_spaces ? 
                        `${item.property.parking_spaces} spaces` : 
                        'None'
                      }
                      {isWinner && <div className="text-xs text-green-600">Most Parking</div>}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Location Scores */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 border font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </td>
              {sortedItems.map((item) => (
                <td key={item.property.id} className="p-4 border">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Walk:</span>
                      <span>{item.property.walk_score || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transit:</span>
                      <span>{item.property.transit_score || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Schools:</span>
                      <span>{item.property.school_rating || 'N/A'}</span>
                    </div>
                  </div>
                </td>
              ))}
            </tr>

            {/* Amenities */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 border font-medium flex items-center gap-2">
                <Star className="w-4 h-4" />
                Amenities
              </td>
              {sortedItems.map((item) => (
                <td key={item.property.id} className="p-4 border">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {item.property.amenities.slice(0, 6).map((amenity, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-xs bg-gray-100 rounded px-2 py-1">
                        {getAmenityIcon(amenity)}
                        <span>{amenity}</span>
                      </div>
                    ))}
                    {item.property.amenities.length > 6 && (
                      <div className="text-xs text-gray-500">
                        +{item.property.amenities.length - 6} more
                      </div>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Pros and Cons */}
            {showDetails && (
              <>
                <tr className="bg-gray-50">
                  <td className="p-4 border font-medium">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Pros
                    </div>
                  </td>
                  {sortedItems.map((item) => (
                    <td key={item.property.id} className="p-4 border">
                      <div className="space-y-1">
                        {item.pros.slice(0, 3).map((pro, idx) => (
                          <div key={idx} className="flex items-start gap-1 text-sm">
                            <Check className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{pro}</span>
                          </div>
                        ))}
                        {item.pros.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{item.pros.length - 3} more
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                <tr className="bg-gray-50">
                  <td className="p-4 border font-medium">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Cons
                    </div>
                  </td>
                  {sortedItems.map((item) => (
                    <td key={item.property.id} className="p-4 border">
                      <div className="space-y-1">
                        {item.cons.slice(0, 3).map((con, idx) => (
                          <div key={idx} className="flex items-start gap-1 text-sm">
                            <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                            <span>{con}</span>
                          </div>
                        ))}
                        {item.cons.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{item.cons.length - 3} more
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              </>
            )}

            {/* Actions */}
            <tr className="bg-gray-50">
              <td className="p-4 border font-medium">Actions</td>
              {sortedItems.map((item) => (
                <td key={item.property.id} className="p-4 border">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      onClick={() => onPropertySelect?.(item.property)}
                    >
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Comparison Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <h3 className="font-medium mb-2">Best Overall</h3>
              <div className="text-lg font-bold text-green-600">
                {sortedItems[0]?.property.title}
              </div>
              <div className="text-sm text-gray-600">
                Score: {sortedItems[0]?.score}%
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="font-medium mb-2">Best Value</h3>
              <div className="text-lg font-bold text-blue-600">
                {sortedItems.find(item => item.property.price_per_sqft === 
                  Math.min(...sortedItems.map(i => i.property.price_per_sqft || Infinity))?.property.title}
              </div>
              <div className="text-sm text-gray-600">
                {formatCurrency(Math.min(...sortedItems.map(i => i.property.price_per_sqft || 0)))}/sqft
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="font-medium mb-2">Most Space</h3>
              <div className="text-lg font-bold text-purple-600">
                {sortedItems.find(item => item.property.area === 
                  Math.max(...sortedItems.map(i => i.property.area)))?.property.title}
              </div>
              <div className="text-sm text-gray-600">
                {Math.max(...sortedItems.map(i => i.property.area))} ft²
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

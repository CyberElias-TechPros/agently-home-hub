import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  MapPin,
  School,
  Hospital,
  ShoppingBag,
  Train,
  TreePine,
  Shield,
  Star,
  TrendingUp,
  TrendingDown,
  Users,
  Home,
  DollarSign,
  Car,
  Utensils,
  Dumbbell,
  Book,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface NeighborhoodData {
  id: string;
  name: string;
  city: string;
  state: string;
  description: string;
  population: number;
  area_sq_km: number;
  median_income: number;
  median_age: number;
  scores: {
    walkability: number;
    transit: number;
    schools: number;
    safety: number;
    amenities: number;
    overall: number;
  };
  demographics?: {
    population_density: number;
    median_household_income: number;
    median_home_value: number;
    renter_percentage: number;
    bachelor_degree_or_higher: number;
  };
}

interface School {
  id: string;
  name: string;
  type: string;
  address: string;
  rating: number;
  grades_served: string;
  student_count: number;
  distance_km: number;
}

interface Amenity {
  id: string;
  name: string;
  type: string;
  address: string;
  rating: number;
  price_level: number;
  distance_km: number;
}

interface Transport {
  id: string;
  name: string;
  type: string;
  address: string;
  lines_served: string[];
  distance_km: number;
}

interface CrimeStats {
  year: number;
  month: number;
  total_incidents: number;
  property_crime: number;
  violent_crime: number;
  safety_score: number;
}

interface Property {
  id: string;
  title: string;
  price: number;
  distance_km: number;
  price_per_sqft: number;
}

interface MarketInsights {
  avg_price: number;
  price_range: { min: number; max: number };
  avg_price_per_sqft: number;
  inventory_level: string;
  market_trend: string;
  total_listings: number;
}

interface NeighborhoodInsightsProps {
  lat: number;
  lng: number;
  radius?: number;
}

const amenityIcons: Record<string, React.ReactNode> = {
  grocery: <Utensils className="w-4 h-4" />,
  restaurant: <Utensils className="w-4 h-4" />,
  park: <TreePine className="w-4 h-4" />,
  hospital: <Hospital className="w-4 h-4" />,
  school: <School className="w-4 h-4" />,
  shopping: <ShoppingBag className="w-4 h-4" />,
  pharmacy: <AlertTriangle className="w-4 h-4" />,
  bank: <DollarSign className="w-4 h-4" />,
  gym: <Dumbbell className="w-4 h-4" />
};

const transportIcons: Record<string, React.ReactNode> = {
  bus_stop: <Train className="w-4 h-4" />,
  train_station: <Train className="w-4 h-4" />,
  subway_station: <Train className="w-4 h-4" />,
  ferry_terminal: <Train className="w-4 h-4" />
};

export default function NeighborhoodInsights({ lat, lng, radius = 1000 }: NeighborhoodInsightsProps) {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'schools' | 'amenities' | 'transport' | 'market'>('overview');
  const { toast } = useToast();

  useEffect(() => {
    fetchNeighborhoodInsights();
  }, [lat, lng, radius]);

  const fetchNeighborhoodInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/neighborhood/insights?lat=${lat}&lng=${lng}&radius=${radius}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      } else {
        throw new Error('Failed to fetch neighborhood insights');
      }
    } catch (error) {
      console.error('Error fetching neighborhood insights:', error);
      toast({
        title: 'Error',
        description: 'Failed to load neighborhood insights',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No Neighborhood Data</h3>
          <p className="text-gray-500">
            Neighborhood insights are not available for this location.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { neighborhood, nearby_schools, nearby_amenities, public_transport, crime_statistics, nearby_properties, market_insights } = insights;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{neighborhood.name}</CardTitle>
              <p className="text-gray-600">
                {neighborhood.city}, {neighborhood.state}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {neighborhood.description}
              </p>
            </div>
            <div className="text-right">
              <Badge variant={getScoreBadgeVariant(neighborhood.scores.overall)} className="text-lg px-3 py-1">
                {neighborhood.scores.overall}/100
              </Badge>
              <p className="text-sm text-gray-500 mt-1">Overall Score</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(neighborhood.scores.walkability)}`}>
                {neighborhood.scores.walkability}
              </div>
              <p className="text-sm text-gray-600">Walkability</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(neighborhood.scores.transit)}`}>
                {neighborhood.scores.transit}
              </div>
              <p className="text-sm text-gray-600">Transit</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(neighborhood.scores.schools)}`}>
                {neighborhood.scores.schools}
              </div>
              <p className="text-sm text-gray-600">Schools</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(neighborhood.scores.safety)}`}>
                {neighborhood.scores.safety}
              </div>
              <p className="text-sm text-gray-600">Safety</p>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(neighborhood.scores.amenities)}`}>
                {neighborhood.scores.amenities}
              </div>
              <p className="text-sm text-gray-600">Amenities</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
          { id: 'schools', label: 'Schools', icon: <School className="w-4 h-4" /> },
          { id: 'amenities', label: 'Amenities', icon: <ShoppingBag className="w-4 h-4" /> },
          { id: 'transport', label: 'Transport', icon: <Train className="w-4 h-4" /> },
          { id: 'market', label: 'Market', icon: <BarChart3 className="w-4 h-4" /> }
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-2"
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Demographics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Demographics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {neighborhood.demographics && (
                <>
                  <div className="flex justify-between">
                    <span>Population Density</span>
                    <span className="font-medium">
                      {neighborhood.demographics.population_density?.toLocaleString()}/km²
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Median Income</span>
                    <span className="font-medium">
                      {formatCurrency(neighborhood.demographics.median_household_income)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Median Home Value</span>
                    <span className="font-medium">
                      {formatCurrency(neighborhood.demographics.median_home_value)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Renters</span>
                    <span className="font-medium">
                      {neighborhood.demographics.renter_percentage}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>College Educated</span>
                    <span className="font-medium">
                      {neighborhood.demographics.bachelor_degree_or_higher}%
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Safety Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Safety Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {crime_statistics && crime_statistics.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Current Safety Score</span>
                    <Badge variant={getScoreBadgeVariant(crime_statistics[0].safety_score)}>
                      {crime_statistics[0].safety_score}/100
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Recent Incidents (Last 3 months):</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>Total: {crime_statistics.slice(0, 3).reduce((sum, stat) => sum + stat.total_incidents, 0)}</div>
                      <div>Property: {crime_statistics.slice(0, 3).reduce((sum, stat) => sum + stat.property_crime, 0)}</div>
                      <div>Violent: {crime_statistics.slice(0, 3).reduce((sum, stat) => sum + stat.violent_crime, 0)}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'schools' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="w-5 h-5" />
              Nearby Schools ({nearby_schools?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {nearby_schools?.map((school: School) => (
                  <div key={school.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{school.name}</h4>
                        <p className="text-sm text-gray-600">{school.address}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <Badge variant="outline">{school.type}</Badge>
                          <span>Grades: {school.grades_served}</span>
                          <span>Students: {school.student_count}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{school.rating}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {school.distance_km.toFixed(1)} km away
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {activeTab === 'amenities' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Nearby Amenities ({nearby_amenities?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nearby_amenities?.map((amenity: Amenity) => (
                  <div key={amenity.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {amenityIcons[amenity.type] || <ShoppingBag className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{amenity.name}</h4>
                        <p className="text-sm text-gray-600">{amenity.address}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{amenity.type}</Badge>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              <span className="text-sm">{amenity.rating}</span>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {amenity.distance_km.toFixed(1)} km
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {activeTab === 'transport' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Train className="w-5 h-5" />
              Public Transportation ({public_transport?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {public_transport?.map((transport: Transport) => (
                  <div key={transport.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {transportIcons[transport.type] || <Train className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{transport.name}</h4>
                        <p className="text-sm text-gray-600">{transport.address}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <Badge variant="outline">{transport.type.replace('_', ' ')}</Badge>
                          <span>Lines: {transport.lines_served?.join(', ')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {transport.distance_km.toFixed(1)} km away
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {activeTab === 'market' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Market Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Market Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Average Price</span>
                <span className="font-medium">
                  {formatCurrency(market_insights.avg_price)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Price Range</span>
                <span className="font-medium">
                  {formatCurrency(market_insights.price_range.min)} - {formatCurrency(market_insights.price_range.max)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg Price/sqft</span>
                <span className="font-medium">
                  {formatCurrency(market_insights.avg_price_per_sqft)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Inventory Level</span>
                <Badge variant={market_insights.inventory_level === 'High' ? 'default' : 'secondary'}>
                  {market_insights.inventory_level}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Market Trend</span>
                <div className="flex items-center gap-1">
                  {market_insights.market_trend === 'Rising' ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : market_insights.market_trend === 'Falling' ? (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  ) : (
                    <Activity className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="font-medium">{market_insights.market_trend}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Total Listings</span>
                <span className="font-medium">{market_insights.total_listings}</span>
              </div>
            </CardContent>
          </Card>

          {/* Nearby Properties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Nearby Properties ({nearby_properties?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {nearby_properties?.map((property: Property) => (
                    <div key={property.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{property.title}</h4>
                          <div className="text-lg font-bold text-blue-600">
                            {formatCurrency(property.price)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatCurrency(property.price_per_sqft)}/sqft
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {property.distance_km.toFixed(1)} km
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

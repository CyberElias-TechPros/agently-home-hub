import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  MapPin,
  Star,
  BarChart3,
  PieChart,
  Target,
  Info,
  CheckCircle,
  AlertTriangle,
  Activity,
  Users,
  Calendar,
  Percent
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  address: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  current_price: number;
  price_per_sqft: number;
  days_on_market: number;
  neighborhood: {
    name: string;
    city: string;
    state: string;
    scores: {
      walkability: number;
      transit: number;
      schools: number;
      safety: number;
      amenities: number;
      overall: number;
    };
  };
}

interface Valuation {
  estimated_value: number;
  value_range: { min: number; max: number };
  price_per_sqft: number;
  confidence_level: string;
  confidence_factors: string[];
  methodology: string;
  market_position: string;
  adjustment_factors: {
    comparable_sales: boolean;
    market_trends: boolean;
    neighborhood_score: boolean;
    property_characteristics: boolean;
  };
  investment_analysis?: {
    estimated_monthly_rent: number;
    estimated_annual_rent: number;
    gross_rental_yield: number;
    net_rental_yield: number;
    estimated_monthly_expenses: number;
    capitalization_rate: number;
  };
}

interface Comparable {
  id: string;
  title: string;
  address: string;
  price: number;
  price_per_sqft: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  similarity_score: number;
  distance_km: number;
}

interface MarketTrend {
  month: string;
  avg_price: number;
  avg_price_per_sqft: number;
  listings_count: number;
  avg_days_on_market: number;
}

interface PropertyValuationProps {
  propertyId: string;
  onValuationComplete?: (valuation: any) => void;
}

export default function PropertyValuation({ propertyId, onValuationComplete }: PropertyValuationProps) {
  const [valuation, setValuation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [valuationType, setValuationType] = useState<'basic' | 'comprehensive' | 'investment'>('comprehensive');
  const [includeMarketTrends, setIncludeMarketTrends] = useState(true);
  const [includeComparables, setIncludeComparables] = useState(true);
  const [includeNeighborhoodFactors, setIncludeNeighborhoodFactors] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (propertyId) {
      calculateValuation();
    }
  }, [propertyId, valuationType, includeMarketTrends, includeComparables, includeNeighborhoodFactors]);

  const calculateValuation = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/valuation/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          property_id: propertyId,
          valuation_type: valuationType,
          include_market_trends: includeMarketTrends,
          include_comparables: includeComparables,
          include_neighborhood_factors: includeNeighborhoodFactors
        })
      });

      if (response.ok) {
        const data = await response.json();
        setValuation(data);
        onValuationComplete?.(data);
        
        toast({
          title: 'Valuation Complete',
          description: `Property valued at ${formatCurrency(data.valuation.estimated_value)}`,
        });
      } else {
        throw new Error('Failed to calculate valuation');
      }
    } catch (error) {
      console.error('Error calculating valuation:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate property valuation',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConfidenceBadgeVariant = (level: string) => {
    switch (level) {
      case 'High': return 'default';
      case 'Medium': return 'secondary';
      case 'Low': return 'destructive';
      default: return 'outline';
    }
  };

  const getMarketPositionIcon = (position: string) => {
    switch (position) {
      case 'Above Market': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'Below Market': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getMarketPositionColor = (position: string) => {
    switch (position) {
      case 'Above Market': return 'text-green-600';
      case 'Below Market': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Calculator className="h-12 w-12 text-blue-600 animate-pulse" />
            <h3 className="text-lg font-medium">Calculating Valuation...</h3>
            <p className="text-gray-500">Analyzing market data and comparable properties</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!valuation) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">Property Valuation</h3>
          <p className="text-gray-500 mb-4">
            Select a property to calculate its market value
          </p>
          <Button onClick={() => {}}>
            <Calculator className="w-4 h-4 mr-2" />
            Calculate Valuation
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { property, valuation: valuationData, comparables, market_trends } = valuation;

  return (
    <div className="space-y-6">
      {/* Valuation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Property Valuation Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Estimated Value */}
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Estimated Value</h3>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(valuationData.estimated_value)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {formatCurrency(valuationData.value_range.min)} - {formatCurrency(valuationData.value_range.max)}
              </div>
            </div>

            {/* Price per Sqft */}
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Price per Sqft</h3>
              <div className="text-2xl font-bold">
                {formatCurrency(valuationData.price_per_sqft)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Current: {formatCurrency(property.price_per_sqft)}
              </div>
            </div>

            {/* Market Position */}
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Market Position</h3>
              <div className={`flex items-center justify-center gap-2 ${getMarketPositionColor(valuationData.market_position)}`}>
                {getMarketPositionIcon(valuationData.market_position)}
                <span className="font-bold">{valuationData.market_position}</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Current: {formatCurrency(property.current_price)}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Confidence Level */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="font-medium">Confidence Level:</span>
            </div>
            <Badge variant={getConfidenceBadgeVariant(valuationData.confidence_level)}>
              {valuationData.confidence_level}
            </Badge>
          </div>

          {/* Confidence Factors */}
          {valuationData.confidence_factors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Based on:</h4>
              <div className="flex flex-wrap gap-2">
                {valuationData.confidence_factors.map((factor: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Property Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">{property.title}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{property.address}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>{property.bedrooms} beds</span>
                  <span>{property.bathrooms} baths</span>
                  <span>{property.area} sqft</span>
                </div>
                <div>
                  <span className="font-medium">Neighborhood:</span> {property.neighborhood.name}
                </div>
                <div>
                  <span className="font-medium">Days on Market:</span> {property.days_on_market}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Neighborhood Scores</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Walkability</span>
                  <span>{property.neighborhood.scores.walkability}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Transit</span>
                  <span>{property.neighborhood.scores.transit}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Schools</span>
                  <span>{property.neighborhood.scores.schools}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Safety</span>
                  <span>{property.neighborhood.scores.safety}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Amenities</span>
                  <span>{property.neighborhood.scores.amenities}/100</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Overall</span>
                  <span>{property.neighborhood.scores.overall}/100</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Analysis */}
      {valuationData.investment_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Investment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Rental Income</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Monthly Rent (Est.)</span>
                    <span className="font-medium">
                      {formatCurrency(valuationData.investment_analysis.estimated_monthly_rent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Annual Rent (Est.)</span>
                    <span className="font-medium">
                      {formatCurrency(valuationData.investment_analysis.estimated_annual_rent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Expenses (Est.)</span>
                    <span className="font-medium">
                      {formatCurrency(valuationData.investment_analysis.estimated_monthly_expenses)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Returns</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Gross Rental Yield</span>
                    <span className="font-medium">
                      {formatPercent(valuationData.investment_analysis.gross_rental_yield)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Rental Yield</span>
                    <span className="font-medium">
                      {formatPercent(valuationData.investment_analysis.net_rental_yield)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capitalization Rate</span>
                    <span className="font-medium">
                      {formatPercent(valuationData.investment_analysis.capitalization_rate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparable Properties */}
      {comparables && comparables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Comparable Properties ({comparables.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comparables.map((comp: Comparable) => (
                <div key={comp.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{comp.title}</h4>
                      <p className="text-sm text-gray-600">{comp.address}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span>{comp.bedrooms} beds</span>
                        <span>{comp.bathrooms} baths</span>
                        <span>{comp.area} sqft</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(comp.price)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(comp.price_per_sqft)}/sqft
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {comp.similarity_score}% similar
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {comp.distance_km.toFixed(1)} km away
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Trends */}
      {market_trends && market_trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Market Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {market_trends.map((trend: MarketTrend, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">{trend.month}</div>
                    <div className="text-sm text-gray-600">
                      {trend.listings_count} listings
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {formatCurrency(trend.avg_price)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(trend.avg_price_per_sqft)}/sqft
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Valuation Methodology
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Calculation Method</h4>
              <p className="text-sm text-gray-600">{valuationData.methodology}</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Adjustment Factors</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {valuationData.adjustment_factors.comparable_sales ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span>Comparable Sales Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  {valuationData.adjustment_factors.market_trends ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span>Market Trends</span>
                </div>
                <div className="flex items-center gap-2">
                  {valuationData.adjustment_factors.neighborhood_score ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span>Neighborhood Factors</span>
                </div>
                <div className="flex items-center gap-2">
                  {valuationData.adjustment_factors.property_characteristics ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span>Property Characteristics</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Valuation Type</h4>
              <div className="flex gap-2">
                {['basic', 'comprehensive', 'investment'].map((type) => (
                  <Button
                    key={type}
                    variant={valuationType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setValuationType(type as any)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

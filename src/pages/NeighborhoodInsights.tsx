import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Shield, Footprints, School, Hospital, ShoppingBag, TrendingUp, BarChart3, Users, Calendar, AlertTriangle, CheckCircle, Clock, Search, Filter, Building, DollarSign, Leaf } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import type { NeighborhoodInsights as NeighborhoodInsightsType, SafetyData, WalkabilityData, SchoolData, AmenityData, TransportationData, DemographicData, FutureDevelopment } from '@/types';

const NeighborhoodInsights = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for neighborhood data
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodInsightsType[]>([]);
  const [safetyData, setSafetyData] = useState<SafetyData[]>([]);
  const [walkabilityData, setWalkabilityData] = useState<WalkabilityData[]>([]);
  const [schoolData, setSchoolData] = useState<SchoolData[]>([]);
  const [amenityData, setAmenityData] = useState<AmenityData[]>([]);
  const [transportationData, setTransportationData] = useState<TransportationData[]>([]);
  const [demographicData, setDemographicData] = useState<DemographicData[]>([]);
  const [futureDevelopments, setFutureDevelopments] = useState<FutureDevelopment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (isAuthenticated && user) {
      loadNeighborhoodData();
    }
  }, [isAuthenticated, user]);

  const loadNeighborhoodData = async () => {
    try {
      setLoading(true);
      const [neighborhoodsData, safetyDataData, walkabilityDataData, schoolDataData, amenityDataData, transportationDataData, demographicDataData, futureDevelopmentsData] = await Promise.all([
        apiService.getNeighborhoodInsights(),
        apiService.getSafetyData(),
        apiService.getWalkabilityData(),
        apiService.getSchoolData(),
        apiService.getAmenityData(),
        apiService.getTransportationData(),
        apiService.getDemographicData(),
        apiService.getFutureDevelopments()
      ]);
      
      setNeighborhoods(neighborhoodsData);
      setSafetyData(safetyDataData);
      setWalkabilityData(walkabilityDataData);
      setSchoolData(schoolDataData);
      setAmenityData(amenityDataData);
      setTransportationData(transportationDataData);
      setDemographicData(demographicDataData);
      setFutureDevelopments(futureDevelopmentsData);
      
      if (neighborhoodsData.length > 0) {
        setSelectedNeighborhood(neighborhoodsData[0].id);
      }
    } catch (error) {
      toast({
        title: "Error loading neighborhood data",
        description: "Failed to load neighborhood information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNeighborhoodById = (neighborhoodId: string) => {
    return neighborhoods.find(n => n.id === neighborhoodId);
  };

  const getSafetyDataByNeighborhood = (neighborhoodId: string) => {
    return safetyData.find(sd => sd.neighborhoodId === neighborhoodId);
  };

  const getWalkabilityDataByNeighborhood = (neighborhoodId: string) => {
    return walkabilityData.find(wd => wd.neighborhoodId === neighborhoodId);
  };

  const getSchoolDataByNeighborhood = (neighborhoodId: string) => {
    return schoolData.find(sd => sd.neighborhoodId === neighborhoodId);
  };

  const getAmenityDataByNeighborhood = (neighborhoodId: string) => {
    return amenityData.find(ad => ad.neighborhoodId === neighborhoodId);
  };

  const getTransportationDataByNeighborhood = (neighborhoodId: string) => {
    return transportationData.find(td => td.neighborhoodId === neighborhoodId);
  };

  const getDemographicDataByNeighborhood = (neighborhoodId: string) => {
    return demographicData.find(dd => dd.neighborhoodId === neighborhoodId);
  };

  const getFutureDevelopmentsByNeighborhood = (neighborhoodId: string) => {
    return futureDevelopments.filter(fd => fd.neighborhoodId === neighborhoodId);
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    if (score >= 40) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getWalkabilityScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-blue-100 text-blue-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getOverallScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const filteredNeighborhoods = neighborhoods.filter(neighborhood => 
    (selectedCategory === 'all' || neighborhood.neighborhoodName.toLowerCase().includes(selectedCategory)) &&
    (neighborhood.neighborhoodName.toLowerCase().includes(searchLocation.toLowerCase()) ||
     neighborhood.location.city.toLowerCase().includes(searchLocation.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Neighborhood Insights</h1>
        <p className="text-muted-foreground">Comprehensive neighborhood analysis for informed decisions</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to access neighborhood insights.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search neighborhoods or cities..."
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="downtown">Downtown</SelectItem>
                  <SelectItem value="suburban">Suburban</SelectItem>
                  <SelectItem value="urban">Urban</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {activeTab === 'overview' ? `${neighborhoods.length} neighborhoods analyzed` : 'Detailed insights available'}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="safety">Safety</TabsTrigger>
              <TabsTrigger value="walkability">Walkability</TabsTrigger>
              <TabsTrigger value="schools">Schools</TabsTrigger>
              <TabsTrigger value="amenities">Amenities</TabsTrigger>
              <TabsTrigger value="demographics">Demographics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-48 bg-muted rounded mb-4"></div>
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded mb-4"></div>
                        <div className="flex justify-between">
                          <div className="h-8 bg-muted rounded w-16"></div>
                          <div className="h-8 bg-muted rounded w-16"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : filteredNeighborhoods.length > 0 ? (
                  filteredNeighborhoods.map((neighborhood) => {
                    const safety = getSafetyDataByNeighborhood(neighborhood.id);
                    const walkability = getWalkabilityDataByNeighborhood(neighborhood.id);
                    const schools = getSchoolDataByNeighborhood(neighborhood.id);
                    const amenities = getAmenityDataByNeighborhood(neighborhood.id);
                    
                    return (
                      <Card key={neighborhood.id} onClick={() => setSelectedNeighborhood(neighborhood.id)} className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold text-lg">{neighborhood.neighborhoodName}</h4>
                              <p className="text-sm text-muted-foreground">{neighborhood.location.city}, {neighborhood.location.state}</p>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${getOverallScoreColor(neighborhood.overallRating)}`}>
                                {neighborhood.overallRating}
                              </div>
                              <div className="text-sm text-muted-foreground">Overall Score</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-lg font-bold text-blue-700">{neighborhood.safetyScore}</div>
                              <div className="text-xs text-blue-700">Safety</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <div className="text-lg font-bold text-green-700">{neighborhood.walkabilityScore}</div>
                              <div className="text-xs text-green-700">Walkability</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <div className="text-lg font-bold text-purple-700">{schools?.averageRating || 'N/A'}</div>
                              <div className="text-xs text-purple-700">Schools</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <div className="text-lg font-bold text-orange-700">{amenities?.densityScore}</div>
                              <div className="text-xs text-orange-700">Amenities</div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>Updated: {new Date(neighborhood.lastUpdated).toLocaleDateString()}</span>
                            <span>Population: {safety?.crimeRate ? 'Data Available' : 'N/A'}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="col-span-full">
                    <CardContent className="py-8 text-center">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Neighborhoods Found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="safety" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Neighborhood Safety Analysis</h3>
                
                {selectedNeighborhood && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {neighborhoods.map((neighborhood) => {
                      const safety = getSafetyDataByNeighborhood(neighborhood.id);
                      if (!safety) return null;
                      
                      return (
                        <Card key={neighborhood.id}>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <Shield className="h-5 w-5 mr-2" />
                              {neighborhood.neighborhoodName}
                            </CardTitle>
                            <CardDescription>Safety Statistics</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="text-center p-6 bg-gray-50 rounded-lg">
                                <div className={`text-4xl font-bold ${getSafetyScoreColor(safety.crimeRate)}`}>
                                  {safety.crimeRate}
                                </div>
                                <div className="text-sm text-muted-foreground">Crime Rate (per 1000)</div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-sm text-muted-foreground">Violent Crime</span>
                                  <div className="font-semibold">{safety.violentCrimeRate}</div>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">Property Crime</span>
                                  <div className="font-semibold">{safety.propertyCrimeRate}</div>
                                </div>
                              </div>

                              <div>
                                <span className="text-sm text-muted-foreground">Top Concerns</span>
                                <div className="space-y-1 mt-2">
                                  {safety.topConcerns.map((concern, index) => (
                                    <div key={index} className="flex items-center space-x-2 text-sm">
                                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                                      <span>{concern}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Police Stations:</span>
                                  <span className="ml-2 font-medium">{safety.policeStations}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Emergency Response:</span>
                                  <span className="ml-2 font-medium">{safety.emergencyResponseTime} min</span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className={getSafetyScoreColor(safety.crimeRate)}>
                                  {safety.crimeTrend}
                                </Badge>
                                <span className="text-sm text-muted-foreground">Trend</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="walkability" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Walkability & Accessibility</h3>
                
                {selectedNeighborhood && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {neighborhoods.map((neighborhood) => {
                      const walkability = getWalkabilityDataByNeighborhood(neighborhood.id);
                      if (!walkability) return null;
                      
                      return (
                        <Card key={neighborhood.id}>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <Footprints className="h-5 w-5 mr-2" />
                              {neighborhood.neighborhoodName}
                            </CardTitle>
                            <CardDescription>Walkability Scores</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                  <div className="text-2xl font-bold text-green-700">{walkability.walkScore}</div>
                                  <div className="text-xs text-green-700">Walk Score</div>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                  <div className="text-2xl font-bold text-blue-700">{walkability.bikeScore}</div>
                                  <div className="text-xs text-blue-700">Bike Score</div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                  <div className="text-2xl font-bold text-purple-700">{walkability.transitScore}</div>
                                  <div className="text-xs text-purple-700">Transit Score</div>
                                </div>
                              </div>

                              <div>
                                <span className="text-sm text-muted-foreground">Nearby Amenities</span>
                                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>Grocery:</span>
                                    <span className="font-medium">{walkability.nearbyAmenities.grocery} min</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Restaurants:</span>
                                    <span className="font-medium">{walkability.nearbyAmenities.restaurants} min</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Shopping:</span>
                                    <span className="font-medium">{walkability.nearbyAmenities.shopping} min</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Parks:</span>
                                    <span className="font-medium">{walkability.nearbyAmenities.parks} min</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Schools:</span>
                                    <span className="font-medium">{walkability.nearbyAmenities.schools} min</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Hospitals:</span>
                                    <span className="font-medium">{walkability.nearbyAmenities.hospitals} min</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <input type="checkbox" checked={walkability.pedestrianFriendly} readOnly />
                                <span className="text-sm">Pedestrian Friendly</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" checked={walkability.bikeFriendly} readOnly />
                                <span className="text-sm">Bike Friendly</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="schools" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">School Quality & Education</h3>
                
                {selectedNeighborhood && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {neighborhoods.map((neighborhood) => {
                      const schools = getSchoolDataByNeighborhood(neighborhood.id);
                      if (!schools) return null;
                      
                      return (
                        <Card key={neighborhood.id}>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <School className="h-5 w-5 mr-2" />
                              {neighborhood.neighborhoodName}
                            </CardTitle>
                            <CardDescription>School Information</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="text-center p-6 bg-blue-50 rounded-lg">
                                <div className="text-3xl font-bold text-blue-700">{schools.averageRating}</div>
                                <div className="text-sm text-blue-700">Average School Rating</div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Student-Teacher Ratio</span>
                                  <div className="font-semibold">{schools.studentTeacherRatio}:1</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Graduation Rate</span>
                                  <div className="font-semibold">{schools.graduationRate}%</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">College Readiness</span>
                                  <div className="font-semibold">{schools.collegeReadiness}%</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total Schools</span>
                                  <div className="font-semibold">{schools.schools.length}</div>
                                </div>
                              </div>

                              <div>
                                <span className="text-sm text-muted-foreground">Top Rated Schools</span>
                                <div className="space-y-2 mt-2">
                                  {schools.schools.slice(0, 3).map((school, index) => (
                                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                                      <div>
                                        <span className="font-medium">{school.name}</span>
                                        <p className="text-xs text-muted-foreground">{school.type} • Rating: {school.rating}</p>
                                      </div>
                                      <span className="text-sm font-medium">{school.distance} mi</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="amenities" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Amenities & Lifestyle</h3>
                
                {selectedNeighborhood && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {neighborhoods.map((neighborhood) => {
                      const amenities = getAmenityDataByNeighborhood(neighborhood.id);
                      if (!amenities) return null;
                      
                      return (
                        <Card key={neighborhood.id}>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <ShoppingBag className="h-5 w-5 mr-2" />
                              {neighborhood.neighborhoodName}
                            </CardTitle>
                            <CardDescription>Amenity Analysis</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                  <div className="text-2xl font-bold text-green-700">{amenities.densityScore}</div>
                                  <div className="text-xs text-green-700">Density Score</div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                  <div className="text-2xl font-bold text-purple-700">{amenities.accessibilityScore}</div>
                                  <div className="text-xs text-purple-700">Accessibility</div>
                                </div>
                              </div>

                              <div>
                                <span className="text-sm text-muted-foreground">Amenity Categories</span>
                                <div className="space-y-2 mt-2">
                                  {amenities.categories.map((category, index) => (
                                    <div key={index} className="border rounded-lg p-3">
                                      <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-medium">{category.type}</h4>
                                        <div className="text-sm text-muted-foreground">
                                          {category.count} locations • {category.averageDistance} mi avg
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {category.topRated.map((rating, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">{rating}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="demographics" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Demographics & Community</h3>
                
                {selectedNeighborhood && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {neighborhoods.map((neighborhood) => {
                      const demographics = getDemographicDataByNeighborhood(neighborhood.id);
                      if (!demographics) return null;
                      
                      return (
                        <Card key={neighborhood.id}>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <Users className="h-5 w-5 mr-2" />
                              {neighborhood.neighborhoodName}
                            </CardTitle>
                            <CardDescription>Demographic Data</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                  <div className="text-2xl font-bold text-blue-700">{demographics.population.toLocaleString()}</div>
                                  <div className="text-xs text-blue-700">Population</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                  <div className="text-2xl font-bold text-green-700">${(demographics.medianIncome / 1000).toFixed(0)}K</div>
                                  <div className="text-xs text-green-700">Median Income</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Median Age</span>
                                  <div className="font-semibold">{demographics.medianAge}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Homeownership Rate</span>
                                  <div className="font-semibold">{demographics.homeownershipRate}%</div>
                                </div>
                              </div>

                              <div>
                                <span className="text-sm text-muted-foreground">Education Levels</span>
                                <div className="space-y-2 mt-2">
                                  <div className="flex justify-between text-sm">
                                    <span>High School:</span>
                                    <span className="font-medium">{demographics.educationLevel.highSchool}%</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Bachelor's:</span>
                                    <span className="font-medium">{demographics.educationLevel.bachelors}%</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Graduate:</span>
                                    <span className="font-medium">{demographics.educationLevel.graduate}%</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">
                                  Diversity Index: {demographics.diversityIndex}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default NeighborhoodInsights;
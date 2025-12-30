import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, MapPin, School, Car, Users, TrendingUp, AlertTriangle, CheckCircle, Star, Home, Bus, Bike } from 'lucide-react';
import { mockNeighborhoodInsights, mockSafetyData, mockWalkabilityData, mockSchoolData, mockAmenityData, mockTransportationData, mockDemographicData, mockFutureDevelopment } from '@/lib/mockData';
import type { NeighborhoodInsights, SafetyData, WalkabilityData, SchoolData, AmenityData, TransportationData, DemographicData, FutureDevelopment } from '@/types';

const NeighborhoodInsights = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('1');

  const currentNeighborhood = mockNeighborhoodInsights.find(n => n.id === selectedNeighborhood);
  const safetyData = mockSafetyData.find(s => s.neighborhoodId === selectedNeighborhood);
  const walkabilityData = mockWalkabilityData.find(w => w.neighborhoodId === selectedNeighborhood);
  const schoolData = mockSchoolData.find(s => s.neighborhoodId === selectedNeighborhood);
  const amenityData = mockAmenityData.find(a => a.neighborhoodId === selectedNeighborhood);
  const transportData = mockTransportationData.find(t => t.neighborhoodId === selectedNeighborhood);
  const demographicData = mockDemographicData.find(d => d.neighborhoodId === selectedNeighborhood);
  const futureDev = mockFutureDevelopment.find(f => f.neighborhoodId === selectedNeighborhood);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Neighborhood Insights</h1>
        <p className="text-muted-foreground">Comprehensive analysis of neighborhoods for informed housing decisions</p>
      </div>

      {/* Neighborhood Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Select Neighborhood:</label>
            <select
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              {mockNeighborhoodInsights.map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.neighborhoodName}, {neighborhood.location.city}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="walkability">Walkability</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="future">Future</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {currentNeighborhood && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentNeighborhood.overallRating}/100</div>
                  <Progress value={currentNeighborhood.overallRating} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentNeighborhood.safetyScore}/100</div>
                  <Progress value={currentNeighborhood.safetyScore} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Walkability</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentNeighborhood.walkabilityScore}/100</div>
                  <Progress value={currentNeighborhood.walkabilityScore} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Population</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {demographicData ? (demographicData.population / 1000).toFixed(0) : 0}K
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Median age: {demographicData?.medianAge || 0}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Key Highlights</CardTitle>
                <CardDescription>What makes this neighborhood special</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Excellent walkability score</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">High-rated schools nearby</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Abundant amenities and services</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm">Limited parking availability</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demographics</CardTitle>
                <CardDescription>Community characteristics</CardDescription>
              </CardHeader>
              <CardContent>
                {demographicData && (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Median Income</span>
                      <span className="font-semibold">${demographicData.medianIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Education Level</span>
                      <span className="font-semibold">{demographicData.educationLevel.bachelors}% Bachelor's+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Homeownership</span>
                      <span className="font-semibold">{demographicData.homeownershipRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Diversity Index</span>
                      <span className="font-semibold">{demographicData.diversityIndex}/100</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="safety" className="mt-6">
          {safetyData && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Safety Overview
                  </CardTitle>
                  <CardDescription>Crime statistics and safety measures</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Overall Crime Rate</span>
                      <Badge variant={safetyData.crimeRate < 30 ? 'default' : safetyData.crimeRate < 50 ? 'secondary' : 'destructive'}>
                        {safetyData.crimeRate}/100
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Violent Crime Rate</span>
                      <span className="font-semibold">{safetyData.violentCrimeRate}/100</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Property Crime Rate</span>
                      <span className="font-semibold">{safetyData.propertyCrimeRate}/100</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Emergency Response</span>
                      <span className="font-semibold">{safetyData.emergencyResponseTime} min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Police Stations</span>
                      <span className="font-semibold">{safetyData.policeStations}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Crime Trends & Concerns</CardTitle>
                  <CardDescription>Recent patterns and main issues</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Badge variant={safetyData.crimeTrend === 'improving' ? 'default' : safetyData.crimeTrend === 'stable' ? 'secondary' : 'destructive'}>
                        {safetyData.crimeTrend}
                      </Badge>
                      <span className="text-sm">Crime trend over past year</span>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Top Safety Concerns:</p>
                      <div className="space-y-1">
                        {safetyData.topConcerns.map((concern, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm">{concern}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="walkability" className="mt-6">
          {walkabilityData && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Walkability Scores
                  </CardTitle>
                  <CardDescription>How pedestrian and bike-friendly the area is</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Walk Score</span>
                        <span className="font-semibold">{walkabilityData.walkScore}/100</span>
                      </div>
                      <Progress value={walkabilityData.walkScore} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Bike Score</span>
                        <span className="font-semibold">{walkabilityData.bikeScore}/100</span>
                      </div>
                      <Progress value={walkabilityData.bikeScore} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Transit Score</span>
                        <span className="font-semibold">{walkabilityData.transitScore}/100</span>
                      </div>
                      <Progress value={walkabilityData.transitScore} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nearby Amenities</CardTitle>
                  <CardDescription>Count of essential services within walking distance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{walkabilityData.nearbyAmenities.grocery}</div>
                      <p className="text-xs text-muted-foreground">Grocery Stores</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{walkabilityData.nearbyAmenities.restaurants}</div>
                      <p className="text-xs text-muted-foreground">Restaurants</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{walkabilityData.nearbyAmenities.shopping}</div>
                      <p className="text-xs text-muted-foreground">Shopping</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{walkabilityData.nearbyAmenities.parks}</div>
                      <p className="text-xs text-muted-foreground">Parks</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{walkabilityData.nearbyAmenities.schools}</div>
                      <p className="text-xs text-muted-foreground">Schools</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{walkabilityData.nearbyAmenities.hospitals}</div>
                      <p className="text-xs text-muted-foreground">Hospitals</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schools" className="mt-6">
          {schoolData && (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <School className="h-5 w-5 mr-2" />
                    School District Overview
                  </CardTitle>
                  <CardDescription>Educational quality and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{schoolData.averageRating}/10</div>
                      <p className="text-xs text-muted-foreground">Average Rating</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{schoolData.studentTeacherRatio}:1</div>
                      <p className="text-xs text-muted-foreground">Student-Teacher Ratio</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{schoolData.graduationRate}%</div>
                      <p className="text-xs text-muted-foreground">Graduation Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{schoolData.collegeReadiness}%</div>
                      <p className="text-xs text-muted-foreground">College Readiness</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Schools in Area</CardTitle>
                  <CardDescription>Educational institutions and their ratings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {schoolData.schools.map((school) => (
                      <div key={school.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              <School className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{school.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {school.type} • {school.distance} miles away
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{school.rating}/10</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {school.enrollment} students
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="amenities" className="mt-6">
          {amenityData && (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Amenity Density & Accessibility</CardTitle>
                  <CardDescription>How well-served the neighborhood is</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Amenity Density</span>
                        <span className="font-semibold">{amenityData.densityScore}/100</span>
                      </div>
                      <Progress value={amenityData.densityScore} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Accessibility Score</span>
                        <span className="font-semibold">{amenityData.accessibilityScore}/100</span>
                      </div>
                      <Progress value={amenityData.accessibilityScore} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Amenity Categories</CardTitle>
                  <CardDescription>Detailed breakdown by service type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {amenityData.categories.map((category, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm">{category.type}</h4>
                          <Badge variant="secondary">{category.count}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Avg. distance: {category.averageDistance} miles
                        </p>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs">Quality:</span>
                          <Badge variant={
                            category.quality === 'high' ? 'default' :
                            category.quality === 'medium' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {category.quality}
                          </Badge>
                        </div>
                        {category.topRated.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Top rated:</p>
                            <p className="text-xs font-medium">{category.topRated[0]}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="future" className="mt-6">
          {futureDev && (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Future Development
                  </CardTitle>
                  <CardDescription>Planned projects and growth projections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{futureDev.projects.length}</div>
                      <p className="text-xs text-muted-foreground">Active Projects</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{futureDev.growthRate}%</div>
                      <p className="text-xs text-muted-foreground">Growth Rate</p>
                    </div>
                    <div className="text-center">
                      <Badge variant={futureDev.expectedImpact === 'positive' ? 'default' : 'secondary'}>
                        {futureDev.expectedImpact} Impact
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Development Projects</CardTitle>
                  <CardDescription>Upcoming construction and infrastructure</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {futureDev.projects.map((project) => (
                      <div key={project.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{project.name}</h4>
                            <p className="text-sm text-muted-foreground capitalize">{project.type}</p>
                          </div>
                          <Badge variant={
                            project.status === 'completed' ? 'default' :
                            project.status === 'under_construction' ? 'secondary' : 'outline'
                          }>
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        {project.completionDate && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Expected completion: {new Date(project.completionDate).toLocaleDateString()}
                          </p>
                        )}

                        <p className="text-sm">{project.impact}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Infrastructure Improvements</CardTitle>
                  <CardDescription>Planned upgrades and enhancements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2">
                    {futureDev.infrastructure.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NeighborhoodInsights;
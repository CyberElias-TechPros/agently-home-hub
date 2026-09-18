import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users, Heart, MessageSquare, Calendar, Star, Filter, Plus, Edit, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { RoommateProfile, RoomAvailability, RoommateMatch, RoommateApplication, RoommateReview } from '@/types';

const Roommates = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('browse');
  const [profiles, setProfiles] = useState<RoommateProfile[]>([]);
  const [availabilities, setAvailabilities] = useState<RoomAvailability[]>([]);
  const [matches, setMatches] = useState<RoommateMatch[]>([]);
  const [applications, setApplications] = useState<RoommateApplication[]>([]);
  const [myProfile, setMyProfile] = useState<RoommateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      loadRoommateData();
    }
  }, [isAuthenticated, user]);

  const loadRoommateData = async () => {
    try {
      setLoading(true);
      const [profilesData, availabilitiesData, matchesData, applicationsData, profileData] = await Promise.all([
        apiService.getRoommateProfiles(),
        apiService.getRoomAvailabilities(),
        apiService.getRoommateMatches(user.id),
        apiService.getRoommateApplications(user.id),
        apiService.getMyRoommateProfile(user.id)
      ]);
      
      setProfiles(profilesData);
      setAvailabilities(availabilitiesData);
      setMatches(matchesData);
      setApplications(applicationsData);
      setMyProfile(profileData);
    } catch (error) {
      toast({
        title: "Error loading roommate data",
        description: "Failed to load roommate information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (profileData: Partial<RoommateProfile>) => {
    try {
      const newProfile = await apiService.createRoommateProfile(profileData);
      setMyProfile(newProfile);
      toast({
        title: "Profile Created",
        description: "Your roommate profile has been created successfully!",
      });
    } catch (error) {
      toast({
        title: "Profile Creation Failed",
        description: "Failed to create your roommate profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApplyForRoom = async (availabilityId: string, message: string) => {
    try {
      await apiService.applyForRoom(availabilityId, message);
      toast({
        title: "Application Submitted",
        description: "Your application has been sent to the room owner.",
      });
      loadRoommateData();
    } catch (error) {
      toast({
        title: "Application Failed",
        description: "Failed to submit your application. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptMatch = async (matchId: string) => {
    try {
      await apiService.acceptRoommateMatch(matchId);
      toast({
        title: "Match Accepted",
        description: "You've accepted this roommate match. Contact them to arrange viewing.",
      });
      loadRoommateData();
    } catch (error) {
      toast({
        title: "Accept Failed",
        description: "Failed to accept match. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredProfiles = profiles.filter(profile => 
    profile.id !== myProfile?.id &&
    (profile.bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
     profile.occupation.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredAvailabilities = availabilities.filter(availability =>
    availability.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    availability.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Roommate Matching</h1>
        <p className="text-muted-foreground">Find compatible roommates and rooms for rent</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to access roommate matching features.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : !myProfile ? (
        <CreateProfile onProfileCreated={handleCreateProfile} />
      ) : (
        <>
          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search roommates or rooms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {activeTab === 'browse' ? `${profiles.length} roommates found` : `${availabilities.length} rooms available`}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="browse">Browse Roommates</TabsTrigger>
              <TabsTrigger value="rooms">Find Rooms</TabsTrigger>
              <TabsTrigger value="matches">Matches</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="mt-6">
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
                ) : filteredProfiles.length > 0 ? (
                  filteredProfiles.map((profile) => (
                    <RoommateCard key={profile.id} profile={profile} onApply={() => {}} />
                  ))
                ) : (
                  <Card className="col-span-full">
                    <CardContent className="py-8 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Roommates Found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="rooms" className="mt-6">
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
                ) : filteredAvailabilities.length > 0 ? (
                  filteredAvailabilities.map((availability) => (
                    <RoomCard 
                      key={availability.id} 
                      availability={availability} 
                      onApply={handleApplyForRoom}
                    />
                  ))
                ) : (
                  <Card className="col-span-full">
                    <CardContent className="py-8 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Rooms Found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="matches" className="mt-6">
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="h-16 w-16 bg-muted rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded mb-2"></div>
                            <div className="h-3 bg-muted rounded w-3/4"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : matches.length > 0 ? (
                  matches.map((match) => (
                    <MatchCard key={match.id} match={match} onAccept={handleAcceptMatch} />
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Matches Yet</h3>
                      <p className="text-muted-foreground">Keep your profile updated to get better matches.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="applications" className="mt-6">
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="h-16 w-16 bg-muted rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded mb-2"></div>
                            <div className="h-3 bg-muted rounded w-3/4"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : applications.length > 0 ? (
                  applications.map((application) => (
                    <ApplicationCard key={application.id} application={application} />
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Applications</h3>
                      <p className="text-muted-foreground">Apply for rooms to see your applications here.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

// Roommate Card Component
const RoommateCard = ({ profile, onApply }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center space-x-4 mb-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatar} />
          <AvatarFallback>{profile.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-semibold text-lg">{profile.name}</h4>
          <p className="text-sm text-muted-foreground">{profile.occupation}</p>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="secondary">{profile.age} years old</Badge>
            <Badge>{profile.budget.min} - {profile.budget.max}/month</Badge>
          </div>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">{profile.bio}</p>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        {profile.lookingFor.map((item, index) => (
          <Badge key={index} variant="outline" className="text-xs">{item}</Badge>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="sm">
          <MessageSquare className="h-4 w-4 mr-2" />
          Message
        </Button>
        <Button size="sm" onClick={() => onApply(profile.id)}>
          <Heart className="h-4 w-4 mr-2" />
          Interested
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Room Card Component
const RoomCard = ({ availability, onApply }) => (
  <Card>
    <CardContent className="p-6">
      <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
        <img src={availability.images[0]} alt={availability.title} className="w-full h-full object-cover" />
      </div>
      
      <h4 className="font-semibold text-lg mb-2">{availability.title}</h4>
      <p className="text-sm text-muted-foreground mb-2">{availability.description}</p>
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-2xl font-bold text-primary">${availability.rent}/month</span>
          <p className="text-sm text-muted-foreground">Available from {new Date(availability.availableFrom).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <div className="text-sm">Roommates needed: {availability.roommatesNeeded}</div>
          <div className="text-sm text-muted-foreground">Current: {availability.currentRoommates}</div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="sm">
          <MessageSquare className="h-4 w-4 mr-2" />
          Contact
        </Button>
        <Button size="sm" onClick={() => onApply(availability.id, "I'm interested in this room!")}>
          <Heart className="h-4 w-4 mr-2" />
          Apply
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Match Card Component
const MatchCard = ({ match, onAccept }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={match.profile?.avatar} />
            <AvatarFallback>{match.profile?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-semibold text-lg">{match.profile?.name}</h4>
            <p className="text-sm text-muted-foreground">{match.profile?.occupation}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary">Compatibility: {match.compatibilityScore}%</Badge>
              <Badge>{match.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
          {match.status === 'pending' && (
            <Button size="sm" onClick={() => onAccept(match.id)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Accept
            </Button>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Application Card Component
const ApplicationCard = ({ application }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={application.roomAvailability?.images[0]} />
            <AvatarFallback>Room</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-semibold text-lg">{application.roomAvailability?.title}</h4>
            <p className="text-sm text-muted-foreground">{application.roomAvailability?.description}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary">${application.roomAvailability?.rent}/month</Badge>
              <Badge>{application.status}</Badge>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Applied: {new Date(application.appliedAt).toLocaleDateString()}</div>
          {application.message && (
            <div className="text-sm mt-1">"{application.message}"</div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Create Profile Component
const CreateProfile = ({ onProfileCreated }) => {
  const [formData, setFormData] = useState({
    age: '',
    occupation: '',
    preferences: {
      smoking: false,
      pets: false,
      nightOwl: false,
      cleanliness: 3,
      socialLevel: 3
    },
    bio: '',
    budget: { min: 500, max: 2000 },
    lookingFor: []
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onProfileCreated(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Roommate Profile</CardTitle>
        <CardDescription>Help us find the perfect match for you</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Age</Label>
              <Input type="number" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} required />
            </div>
            <div>
              <Label>Occupation</Label>
              <Input value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} required />
            </div>
          </div>

          <div>
            <Label>Bio</Label>
            <Input value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} placeholder="Tell roommates about yourself..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimum Budget</Label>
              <Input type="number" value={formData.budget.min} onChange={(e) => setFormData({...formData, budget: {...formData.budget, min: Number(e.target.value)}})} />
            </div>
            <div>
              <Label>Maximum Budget</Label>
              <Input type="number" value={formData.budget.max} onChange={(e) => setFormData({...formData, budget: {...formData.budget, max: Number(e.target.value)}})} />
            </div>
          </div>

          <div>
            <Label>Preferences</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={formData.preferences.smoking} onChange={(e) => setFormData({...formData, preferences: {...formData.preferences, smoking: e.target.checked}})} />
                <span>Non-smoking preferred</span>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={formData.preferences.pets} onChange={(e) => setFormData({...formData, preferences: {...formData.preferences, pets: e.target.checked}})} />
                <span>Pet-friendly</span>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={formData.preferences.nightOwl} onChange={(e) => setFormData({...formData, preferences: {...formData.preferences, nightOwl: e.target.checked}})} />
                <span>Night owl OK</span>
              </div>
            </div>
          </div>

          <Button type="submit">Create Profile</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default Roommates;
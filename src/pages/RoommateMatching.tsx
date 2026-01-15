import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Star, Calendar, MapPin, DollarSign, PawPrint, Moon, Sun } from 'lucide-react';
import { apiService } from '@/lib/api';
import { RoommateProfile, RoomAvailability, RoommateMatch, RoommateApplication } from '@/types';

export default function RoommateMatching() {
  const [profiles, setProfiles] = useState<RoommateProfile[]>([]);
  const [roomAvailabilities, setRoomAvailabilities] = useState<RoomAvailability[]>([]);
  const [matches, setMatches] = useState<RoommateMatch[]>([]);
  const [applications, setApplications] = useState<RoommateApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profiles' | 'rooms' | 'matches' | 'applications'>('profiles');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRoommateData();
  }, []);

  const fetchRoommateData = async () => {
    setLoading(true);
    try {
      const [profilesData, roomsData, matchesData, applicationsData] = await Promise.all([
        apiService.getRoommateProfiles(),
        apiService.getRoomAvailabilities(),
        apiService.getRoommateMatches('1'),
        apiService.getRoommateApplications('1')
      ]);
      
      // Map profiles data to ensure proper typing for cleanliness and socialLevel
      const mappedProfiles = profilesData.map(profile => ({
        ...profile,
        preferences: {
          ...profile.preferences,
          cleanliness: profile.preferences.cleanliness as 1 | 2 | 3 | 4 | 5,
          socialLevel: profile.preferences.socialLevel as 1 | 2 | 3 | 4 | 5
        }
      }));
      
      setProfiles(mappedProfiles);
      setRoomAvailabilities(roomsData);
      setMatches(matchesData);
      setApplications(applicationsData);
    } catch (error) {
      console.error('Error fetching roommate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(profile => 
    profile.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.occupation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRooms = roomAvailabilities.filter(room => 
    room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.location.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApplyForRoom = async (roomAvailabilityId: string) => {
    try {
      const application = await apiService.applyForRoom(roomAvailabilityId, 'I am very interested in this room and would be a great roommate!');
      setApplications([...applications, application]);
    } catch (error) {
      console.error('Error applying for room:', error);
    }
  };

  const handleAcceptMatch = async (matchId: string) => {
    try {
      await apiService.acceptRoommateMatch(matchId);
      setMatches(matches.map(match => 
        match.id === matchId ? { ...match, status: 'applied' } : match
      ));
    } catch (error) {
      console.error('Error accepting match:', error);
    }
  };

  const getCompatibilityScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const renderProfiles = () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setActiveTab('rooms')}>Find Rooms</Button>
      </div>
      
      {loading ? (
        <div className="text-center py-8">Loading profiles...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map(profile => (
            <Card key={profile.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{profile.userId}</CardTitle>
                    <CardDescription>{profile.occupation}</CardDescription>
                  </div>
                  <Badge variant="secondary">{profile.age} years old</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {profile.lookingFor.map(item => (
                    <Badge key={item} variant="outline">{item}</Badge>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <PawPrint className="h-4 w-4" />
                    <span>{profile.preferences.pets ? 'Pets OK' : 'No Pets'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>${profile.budget.min}-${profile.budget.max}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>{profile.preferences.nightOwl ? 'Night Owl' : 'Early Bird'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>Cleanliness: {profile.preferences.cleanliness}/5</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">{profile.bio}</p>
                
                <div className="flex justify-between items-center">
                  <Badge variant="outline">Verified: {profile.verified ? 'Yes' : 'No'}</Badge>
                  <Badge variant="secondary">Reviews: {profile.reviews.length}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderRooms = () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setActiveTab('profiles')}>Find Roommates</Button>
      </div>
      
      {loading ? (
        <div className="text-center py-8">Loading rooms...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map(room => (
            <Card key={room.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{room.title}</CardTitle>
                    <CardDescription>{room.location.city}, {room.location.state}</CardDescription>
                  </div>
                  <Badge variant="secondary">${room.rent}/month</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {room.amenities.map(amenity => (
                    <Badge key={amenity} variant="outline">{amenity}</Badge>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{room.currentRoommates}/{room.roommatesNeeded} filled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{room.location.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PawPrint className="h-4 w-4" />
                    <span>{room.preferences.pets ? 'Pets OK' : 'No Pets'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Available: {room.availableFrom}</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">{room.description}</p>
                
                <div className="flex justify-between items-center">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <Button onClick={() => handleApplyForRoom(room.id)}>Apply</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderMatches = () => (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-8">Loading matches...</div>
      ) : (
        <div className="grid gap-4">
          {matches.map(match => (
            <Card key={match.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Roommate Match Found</CardTitle>
                    <CardDescription>Compatibility Score: {match.compatibilityScore}%</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{match.status}</Badge>
                    <div className={`w-4 h-4 rounded-full ${getCompatibilityScoreColor(match.compatibilityScore)}`}></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span>Room Availability ID: {match.roomAvailabilityId}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleAcceptMatch(match.id)}>
                      Accept Match
                    </Button>
                    <Button variant="outline">View Details</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderApplications = () => (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-8">Loading applications...</div>
      ) : (
        <div className="grid gap-4">
          {applications.map(application => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Room Application</CardTitle>
                    <CardDescription>Room ID: {application.roomAvailabilityId}</CardDescription>
                  </div>
                  <Badge variant="secondary">{application.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{application.message}</p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Applied: {new Date(application.appliedAt).toLocaleDateString()}</span>
                  {application.reviewedAt && (
                    <span>Reviewed: {new Date(application.reviewedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Roommate Matching System</h1>
        <p className="text-gray-600 mt-2">Find compatible roommates and rooms that match your preferences</p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button 
          variant={activeTab === 'profiles' ? 'default' : 'outline'}
          onClick={() => setActiveTab('profiles')}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Find Roommates
        </Button>
        <Button 
          variant={activeTab === 'rooms' ? 'default' : 'outline'}
          onClick={() => setActiveTab('rooms')}
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          Find Rooms
        </Button>
        <Button 
          variant={activeTab === 'matches' ? 'default' : 'outline'}
          onClick={() => setActiveTab('matches')}
          className="flex items-center gap-2"
        >
          <Star className="h-4 w-4" />
          Matches ({matches.length})
        </Button>
        <Button 
          variant={activeTab === 'applications' ? 'default' : 'outline'}
          onClick={() => setActiveTab('applications')}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          Applications ({applications.length})
        </Button>
      </div>

      {activeTab === 'profiles' && renderProfiles()}
      {activeTab === 'rooms' && renderRooms()}
      {activeTab === 'matches' && renderMatches()}
      {activeTab === 'applications' && renderApplications()}
    </div>
  );
}
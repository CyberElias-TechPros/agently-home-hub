import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import RoommateProfileForm from '@/components/RoommateProfileForm';
import { mockRoommateProfiles, mockRoomAvailabilities, mockRoommateMatches, mockRoommateApplications } from '@/lib/mockData';
import { RoommateProfile, RoomAvailability, RoommateMatch, RoommateApplication } from '@/types';

const Roommates = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profiles, setProfiles] = useState(mockRoommateProfiles);

  const currentUserId = '1'; // Mock current user
  const userProfile = profiles.find(p => p.userId === currentUserId);
  const userMatches = mockRoommateMatches.filter(m => m.userId === currentUserId);
  const userApplications = mockRoommateApplications.filter(a => a.userId === currentUserId);

  const { toast } = useToast();

  const handleProfileSave = (profileData: {
    age: number;
    occupation: string;
    preferences: {
      smoking: boolean;
      pets: boolean;
      nightOwl: boolean;
      cleanliness: 1 | 2 | 3 | 4 | 5;
      socialLevel: 1 | 2 | 3 | 4 | 5;
    };
    bio: string;
    budget: { min: number; max: number };
    lookingFor: string[];
  }) => {
    if (userProfile) {
      // Update existing profile
      setProfiles(prev => prev.map(p =>
        p.id === userProfile.id
          ? { ...p, ...profileData }
          : p
      ));
      toast({
        title: "Profile Updated",
        description: "Your roommate profile has been successfully updated.",
      });
    } else {
      // Create new profile
      const newProfile: RoommateProfile = {
        id: Date.now().toString(),
        userId: currentUserId,
        ...profileData,
        verified: false,
        backgroundCheck: false,
        reviews: []
      };
      setProfiles(prev => [...prev, newProfile]);
      toast({
        title: "Profile Created",
        description: "Your roommate profile has been successfully created.",
      });
    }
    setShowProfileForm(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Roommate Matching</h1>
        <p className="text-muted-foreground">Find your perfect roommate and shared living space</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          <TabsTrigger value="rooms">Available Rooms</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          {showProfileForm ? (
            <RoommateProfileForm
              profile={userProfile}
              onSave={handleProfileSave}
              onCancel={() => setShowProfileForm(false)}
            />
          ) : userProfile ? (
            <Card>
              <CardHeader>
                <CardTitle>My Roommate Profile</CardTitle>
                <CardDescription>Manage your profile and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src="" />
                      <AvatarFallback>{userProfile.age}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold">{userProfile.occupation}</h3>
                      <p className="text-sm text-muted-foreground">Age: {userProfile.age}</p>
                      <p className="text-sm text-muted-foreground">Budget: ${userProfile.budget.min} - ${userProfile.budget.max}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Bio</h4>
                    <p>{userProfile.bio}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Preferences</h4>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.preferences.smoking && <Badge variant="secondary">Smoking</Badge>}
                      {userProfile.preferences.pets && <Badge variant="secondary">Pets</Badge>}
                      {userProfile.preferences.nightOwl && <Badge variant="secondary">Night Owl</Badge>}
                      <Badge variant="outline">Cleanliness: {userProfile.preferences.cleanliness}/5</Badge>
                      <Badge variant="outline">Social Level: {userProfile.preferences.socialLevel}/5</Badge>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Looking For</h4>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.lookingFor.map((item, index) => (
                        <Badge key={index} variant="outline">{item}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button onClick={() => setShowProfileForm(true)}>Edit Profile</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create Your Profile</CardTitle>
                <CardDescription>Get started with roommate matching</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowProfileForm(true)}>Create Profile</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rooms" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockRoomAvailabilities.map((room) => (
              <Card key={room.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{room.title}</CardTitle>
                  <CardDescription>{room.location.city}, {room.location.state}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold">${room.rent}/month</p>
                    <p className="text-sm text-muted-foreground">{room.description}</p>
                    <div className="flex justify-between text-sm">
                      <span>Available: {room.availableFrom}</span>
                      <span>{room.roommatesNeeded} needed</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {room.amenities.slice(0, 3).map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">{amenity}</Badge>
                      ))}
                    </div>
                    <Button className="w-full">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <div className="space-y-4">
            {userMatches.map((match) => {
              const room = mockRoomAvailabilities.find(r => r.id === match.roomAvailabilityId);
              return (
                <Card key={match.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{room?.title}</CardTitle>
                    <CardDescription>Compatibility: {match.compatibilityScore}%</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">{room?.location.city}, {room?.location.state}</p>
                        <p className="text-sm">${room?.rent}/month</p>
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline">View</Button>
                        <Button>Apply</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <div className="space-y-4">
            {userApplications.map((application) => {
              const room = mockRoomAvailabilities.find(r => r.id === application.roomAvailabilityId);
              return (
                <Card key={application.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{room?.title}</CardTitle>
                    <CardDescription>Status: <Badge variant={application.status === 'pending' ? 'secondary' : application.status === 'approved' ? 'default' : 'destructive'}>{application.status}</Badge></CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">{application.message}</p>
                    <p className="text-xs text-muted-foreground">Applied on {new Date(application.appliedAt).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Roommates;
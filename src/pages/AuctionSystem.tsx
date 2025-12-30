import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gavel, Clock, DollarSign, Users, TrendingUp, Eye, Heart, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
import { mockAuctions, mockBids, mockAuctionRules, mockAuctionAnalytics, mockAuctionNotifications, mockAuctionPayments, mockProperties } from '@/lib/mockData';
import type { Auction, Bid, AuctionRules, AuctionAnalytics, AuctionNotification, AuctionPayment } from '@/types';

const AuctionSystem = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedAuction, setSelectedAuction] = useState<string>('1');
  const [bidAmount, setBidAmount] = useState<string>('');

  const currentAuction = mockAuctions.find(a => a.id === selectedAuction);
  const auctionBids = mockBids.filter(b => b.auctionId === selectedAuction);
  const auctionRules = mockAuctionRules.find(r => r.auctionId === selectedAuction);
  const auctionAnalytics = mockAuctionAnalytics.find(a => a.auctionId === selectedAuction);
  const auctionNotifications = mockAuctionNotifications.filter(n => n.auctionId === selectedAuction);

  const handlePlaceBid = () => {
    const amount = parseFloat(bidAmount);
    if (currentAuction && amount > currentAuction.currentBid) {
      console.log('Bid placed:', amount);
      // In real app, this would submit the bid
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const activeAuctions = mockAuctions.filter(a => a.status === 'active');
  const endedAuctions = mockAuctions.filter(a => a.status === 'ended');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Auction System</h1>
        <p className="text-muted-foreground">Bid on properties, manage auctions, and track your bidding activity</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="active">Active Auctions</TabsTrigger>
          <TabsTrigger value="ended">Ended Auctions</TabsTrigger>
          <TabsTrigger value="bidding">My Bidding</TabsTrigger>
          <TabsTrigger value="selling">My Auctions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeAuctions.map((auction) => {
              const property = mockProperties.find(p => p.id === auction.propertyId);
              const timeRemaining = getTimeRemaining(auction.endDate);
              const isEndingSoon = timeRemaining !== 'Ended' && timeRemaining.includes('h') && parseInt(timeRemaining) <= 24;

              return (
                <Card key={auction.id} className={`relative ${isEndingSoon ? 'border-red-500' : ''}`}>
                  {isEndingSoon && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      Ending Soon
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="capitalize">
                        {auction.auctionType.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span>{auction.watchers}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{auction.title}</CardTitle>
                    <CardDescription>{auction.location.city}, {auction.location.state}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <img
                        src={auction.images[0]}
                        alt={auction.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Bid</p>
                          <p className="text-xl font-bold text-green-600">${auction.currentBid.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Time Left</p>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className={`font-semibold ${isEndingSoon ? 'text-red-600' : ''}`}>
                              {timeRemaining}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Starting: ${auction.startingPrice.toLocaleString()}</span>
                        <span className="text-muted-foreground">{auction.totalBids} bids</span>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          className="flex-1"
                          onClick={() => setSelectedAuction(auction.id)}
                        >
                          <Gavel className="h-4 w-4 mr-1" />
                          Bid Now
                        </Button>
                        <Button variant="outline" size="icon">
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="ended" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {endedAuctions.map((auction) => {
              const property = mockProperties.find(p => p.id === auction.propertyId);

              return (
                <Card key={auction.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Ended</Badge>
                      {auction.winnerId && (
                        <Badge variant="default">Sold</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{auction.title}</CardTitle>
                    <CardDescription>{auction.location.city}, {auction.location.state}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <img
                        src={auction.images[0]}
                        alt={auction.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Final Price</p>
                          <p className="text-xl font-bold text-green-600">
                            ${auction.finalPrice?.toLocaleString() || auction.currentBid.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Bids</p>
                          <p className="text-lg font-semibold">{auction.totalBids}</p>
                        </div>
                      </div>

                      {auction.winnerId && (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Won by Bidder #{auction.winnerId}</span>
                        </div>
                      )}

                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="bidding" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>My Active Bids</CardTitle>
                <CardDescription>Auctions you're currently bidding on</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auctionBids.filter(bid => bid.status === 'winning' || bid.status === 'active').map((bid) => {
                    const auction = mockAuctions.find(a => a.id === bid.auctionId);
                    return (
                      <div key={bid.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>A</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{auction?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Your bid: ${bid.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={bid.status === 'winning' ? 'default' : 'secondary'}>
                          {bid.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bid History</CardTitle>
                <CardDescription>Your complete bidding activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auctionBids.map((bid) => {
                    const auction = mockAuctions.find(a => a.id === bid.auctionId);
                    return (
                      <div key={bid.id} className="flex justify-between items-center py-2 border-b">
                        <div>
                          <p className="font-medium text-sm">{auction?.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(bid.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${bid.amount.toLocaleString()}</p>
                          <Badge variant="outline" className="text-xs">
                            {bid.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bid on Selected Auction */}
          {currentAuction && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Place a Bid</CardTitle>
                <CardDescription>Bid on: {currentAuction.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="bid-amount">Bid Amount ($)</Label>
                    <Input
                      id="bid-amount"
                      type="number"
                      placeholder={`Min: $${(currentAuction.currentBid + currentAuction.bidIncrement).toLocaleString()}`}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="w-full"
                      onClick={handlePlaceBid}
                      disabled={!bidAmount || parseFloat(bidAmount) <= currentAuction.currentBid}
                    >
                      <Gavel className="h-4 w-4 mr-2" />
                      Place Bid
                    </Button>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">Bidding Rules</p>
                      <ul className="text-blue-800 mt-1 space-y-1">
                        <li>• Minimum bid increment: ${currentAuction.bidIncrement.toLocaleString()}</li>
                        <li>• Buyer's premium: {auctionRules?.buyerPremium || 10}%</li>
                        <li>• All bids are binding and cannot be retracted</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="selling" className="mt-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gavel className="h-5 w-5 mr-2" />
                  Create New Auction
                </CardTitle>
                <CardDescription>List a property for auction</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Start New Auction</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Auctions</CardTitle>
                <CardDescription>Properties you've listed for auction</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAuctions.filter(a => a.sellerId === '1').map((auction) => {
                    const property = mockProperties.find(p => p.id === auction.propertyId);
                    return (
                      <div key={auction.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <img
                            src={auction.images[0]}
                            alt={auction.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div>
                            <p className="font-semibold">{auction.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Current bid: ${auction.currentBid.toLocaleString()} • {auction.totalBids} bids
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Ends: {new Date(auction.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">View Bids</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {auctionAnalytics && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Auction Performance
                  </CardTitle>
                  <CardDescription>Key metrics for your auctions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Views</span>
                      <span className="font-semibold">{auctionAnalytics.totalViews.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Unique Watchers</span>
                      <span className="font-semibold">{auctionAnalytics.uniqueWatchers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Bids</span>
                      <span className="font-semibold">{auctionAnalytics.totalBids}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Average Bid</span>
                      <span className="font-semibold">${auctionAnalytics.averageBid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Bid Frequency</span>
                      <span className="font-semibold">{auctionAnalytics.bidFrequency} bids/hour</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>Where your bidders are located</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auctionAnalytics.geographicDistribution.map((region, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">{region.region}</span>
                          <span className="text-sm font-semibold">{region.percentage}%</span>
                        </div>
                        <Progress value={region.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Top Bidders</CardTitle>
              <CardDescription>Most active participants in your auctions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auctionAnalytics?.topBidderActivity.map((bidder, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>B</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Bidder #{bidder.bidderId}</p>
                        <p className="text-sm text-muted-foreground">
                          {bidder.bidCount} bids • Total: ${bidder.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      #{index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuctionSystem;
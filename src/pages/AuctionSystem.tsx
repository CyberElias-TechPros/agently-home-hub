import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Gavel, DollarSign, Clock, Users, TrendingUp, BarChart3, Calendar, AlertTriangle, CheckCircle, XCircle, Play, Pause, Square, Eye, MessageSquare, Share2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { Auction, Bid, AuctionRules, AuctionAnalytics, AuctionNotification, AuctionPayment } from '@/types';

const AuctionSystem = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('browse');
  
  // State for auctions
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [rules, setRules] = useState<AuctionRules[]>([]);
  const [analytics, setAnalytics] = useState<AuctionAnalytics[]>([]);
  const [notifications, setNotifications] = useState<AuctionNotification[]>([]);
  const [payments, setPayments] = useState<AuctionPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [liveAuction, setLiveAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [autoExtend, setAutoExtend] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadAuctionData();
      // Set up live auction monitoring
      const interval = setInterval(() => {
        checkLiveAuctions();
      }, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const loadAuctionData = async () => {
    try {
      setLoading(true);
      const [auctionsData, bidsData, myBidsData, rulesData, analyticsData, notificationsData, paymentsData] = await Promise.all([
        apiService.getAuctions(),
        apiService.getAuctionBids(),
        apiService.getMyAuctionBids(user.id),
        apiService.getAuctionRules(),
        apiService.getAuctionAnalytics(),
        apiService.getAuctionNotifications(user.id),
        apiService.getAuctionPayments(user.id)
      ]);
      
      setAuctions(auctionsData);
      setBids(bidsData);
      setMyBids(myBidsData);
      setRules(rulesData);
      setAnalytics(analyticsData);
      setNotifications(notificationsData);
      setPayments(paymentsData);
    } catch (error) {
      toast({
        title: "Error loading auction data",
        description: "Failed to load auction information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkLiveAuctions = () => {
    const now = new Date();
    const live = auctions.find(a => 
      new Date(a.startDate) <= now && 
      new Date(a.endDate) >= now && 
      a.status === 'active'
    );
    setLiveAuction(live);
  };

  const placeBid = async (auctionId: string, amount: number) => {
    try {
      setLoading(true);
      const bid = await apiService.placeAuctionBid({
        auctionId,
        bidderId: user.id,
        amount,
        timestamp: new Date().toISOString(),
        status: 'pending'
      });
      
      setBids([...bids, bid]);
      setMyBids([...myBids, bid]);
      
      toast({
        title: "Bid Placed",
        description: `Your bid of $${amount.toLocaleString()} has been placed!`,
      });
      
      // Check for auto-extend
      const auction = auctions.find(a => a.id === auctionId) as any;
      if (auction && auction.autoExtend) {
        // Check if bid was placed in the last 5 minutes
        const endTime = new Date(auction.endDate);
        const timeLeft = endTime.getTime() - new Date().getTime();
        if (timeLeft < 300000) { // 5 minutes
          toast({
            title: "Auto-Extend Activated",
            description: "Auction extended by 5 minutes due to late bid.",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Bid Failed",
        description: "Please check your bid amount and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinLiveAuction = (auction: Auction) => {
    setLiveAuction(auction);
    toast({
      title: "Joined Live Auction",
      description: `You're now participating in ${auction.title}`,
    });
  };

  const leaveLiveAuction = () => {
    setLiveAuction(null);
  };

  const getAuctionRules = (auctionId: string) => {
    return rules.find(r => r.auctionId === auctionId);
  };

  const getAuctionAnalytics = (auctionId: string) => {
    return analytics.find(a => a.auctionId === auctionId);
  };

  const getHighestBid = (auctionId: string) => {
    const auctionBids = bids.filter(b => b.auctionId === auctionId);
    return auctionBids.reduce((highest, current) => 
      current.amount > (highest?.amount || 0) ? current : highest, null
    );
  };

  const getTimeLeft = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Auction Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  const filteredAuctions = auctions.filter(auction => 
    (selectedCategory === 'all' || auction.auctionType === selectedCategory) &&
    (auction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     auction.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Auction System</h1>
        <p className="text-muted-foreground">Bid on properties, track auctions, and manage your bids</p>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
            <p className="text-muted-foreground mb-4">Please sign in to participate in auctions.</p>
            <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Live Auction Banner */}
          {liveAuction && (
            <Card className="mb-6 border-2 border-primary/50 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="h-8 w-8 bg-primary rounded-full animate-pulse"></div>
                    <div>
                      <h3 className="font-semibold">Live Auction: {liveAuction.title}</h3>
                      <p className="text-sm text-muted-foreground">Current highest bid: ${getHighestBid(liveAuction.id)?.amount.toLocaleString() || liveAuction.startingPrice}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={leaveLiveAuction}>
                      <Square className="h-4 w-4 mr-2" />
                      Leave
                    </Button>
                    <Button onClick={() => document.getElementById('auction-' + liveAuction.id)?.scrollIntoView()}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search auctions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="english">English Auction</SelectItem>
                  <SelectItem value="dutch">Dutch Auction</SelectItem>
                  <SelectItem value="sealed">Sealed Bid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {activeTab === 'browse' ? `${auctions.length} auctions available` : `${myBids.length} bids placed`}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="browse">Browse Auctions</TabsTrigger>
              <TabsTrigger value="my-bids">My Bids</TabsTrigger>
              <TabsTrigger value="live">Live Auctions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="rules">Auction Rules</TabsTrigger>
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
                ) : filteredAuctions.length > 0 ? (
                  filteredAuctions.map((auction) => {
                    const highestBid = getHighestBid(auction.id);
                    const rules = getAuctionRules(auction.id);
                    const timeLeft = getTimeLeft(auction.endDate);
                    const isLive = new Date(auction.startDate) <= new Date() && new Date(auction.endDate) >= new Date();
                    
                    return (
                      <Card key={auction.id} id={`auction-${auction.id}`}>
                        <CardContent className="p-6">
                          <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                            <img src={auction.images[0]} alt={auction.title} className="w-full h-full object-cover" />
                          </div>
                          
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-lg">{auction.title}</h4>
                              <p className="text-sm text-muted-foreground">{auction.description}</p>
                            </div>
                            {isLive && (
                              <Badge variant="secondary" className="animate-pulse">
                                LIVE
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <span className="text-sm text-muted-foreground">Starting Price</span>
                              <div className="font-semibold">${auction.startingPrice.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Current Bid</span>
                              <div className="font-semibold text-primary">
                                ${highestBid?.amount.toLocaleString() || auction.startingPrice}
                              </div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Bid Increment</span>
                              <div className="font-semibold">${rules?.bidIncrement || auction.bidIncrement}</div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Time Left</span>
                              <div className="font-semibold">{timeLeft}</div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{auction.totalBids} bids</span>
                              <span className="text-sm text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">{auction.watchers} watchers</span>
                            </div>
                            <Badge variant={auction.status === 'active' ? 'default' : 'secondary'}>
                              {auction.status}
                            </Badge>
                          </div>

                          {isLive ? (
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder={`Min: $${highestBid?.amount + (rules?.bidIncrement || auction.bidIncrement)}`}
                                  value={bidAmount}
                                  onChange={(e) => setBidAmount(e.target.value)}
                                  className="flex-1"
                                />
                                <Button 
                                  onClick={() => placeBid(auction.id, parseFloat(bidAmount))}
                                  disabled={loading || !bidAmount || parseFloat(bidAmount) < (highestBid?.amount + (rules?.bidIncrement || auction.bidIncrement) || auction.startingPrice)}
                                >
                                  <Gavel className="h-4 w-4 mr-2" />
                                  Place Bid
                                </Button>
                              </div>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => joinLiveAuction(auction)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Watch
                                </Button>
                                <Button variant="outline" size="sm">
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Chat
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                              <Button variant="outline" size="sm">
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="col-span-full">
                    <CardContent className="py-8 text-center">
                      <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Auctions Found</h3>
                      <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="my-bids" className="mt-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">My Auction Bids</h3>
                  <div className="text-sm text-muted-foreground">
                    Total bids: {myBids.length} • Winning: {myBids.filter(b => b.status === 'winning').length}
                  </div>
                </div>

                {myBids.length > 0 ? (
                  <div className="space-y-4">
                    {myBids.map((bid) => {
                      const auction = auctions.find(a => a.id === bid.auctionId);
                      const highestBid = getHighestBid(bid.auctionId);
                      const isWinning = bid.amount === highestBid?.amount;
                      
                      return (
                        <Card key={bid.id}>
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-lg">{auction?.title}</h4>
                                <p className="text-sm text-muted-foreground">{auction?.description}</p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className="text-sm">Your bid: ${bid.amount.toLocaleString()}</span>
                                  <span className="text-sm text-muted-foreground">•</span>
                                  <span className="text-sm">Status: {bid.status}</span>
                                  {isWinning && (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Winning
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">Placed: {new Date(bid.timestamp).toLocaleDateString()}</div>
                                <div className="text-sm font-medium">Time left: {getTimeLeft(auction?.endDate || '')}</div>
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View Auction
                              </Button>
                              {bid.status === 'winning' && (
                                <Button size="sm">
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Pay Now
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Bids Placed</h3>
                      <p className="text-muted-foreground mb-4">Start bidding on auctions to see your bids here.</p>
                      <Button onClick={() => setActiveTab('browse')}>Browse Auctions</Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="live" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Current Live Auctions</h3>
                
                {auctions.filter(a => 
                  new Date(a.startDate) <= new Date() && 
                  new Date(a.endDate) >= new Date() && 
                  a.status === 'active'
                ).length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {auctions.filter(a => 
                      new Date(a.startDate) <= new Date() && 
                      new Date(a.endDate) >= new Date() && 
                      a.status === 'active'
                    ).map((auction) => {
                      const highestBid = getHighestBid(auction.id);
                      
                      return (
                        <Card key={auction.id}>
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-semibold text-lg">{auction.title}</h4>
                                <p className="text-sm text-muted-foreground">Current bid: ${highestBid?.amount.toLocaleString() || auction.startingPrice}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-red-600">LIVE</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Starting Price</span>
                                <span>${auction.startingPrice.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Reserve Price</span>
                                <span>${auction.reservePrice.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Time Left</span>
                                <span className="font-semibold">{getTimeLeft(auction.endDate)}</span>
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button onClick={() => joinLiveAuction(auction)} className="flex-1">
                                <Play className="h-4 w-4 mr-2" />
                                Join Auction
                              </Button>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                Watch
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Live Auctions</h3>
                      <p className="text-muted-foreground">Check back later for upcoming live auctions.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {analytics.map((analytic) => {
                  const auction = auctions.find(a => a.id === analytic.auctionId);
                  
                  return (
                    <Card key={analytic.auctionId}>
                      <CardHeader>
                        <CardTitle className="text-lg">{auction?.title}</CardTitle>
                        <CardDescription>Auction Performance Analytics</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-700">{analytic.totalViews}</div>
                              <div className="text-sm text-blue-700">Total Views</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-700">{analytic.uniqueWatchers}</div>
                              <div className="text-sm text-green-700">Unique Watchers</div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                              <div className="text-2xl font-bold text-purple-700">{analytic.totalBids}</div>
                              <div className="text-sm text-purple-700">Total Bids</div>
                            </div>
                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                              <div className="text-2xl font-bold text-orange-700">{analytic.bidFrequency.toFixed(1)}</div>
                              <div className="text-sm text-orange-700">Bid Frequency</div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Top Bidders</h4>
                            <div className="space-y-2">
                              {analytic.topBidderActivity.slice(0, 3).map((bidder, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                                  <span className="text-sm">Bidder {index + 1}</span>
                                  <span className="text-sm font-medium">${bidder.totalAmount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Geographic Distribution</h4>
                            <div className="space-y-1">
                              {analytic.geographicDistribution.slice(0, 4).map((region, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span>{region.region}</span>
                                  <span className="font-medium">{region.percentage}%</span>
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
            </TabsContent>

            <TabsContent value="rules" className="mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Auction Rules & Guidelines</h3>
                
                {rules.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {rules.map((rule) => {
                      const auction = auctions.find(a => a.id === rule.auctionId);
                      
                      return (
                        <Card key={rule.auctionId}>
                          <CardHeader>
                            <CardTitle className="text-lg">{auction?.title}</CardTitle>
                            <CardDescription>Auction Rules</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Minimum Bid</span>
                                  <div className="font-medium">${rule.minimumBid}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Bid Increment</span>
                                  <div className="font-medium">${rule.bidIncrement}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Reserve Price</span>
                                  <div className="font-medium">${rule.reservePrice}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Buyer Premium</span>
                                  <div className="font-medium">{rule.buyerPremium}%</div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <input type="checkbox" checked={(rule as any).autoExtend} readOnly />
                                  <span className="text-sm">Auto-extend enabled ({(rule as any).extendTime} minutes)</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input type="checkbox" checked={rule.maxBidsPerUser <= 10} readOnly />
                                  <span className="text-sm">Max bids per user: {rule.maxBidsPerUser}</span>
                                </div>
                              </div>

                              <div className="text-sm">
                                <span className="text-muted-foreground">Payment Terms:</span>
                                <p className="mt-1">{rule.paymentTerms}</p>
                              </div>

                              <div className="text-sm">
                                <span className="text-muted-foreground">Inspection Period:</span>
                                <p className="mt-1">{rule.inspectionPeriod} days</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Rules Available</h3>
                      <p className="text-muted-foreground">Auction rules will be displayed here.</p>
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

export default AuctionSystem;
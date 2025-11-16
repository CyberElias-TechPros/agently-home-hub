import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, AlertCircle } from 'lucide-react';
import { mockMaintenanceRequests, mockProperties } from '@/lib/mockData';

export default function Maintenance() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const statusColors = {
    pending: 'bg-warning',
    in_progress: 'bg-primary',
    resolved: 'bg-success',
    cancelled: 'bg-destructive'
  };

  const priorityColors = {
    low: 'bg-muted',
    medium: 'bg-warning',
    high: 'bg-destructive',
    emergency: 'bg-destructive'
  };

  return (
    <div className="min-h-screen py-8 pb-20 md:pb-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Maintenance Requests</h1>
            <p className="text-muted-foreground">
              Manage and track all your maintenance requests
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Maintenance Request</DialogTitle>
              </DialogHeader>
              <form className="space-y-4">
                <div>
                  <Label htmlFor="property">Property</Label>
                  <Select>
                    <SelectTrigger id="property">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProperties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="appliance">Appliance</SelectItem>
                      <SelectItem value="structural">Structural</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="Brief description of the issue" />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide detailed information about the issue"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Submit Request</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Emergency Notice */}
        <Card className="mb-8 border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold">Emergency Maintenance</p>
                <p className="text-sm text-muted-foreground">
                  For urgent issues requiring immediate attention, please call: <span className="font-semibold">(555) 911-HELP</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <div className="grid gap-4">
          {mockMaintenanceRequests.map((request) => {
            const property = mockProperties.find(p => p.id === request.propertyId);
            if (!property) return null;

            return (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={priorityColors[request.priority]}>
                          {request.priority}
                        </Badge>
                        <Badge className={statusColors[request.status]}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">{request.category}</Badge>
                      </div>
                      <CardTitle className="text-xl mb-1">{request.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{property.title}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{request.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(request.createdAt).toLocaleDateString()}
                      {request.updatedAt !== request.createdAt && (
                        <> • Updated: {new Date(request.updatedAt).toLocaleDateString()}</>
                      )}
                    </div>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {mockMaintenanceRequests.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Maintenance Requests</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't submitted any maintenance requests yet. Click the button above to create your first request.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

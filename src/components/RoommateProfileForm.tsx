import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { RoommateProfile } from '@/types';

interface RoommateProfileFormProps {
  profile?: RoommateProfile;
  onSave: (profileData: {
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
  }) => void;
  onCancel: () => void;
}

const RoommateProfileForm = ({ profile, onSave, onCancel }: RoommateProfileFormProps) => {
  const [formData, setFormData] = useState({
    age: profile?.age || 25,
    occupation: profile?.occupation || '',
    preferences: {
      smoking: profile?.preferences.smoking || false,
      pets: profile?.preferences.pets || false,
      nightOwl: profile?.preferences.nightOwl || false,
      cleanliness: profile?.preferences.cleanliness || 3,
      socialLevel: profile?.preferences.socialLevel || 3,
    },
    bio: profile?.bio || '',
    budget: {
      min: profile?.budget.min || 800,
      max: profile?.budget.max || 1200,
    },
    lookingFor: profile?.lookingFor || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.age < 18 || formData.age > 100) {
      newErrors.age = 'Age must be between 18 and 100';
    }

    if (!formData.occupation.trim()) {
      newErrors.occupation = 'Occupation is required';
    }

    if (formData.budget.min <= 0) {
      newErrors.budgetMin = 'Minimum budget must be greater than 0';
    }

    if (formData.budget.max <= 0) {
      newErrors.budgetMax = 'Maximum budget must be greater than 0';
    }

    if (formData.budget.min >= formData.budget.max) {
      newErrors.budgetRange = 'Maximum budget must be greater than minimum';
    }

    if (formData.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const toggleLookingFor = (item: string) => {
    setFormData(prev => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(item)
        ? prev.lookingFor.filter(i => i !== item)
        : [...prev.lookingFor, item]
    }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-lg sm:text-xl">{profile ? 'Edit' : 'Create'} Roommate Profile</CardTitle>
        <CardDescription className="text-sm">
          Fill out your profile to find compatible roommates
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="age" className="text-sm font-medium">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: Number(e.target.value) }))}
                min="18"
                max="100"
                className={`h-10 ${errors.age ? 'border-red-500' : ''}`}
              />
              {errors.age && <p className="text-xs text-red-500 mt-1">{errors.age}</p>}
            </div>
            <div>
              <Label htmlFor="occupation" className="text-sm font-medium">Occupation</Label>
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                placeholder="e.g. Software Engineer"
                className={`h-10 ${errors.occupation ? 'border-red-500' : ''}`}
              />
              {errors.occupation && <p className="text-xs text-red-500 mt-1">{errors.occupation}</p>}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Budget Range (Monthly)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2">
              <div>
                <Label htmlFor="minBudget" className="text-xs text-muted-foreground">Minimum</Label>
                <Input
                  id="minBudget"
                  type="number"
                  value={formData.budget.min}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    budget: { ...prev.budget, min: Number(e.target.value) }
                  }))}
                  className={`h-10 ${errors.budgetMin ? 'border-red-500' : ''}`}
                  min="0"
                />
                {errors.budgetMin && <p className="text-xs text-red-500 mt-1">{errors.budgetMin}</p>}
              </div>
              <div>
                <Label htmlFor="maxBudget" className="text-xs text-muted-foreground">Maximum</Label>
                <Input
                  id="maxBudget"
                  type="number"
                  value={formData.budget.max}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    budget: { ...prev.budget, max: Number(e.target.value) }
                  }))}
                  className={`h-10 ${errors.budgetMax ? 'border-red-500' : ''}`}
                  min="0"
                />
                {errors.budgetMax && <p className="text-xs text-red-500 mt-1">{errors.budgetMax}</p>}
              </div>
            </div>
            {errors.budgetRange && <p className="text-xs text-red-500 mt-1">{errors.budgetRange}</p>}
          </div>

          <div>
            <Label className="text-sm font-medium">Preferences</Label>
            <div className="space-y-3 sm:space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="smoking"
                    checked={formData.preferences.smoking}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, smoking: checked as boolean }
                      }))
                    }
                  />
                  <Label htmlFor="smoking" className="text-sm">Smoking allowed</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pets"
                    checked={formData.preferences.pets}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, pets: checked as boolean }
                      }))
                    }
                  />
                  <Label htmlFor="pets" className="text-sm">Pets allowed</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="nightOwl"
                    checked={formData.preferences.nightOwl}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, nightOwl: checked as boolean }
                      }))
                    }
                  />
                  <Label htmlFor="nightOwl" className="text-sm">Night owl</Label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Cleanliness Level: {formData.preferences.cleanliness}/5</Label>
                  <Slider
                    value={[formData.preferences.cleanliness]}
                    onValueChange={(value) =>
                      setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, cleanliness: value[0] as 1 | 2 | 3 | 4 | 5 }
                      }))
                    }
                    max={5}
                    min={1}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-sm">Social Level: {formData.preferences.socialLevel}/5</Label>
                  <Slider
                    value={[formData.preferences.socialLevel]}
                    onValueChange={(value) =>
                      setFormData(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, socialLevel: value[0] as 1 | 2 | 3 | 4 | 5 }
                      }))
                    }
                    max={5}
                    min={1}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell potential roommates about yourself..."
              rows={3}
              className={`resize-none ${errors.bio ? 'border-red-500' : ''}`}
            />
            <div className="flex justify-between mt-1">
              {errors.bio && <p className="text-xs text-red-500">{errors.bio}</p>}
              <p className="text-xs text-muted-foreground ml-auto">{formData.bio.length}/500</p>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Looking For</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {['clean', 'quiet', 'social', 'pet-friendly', 'flexible', 'organized', 'fun', 'responsible'].map((item) => (
                <div key={item} className="flex items-center space-x-2">
                  <Checkbox
                    id={item}
                    checked={formData.lookingFor.includes(item)}
                    onCheckedChange={() => toggleLookingFor(item)}
                  />
                  <Label htmlFor={item} className="capitalize text-sm">{item}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 pt-4">
            <Button type="submit" className="flex-1 sm:flex-none h-10">
              {profile ? 'Update' : 'Create'} Profile
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-none h-10">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default RoommateProfileForm;
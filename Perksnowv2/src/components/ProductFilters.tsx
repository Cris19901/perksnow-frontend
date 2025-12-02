import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { X, SlidersHorizontal } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

export interface FilterOptions {
  category: string;
  minPrice: number;
  maxPrice: number;
  sortBy: string;
}

interface ProductFiltersProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  categories: string[];
}

export function ProductFilters({ filters, onFilterChange, categories }: ProductFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleReset = () => {
    const defaultFilters: FilterOptions = {
      category: 'all',
      minPrice: 0,
      maxPrice: 10000,
      sortBy: 'newest',
    };
    setLocalFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Category Filter */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Category</Label>
        <RadioGroup
          value={localFilters.category}
          onValueChange={(value) =>
            setLocalFilters({ ...localFilters, category: value })
          }
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="cursor-pointer">All Categories</Label>
            </div>
            {categories.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <RadioGroupItem value={category} id={category} />
                <Label htmlFor={category} className="cursor-pointer">{category}</Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Price Range Filter */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          Price Range: ${localFilters.minPrice} - ${localFilters.maxPrice}
        </Label>
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-gray-600">Min Price</Label>
            <Slider
              value={[localFilters.minPrice]}
              onValueChange={([value]) =>
                setLocalFilters({ ...localFilters, minPrice: value })
              }
              max={localFilters.maxPrice}
              step={10}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-sm text-gray-600">Max Price</Label>
            <Slider
              value={[localFilters.maxPrice]}
              onValueChange={([value]) =>
                setLocalFilters({ ...localFilters, maxPrice: value })
              }
              min={localFilters.minPrice}
              max={10000}
              step={10}
              className="mt-2"
            />
          </div>
        </div>
      </div>

      {/* Sort By Filter */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Sort By</Label>
        <RadioGroup
          value={localFilters.sortBy}
          onValueChange={(value) =>
            setLocalFilters({ ...localFilters, sortBy: value })
          }
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="newest" id="newest" />
              <Label htmlFor="newest" className="cursor-pointer">Newest First</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="price-low" id="price-low" />
              <Label htmlFor="price-low" className="cursor-pointer">Price: Low to High</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="price-high" id="price-high" />
              <Label htmlFor="price-high" className="cursor-pointer">Price: High to Low</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="popular" id="popular" />
              <Label htmlFor="popular" className="cursor-pointer">Most Popular</Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleReset}
        >
          <X className="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
          onClick={handleApply}
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Filters */}
      <Card className="hidden lg:block sticky top-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FilterContent />
        </CardContent>
      </Card>

      {/* Mobile Filters (Sheet) */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="lg:hidden gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <FilterContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

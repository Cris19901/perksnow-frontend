import { Header } from '../Header';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Upload, X } from 'lucide-react';
import { useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';

const categories = [
  'Electronics',
  'Fashion',
  'Home & Living',
  'Beauty',
  'Sports',
  'Books',
  'Food',
  'Toys',
  'Automotive',
  'Other',
];

interface CreateProductPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function CreateProductPage({ onNavigate, onCartClick, cartItemsCount }: CreateProductPageProps) {
  const [images, setImages] = useState<string[]>([]);
  const { currency } = useCurrency();

  const handleImageUpload = () => {
    // Mock image upload - in production, use file input
    const mockImages = [
      'https://images.unsplash.com/photo-1656360088744-f99fc89d56d4?w=400',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    ];
    setImages([...images, mockImages[images.length % 2]]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
      />

      <div className="max-w-[900px] mx-auto px-4 py-4 sm:py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl mb-2">List a Product</h1>
          <p className="text-gray-600">Create a new product listing to sell on the marketplace</p>
        </div>

        <form className="space-y-6">
          {/* Product Images */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>Add up to 5 images of your product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
                
                {images.length < 5 && (
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-600 flex flex-col items-center justify-center gap-2 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-500">Upload</span>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Product Title *</Label>
                <Input id="title" placeholder="e.g., Wireless Bluetooth Headphones" required />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your product in detail..."
                  rows={5}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat.toLowerCase()}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="condition">Condition *</Label>
                  <Select>
                    <SelectTrigger id="condition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="like-new">Like New</SelectItem>
                      <SelectItem value="used">Used - Good</SelectItem>
                      <SelectItem value="refurbished">Refurbished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price ({currency.symbol}) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Price in USD will be converted</p>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    placeholder="1"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sku">SKU (Optional)</Label>
                <Input id="sku" placeholder="e.g., WH-1000XM4" />
              </div>
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input id="weight" type="number" step="0.01" placeholder="0.5" />
                </div>

                <div>
                  <Label htmlFor="shipping">Shipping Cost ({currency.symbol})</Label>
                  <Input id="shipping" type="number" step="0.01" placeholder="5.00" />
                </div>

                <div>
                  <Label htmlFor="processing">Processing Time</Label>
                  <Select>
                    <SelectTrigger id="processing">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1-2 days</SelectItem>
                      <SelectItem value="3">3-5 days</SelectItem>
                      <SelectItem value="7">1 week</SelectItem>
                      <SelectItem value="14">2 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onNavigate?.('marketplace')}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-pink-600"
              onClick={(e) => {
                e.preventDefault();
                // Handle form submission
                alert('Product created successfully!');
                onNavigate?.('marketplace');
              }}
            >
              List Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

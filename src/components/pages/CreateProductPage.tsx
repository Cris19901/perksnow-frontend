import { Header } from '../Header';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MobileBottomNav } from '../MobileBottomNav';

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

interface ProductFormData {
  title: string;
  description: string;
  category: string;
  condition: string;
  price: string;
  quantity: string;
  sku: string;
  weight: string;
  shipping: string;
  processing: string;
}

export function CreateProductPage({ onNavigate, onCartClick, cartItemsCount }: CreateProductPageProps) {
  const { user } = useAuth();
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { currency } = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    category: '',
    condition: '',
    price: '',
    quantity: '1',
    sku: '',
    weight: '',
    shipping: '',
    processing: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!user?.id) {
      setError('Please log in to upload images');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        if (images.length >= 5) break;

        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Please upload only image files');
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Image size must be less than 5MB');
          continue;
        }

        console.log('🔍 CreateProduct: Processing image:', file.name);

        // Try to upload to Supabase Storage first
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        try {
          const { data, error: uploadError } = await supabase.storage
            .from('products')
            .upload(fileName, file);

          if (uploadError) {
            console.error('❌ Storage upload error:', uploadError);
            // Fallback: Use data URL for preview
            const reader = new FileReader();
            reader.onload = () => {
              setImages(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
            continue;
          }

          // Get public URL
          const { data: publicUrl } = supabase.storage
            .from('products')
            .getPublicUrl(data.path);

          console.log('✅ CreateProduct: Image uploaded:', publicUrl.publicUrl);
          setImages(prev => [...prev, publicUrl.publicUrl]);
        } catch (storageErr) {
          console.error('❌ Storage exception, using data URL:', storageErr);
          // Fallback: Use data URL
          const reader = new FileReader();
          reader.onload = () => {
            setImages(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        }
      }
    } catch (err: any) {
      console.error('❌ Image upload failed:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user?.id) {
      setError('Please log in to create a product');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a product title');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please enter a product description');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Please enter a valid price');
      return;
    }

    setSubmitting(true);

    try {
      console.log('🔍 CreateProduct: Creating product...');

      const productData = {
        seller_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        currency: currency.code,
        category: formData.category || null,
        image_url: images[0] || null,
        images: images.length > 0 ? images : null,
        stock_quantity: parseInt(formData.quantity) || 1,
        is_available: true,
      };

      console.log('🔍 CreateProduct: Product data:', productData);

      const { data, error: insertError } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ CreateProduct: Error creating product:', insertError);
        throw insertError;
      }

      console.log('✅ CreateProduct: Product created successfully:', data);
      setSuccess(true);

      // Navigate to marketplace after short delay
      setTimeout(() => {
        onNavigate?.('marketplace');
      }, 1500);

    } catch (err: any) {
      console.error('❌ CreateProduct: Product creation failed:', err);
      setError(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  // Show not logged in state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={onNavigate}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
        />
        <div className="flex items-center justify-center h-[calc(100vh-200px)] px-4">
          <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md text-center">
            <p className="text-gray-600 mb-4">Please log in to create a product listing</p>
            <Button onClick={() => onNavigate?.('login')} className="bg-purple-600 hover:bg-purple-700">
              Log In
            </Button>
          </div>
        </div>
        <MobileBottomNav currentPage="create" onNavigate={onNavigate} />
      </div>
    );
  }

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={onNavigate}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
        />
        <div className="flex items-center justify-center h-[calc(100vh-200px)] px-4">
          <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Product Listed!</h2>
            <p className="text-gray-600 mb-4">Your product has been successfully listed on the marketplace.</p>
            <p className="text-sm text-gray-500">Redirecting to marketplace...</p>
          </div>
        </div>
        <MobileBottomNav currentPage="create" onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
      />

      <div className="max-w-[900px] mx-auto px-4 py-4 sm:py-6 pb-28 md:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl mb-2">List a Product</h1>
          <p className="text-gray-600">Create a new product listing to sell on the marketplace</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Images */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>Add up to 5 images of your product</CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-600 flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-500">{uploading ? 'Uploading...' : 'Upload'}</span>
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
                <Input
                  id="title"
                  placeholder="e.g., Wireless Bluetooth Headphones"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your product in detail..."
                  rows={5}
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => handleSelectChange('category', v)}>
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
                  <Select value={formData.condition} onValueChange={(v) => handleSelectChange('condition', v)}>
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
                    value={formData.price}
                    onChange={handleInputChange}
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
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sku">SKU (Optional)</Label>
                <Input
                  id="sku"
                  placeholder="e.g., WH-1000XM4"
                  value={formData.sku}
                  onChange={handleInputChange}
                />
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
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    placeholder="0.5"
                    value={formData.weight}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="shipping">Shipping Cost ({currency.symbol})</Label>
                  <Input
                    id="shipping"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={formData.shipping}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="processing">Processing Time</Label>
                  <Select value={formData.processing} onValueChange={(v) => handleSelectChange('processing', v)}>
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
            <Button type="button" variant="outline" onClick={() => onNavigate?.('marketplace')} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-pink-600"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'List Product'
              )}
            </Button>
          </div>
        </form>
      </div>

      <MobileBottomNav currentPage="create" onNavigate={onNavigate} />
    </div>
  );
}

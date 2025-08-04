import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { FileUpload } from "@/components/ui/file-upload";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { StyleSelector, STYLE_OPTIONS } from "@/components/ui/style-selector";
import { LandingHero } from "@/components/ui/landing-hero";
import { ArrowLeft, ArrowRight, CreditCard, Lightbulb, Download, Upload, Wand2 } from "lucide-react";

const STEPS = ["Upload Photo", "Choose Style", "Customize", "Payment"];
const SHIPPING_COST = 4.99;

interface OrderData {
  photoUrl: string;
  style: string;
  engravingText?: string;
  fontStyle: string;
  color: string;
  quality: string;
  totalAmount: number;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [orderData, setOrderData] = useState<Partial<OrderData>>({
    fontStyle: 'arial',
    color: 'black',
    quality: 'standard',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser, isLoading: authLoading, isSupabaseAuth } = useAuth();

  // Smooth scroll navigation function
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Calculate offset to account for fixed header
      const headerHeight = 80; // Adjust based on header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Ensure page starts at top and prevent unwanted scrolling
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Prevent automatic scrolling when step changes
  useEffect(() => {
    // Use setTimeout to let the DOM update first
    const timer = setTimeout(() => {
      if (currentStep > 1) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [currentStep]);

  // Get or create database user from auth user
  const { data: user } = useQuery({
    queryKey: ['/api/users', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return null;
      
      try {
        const response = await apiRequest('GET', `/api/users/${authUser.id}`);
        return await response.json();
      } catch {
        // Create new user if not found
        const response = await apiRequest('POST', '/api/users', { 
          anonymousId: authUser.id,
          email: authUser.email 
        });
        return await response.json();
      }
    },
    enabled: !!authUser?.id && !authLoading,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderData) => {
      const response = await apiRequest('POST', '/api/orders', {
        ...data,
        userId: user?.id,
        totalAmount: data.totalAmount.toString(), // Convert number to string for decimal field
        specifications: {
          dimensions: STYLE_OPTIONS.find(s => s.id === data.style)?.dimensions,
          material: STYLE_OPTIONS.find(s => s.id === data.style)?.material,
        },
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
  });

  const calculateTotal = () => {
    if (!orderData.style) return 0;
    const stylePrice = STYLE_OPTIONS.find(s => s.id === orderData.style)?.price || 0;
    const qualityUpcharge = orderData.quality === 'high' ? 5.00 : 0;
    return stylePrice + qualityUpcharge + SHIPPING_COST;
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return !!orderData.photoUrl;
      case 2:
        return !!orderData.style;
      case 3:
        return true; // All customization fields are optional
      case 4:
        return false; // Payment handled separately
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (currentStep < 4 && canProceedToNextStep()) {
      setCurrentStep(currentStep + 1);
      
      // Prevent automatic scrolling when advancing to next step
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      
      // Prevent automatic scrolling when going back to previous step
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const handleProceedToPayment = async () => {
    if (!user || !orderData.style || !orderData.photoUrl) {
      toast({
        title: "Missing required information",
        description: "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const total = calculateTotal();
      const order = await createOrderMutation.mutateAsync({
        ...orderData as OrderData,
        totalAmount: total,
      });

      // Redirect to summary with order ID for STL generation
      setLocation(`/summary?orderId=${order.id}`);
    } catch (error: any) {
      toast({
        title: "Error creating order",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <LandingHero onGetStarted={() => {
              // Scroll to the file upload section
              const fileUploadSection = document.querySelector('.file-upload-section');
              if (fileUploadSection) {
                fileUploadSection.scrollIntoView({ behavior: 'smooth' });
              }
            }} />

            <div className="file-upload-section">
              <FileUpload
                onFileUploaded={(fileData) => {
                  setOrderData({ ...orderData, photoUrl: fileData.url });
                  // Note: Do not automatically advance to next step after file upload
                  // User should manually click "Continue" to proceed to step 2
                }}
                className="mb-8"
              />
            </div>

            <Card className="bg-blue-50 mb-8">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
                  Tips for Best Results
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-0.5">✓</span>
                    Use high-contrast photos with clear subject separation from background
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-0.5">✓</span>
                    Ensure good lighting and avoid shadows on the main subject
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2 mt-0.5">✓</span>
                    Front-facing or profile views work best for recognition
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your 3D Style</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Select the type of 3D object you'd like to create from your photo. 
                Each style has different dimensions and use cases.
              </p>
            </div>

            <StyleSelector
              selectedStyle={orderData.style || ''}
              onStyleSelect={(styleId) => {
                setOrderData({ ...orderData, style: styleId });
                // Prevent any scrolling when a style is selected
                setTimeout(() => {
                  const currentScrollPos = window.scrollY;
                  window.scrollTo(0, currentScrollPos);
                }, 0);
              }}
            />
          </div>
        );

      case 3:
        return (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Customize Your Design</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Add personalized text engraving and make final adjustments to your 3D model before printing.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Preview Section */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">3D Preview</h3>
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 aspect-square flex items-center justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1618336753974-aae8e04506aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400" 
                    alt="3D model preview" 
                    className="max-w-full max-h-full rounded-lg shadow-lg"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Interactive 3D preview • Drag to rotate</p>
              </div>

              {/* Customization Options */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Customization Options</h3>
                
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="engraving">Engraving Text (Optional)</Label>
                    <Input
                      id="engraving"
                      placeholder="e.g., Max • (555) 123-4567"
                      maxLength={50}
                      value={orderData.engravingText || ''}
                      onChange={(e) => setOrderData({ ...orderData, engravingText: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Up to 50 characters</p>
                  </div>

                  <div>
                    <Label>Font Style</Label>
                    <Select value={orderData.fontStyle} onValueChange={(value) => setOrderData({ ...orderData, fontStyle: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arial">Arial (Clean & Modern)</SelectItem>
                        <SelectItem value="times">Times (Classic)</SelectItem>
                        <SelectItem value="script">Script (Elegant)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Color</Label>
                    <div className="flex space-x-3 mt-2">
                      {[
                        { id: 'black', color: 'bg-gray-800' },
                        { id: 'white', color: 'bg-white border-2 border-gray-300' },
                        { id: 'blue', color: 'bg-blue-600' },
                        { id: 'red', color: 'bg-red-600' },
                        { id: 'green', color: 'bg-green-600' },
                      ].map((colorOption) => (
                        <div
                          key={colorOption.id}
                          className={`w-8 h-8 rounded-full cursor-pointer ${colorOption.color} ${
                            orderData.color === colorOption.id ? 'ring-2 ring-primary ring-offset-2' : ''
                          }`}
                          onClick={() => setOrderData({ ...orderData, color: colorOption.id })}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Selected: {orderData.color}</p>
                  </div>

                  <div>
                    <Label>Print Quality</Label>
                    <RadioGroup value={orderData.quality} onValueChange={(value) => setOrderData({ ...orderData, quality: value })}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="standard" id="standard" />
                        <Label htmlFor="standard">Standard (0.2mm) - $0.00</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="high" />
                        <Label htmlFor="high">High Quality (0.1mm) - +$5.00</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <Card className="bg-gray-50 mb-8">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">
                      {STYLE_OPTIONS.find(s => s.id === orderData.style)?.name} 
                      ({STYLE_OPTIONS.find(s => s.id === orderData.style)?.material})
                    </span>
                    <span className="font-medium">${STYLE_OPTIONS.find(s => s.id === orderData.style)?.price}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Print Quality: {orderData.quality === 'high' ? 'High' : 'Standard'}</span>
                    <span className="font-medium">${orderData.quality === 'high' ? '5.00' : '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">${SHIPPING_COST}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-semibold text-primary">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">Formily</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <button 
                onClick={() => scrollToSection('how-it-works')} 
                className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
              >
                How it Works
              </button>
              <button 
                onClick={() => scrollToSection('gallery')} 
                className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
              >
                Gallery
              </button>
              <button 
                onClick={() => scrollToSection('pricing')} 
                className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
              >
                Pricing
              </button>
              <Link href="/orders" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">Orders</Link>
            </nav>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {authUser ? (
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Signed in {isSupabaseAuth ? '(Supabase)' : '(Local)'}
                  </span>
                ) : (
                  <span>Signing in...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProgressIndicator 
          currentStep={currentStep} 
          totalSteps={4} 
          steps={STEPS} 
        />

        <Card className="shadow-lg">
          <CardContent className="p-8">
            {renderStepContent()}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              <Button
                variant="ghost"
                onClick={handlePreviousStep}
                disabled={currentStep === 1}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep < 3 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={!canProceedToNextStep()}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : currentStep === 3 ? (
                <Button
                  onClick={handleProceedToPayment}
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? (
                    "Creating Order..."
                  ) : (
                    <>
                      Proceed to Payment
                      <CreditCard className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Static Landing Sections - Always Available for Navigation */}
        <div className="mt-16">
          {/* How It Works */}
          <div id="how-it-works" className="grid md:grid-cols-4 gap-6 mb-16">
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">1. Upload Photo</h3>
                <p className="text-sm text-gray-600">Choose any photo of an object, person, or pet</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">2. Customize Style</h3>
                <p className="text-sm text-gray-600">Choose trophy, sculpture, or keepsake format with engraving</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">3. Secure Payment</h3>
                <p className="text-sm text-gray-600">Pay safely with Stripe-powered checkout</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Download className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">4. Download STL</h3>
                <p className="text-sm text-gray-600">Get your 3D-printable file within 24 hours</p>
              </CardContent>
            </Card>
          </div>

          {/* Gallery */}
          <div id="gallery" className="text-center mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">See What Others Have Created</h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <img 
                  src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                  alt="Custom hunting trophy example" 
                  className="rounded-lg shadow-lg mb-3 w-full h-48 object-cover"
                />
                <h3 className="font-semibold text-gray-900 mb-1">Hunting Trophy</h3>
                <p className="text-sm text-gray-600">Detailed busts from hunt photos</p>
              </div>
              <div className="text-center">
                <img 
                  src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                  alt="Custom pet sculpture example" 
                  className="rounded-lg shadow-lg mb-3 w-full h-48 object-cover"
                />
                <h3 className="font-semibold text-gray-900 mb-1">Pet Sculpture</h3>
                <p className="text-sm text-gray-600">Memorial keepsakes of beloved pets</p>
              </div>
              <div className="text-center">
                <img 
                  src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
                  alt="Custom family keepsake example" 
                  className="rounded-lg shadow-lg mb-3 w-full h-48 object-cover"
                />
                <h3 className="font-semibold text-gray-900 mb-1">3D Keepsake</h3>
                <p className="text-sm text-gray-600">Custom figurines from family moments</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div id="pricing" className="text-center mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Simple, Transparent Pricing</h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="text-center border-2 border-gray-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">3D Keepsake</h3>
                  <div className="text-3xl font-bold text-primary mb-2">$22.99</div>
                  <p className="text-sm text-gray-600 mb-4">Perfect for family moments</p>
                  <ul className="text-left text-sm text-gray-600 space-y-1">
                    <li>• 3" x 2" x 2" dimensions</li>
                    <li>• PLA plastic material</li>
                    <li>• Custom text engraving</li>
                    <li>• STL file download</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="text-center border-2 border-primary bg-primary/5">
                <CardContent className="p-6">
                  <div className="text-xs font-medium text-primary mb-2">MOST POPULAR</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Pet Sculpture</h3>
                  <div className="text-3xl font-bold text-primary mb-2">$28.99</div>
                  <p className="text-sm text-gray-600 mb-4">Memorial keepsakes for pets</p>
                  <ul className="text-left text-sm text-gray-600 space-y-1">
                    <li>• 4" x 3" x 3" dimensions</li>
                    <li>• PETG plastic material</li>
                    <li>• Custom text engraving</li>
                    <li>• Premium finish quality</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="text-center border-2 border-gray-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Hunting Trophy</h3>
                  <div className="text-3xl font-bold text-primary mb-2">$34.99</div>
                  <p className="text-sm text-gray-600 mb-4">Detailed trophy busts</p>
                  <ul className="text-left text-sm text-gray-600 space-y-1">
                    <li>• 6" x 4" x 4" dimensions</li>
                    <li>• PLA+ plastic material</li>
                    <li>• Professional detailing</li>
                    <li>• Largest size option</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            <p className="text-sm text-gray-500 mt-4">All prices include STL file generation. Shipping costs calculated at checkout.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Formily</h3>
              <p className="text-gray-600 text-sm">Transform your photos into custom 3D printed keepsakes with our advanced AI technology.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <button 
                    onClick={() => scrollToSection('how-it-works')} 
                    className="hover:text-primary transition-colors cursor-pointer"
                  >
                    How it Works
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('gallery')} 
                    className="hover:text-primary transition-colors cursor-pointer"
                  >
                    Gallery
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('pricing')} 
                    className="hover:text-primary transition-colors cursor-pointer"
                  >
                    Pricing
                  </button>
                </li>
                <li><a href="#" className="hover:text-primary">Materials</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-primary">Help Center</a></li>
                <li><a href="#" className="hover:text-primary">Contact Us</a></li>
                <li><a href="#" className="hover:text-primary">Shipping Info</a></li>
                <li><a href="#" className="hover:text-primary">Returns</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-primary">About</a></li>
                <li><a href="#" className="hover:text-primary">Privacy</a></li>
                <li><a href="#" className="hover:text-primary">Terms</a></li>
                <li><a href="#" className="hover:text-primary">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2024 Formily. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

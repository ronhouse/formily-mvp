import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Upload, Wand2, CreditCard, Download } from "lucide-react";

interface LandingHeroProps {
  onGetStarted: () => void;
}

export function LandingHero({ onGetStarted }: LandingHeroProps) {
  return (
    <div className="text-center mb-16">
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Turn Your Photos Into<br />
          <span className="text-primary">Custom 3D Models</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Upload any photo and transform it into a personalized keychain, pet tag, or decorative plaque. 
          Professional 3D printing quality, delivered as downloadable STL files.
        </p>
        <Button 
          size="lg" 
          className="text-lg px-8 py-4"
          onClick={onGetStarted}
        >
          Get Started
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>

      {/* How It Works */}
      <div className="grid md:grid-cols-4 gap-6 mb-12">
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
            <p className="text-sm text-gray-600">Pick keychain, tag, or plaque format with engraving</p>
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

      {/* Sample Gallery */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">See What Others Have Created</h2>
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <img 
            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
            alt="Custom keychain example" 
            className="rounded-lg shadow-md"
          />
          <img 
            src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
            alt="Custom pet tag example" 
            className="rounded-lg shadow-md"
          />
          <img 
            src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
            alt="Custom plaque example" 
            className="rounded-lg shadow-md"
          />
        </div>
      </div>
    </div>
  );
}
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Upload, Wand2, CreditCard, Download } from "lucide-react";
import heroImage from "@/assets/images/Photo_to_3D_hero_banner_b2aa2e35.png";
import huntingTrophyImage from "@/assets/images/3D_printed_hunting_trophy_f8d62b75.png";
import petMemorialImage from "@/assets/images/3D_printed_pet_memorial_c1dadd77.png";
import familyKeepsakeImage from "@/assets/images/3D_printed_family_keepsake_b65fdf6c.png";

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
          Upload any photo and transform it into a hunting trophy, pet sculpture, or 3D keepsake. 
          Professional 3D printing quality, delivered as downloadable STL files.
        </p>
        
        {/* Hero Process Image */}
        <div className="mb-8">
          <img 
            src={heroImage}
            alt="Photo to 3D printing transformation process" 
            className="rounded-2xl shadow-xl mx-auto max-w-4xl w-full"
          />
        </div>
        
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

      {/* Sample Gallery */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">See What Others Have Created</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <img 
              src={huntingTrophyImage}
              alt="Custom hunting trophy example" 
              className="rounded-lg shadow-lg mb-3 w-full h-48 object-cover"
            />
            <h3 className="font-semibold text-gray-900 mb-1">Hunting Trophy</h3>
            <p className="text-sm text-gray-600">Detailed busts from hunt photos</p>
          </div>
          <div className="text-center">
            <img 
              src={petMemorialImage}
              alt="Custom pet sculpture example" 
              className="rounded-lg shadow-lg mb-3 w-full h-48 object-cover"
            />
            <h3 className="font-semibold text-gray-900 mb-1">Pet Sculpture</h3>
            <p className="text-sm text-gray-600">Memorial keepsakes of beloved pets</p>
          </div>
          <div className="text-center">
            <img 
              src={familyKeepsakeImage}
              alt="Custom family keepsake example" 
              className="rounded-lg shadow-lg mb-3 w-full h-48 object-cover"
            />
            <h3 className="font-semibold text-gray-900 mb-1">3D Keepsake</h3>
            <p className="text-sm text-gray-600">Custom figurines from family moments</p>
          </div>
        </div>
      </div>
    </div>
  );
}
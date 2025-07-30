import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Lock, Shield, CheckCircle } from "lucide-react";
import { Order } from "@shared/schema";
import { STYLE_OPTIONS } from "@/components/ui/style-selector";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder_replace_with_real_stripe_public_key';
const stripePromise = loadStripe(stripePublicKey);

interface CheckoutFormProps {
  order: Order;
  onPaymentSuccess: () => void;
}

const CheckoutForm = ({ order, onPaymentSuccess }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState({
    address: "",
    city: "",
    zip: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const generateSTLMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', '/api/generate-stl', { orderId });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (!billingAddress.address.trim() || !billingAddress.city.trim() || !billingAddress.zip.trim()) {
      toast({
        title: "Billing address required",
        description: "Please complete your billing address",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/orders',
          receipt_email: email,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Payment succeeded
        toast({
          title: "Payment Successful",
          description: "Your order has been confirmed!",
        });
        
        // Start STL generation
        generateSTLMutation.mutate(order.id);
        onPaymentSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Card Information</Label>
        <div className="border border-gray-300 rounded-lg p-4 mt-2">
          <PaymentElement />
        </div>
      </div>

      <div>
        <Label>Billing Address</Label>
        <div className="space-y-2 mt-2">
          <Input
            placeholder="123 Main St"
            value={billingAddress.address}
            onChange={(e) => setBillingAddress({ ...billingAddress, address: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="City"
              value={billingAddress.city}
              onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
              required
            />
            <Input
              placeholder="ZIP"
              value={billingAddress.zip}
              onChange={(e) => setBillingAddress({ ...billingAddress, zip: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Total</span>
          <span className="text-primary">${parseFloat(order.totalAmount).toFixed(2)}</span>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full py-4 text-lg font-semibold"
        disabled={!stripe || isProcessing}
      >
        <Lock className="w-4 h-4 mr-2" />
        {isProcessing ? "Processing..." : "Complete Order"}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Your payment information is secure and encrypted
      </p>
    </form>
  );
};

interface OrderConfirmationModalProps {
  isOpen: boolean;
  order: Order;
  onClose: () => void;
}

const OrderConfirmationModal = ({ isOpen, order, onClose }: OrderConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
        <p className="text-gray-600 mb-6">
          Your custom 3D model is being generated. You'll receive your STL file and tracking information via email within 24 hours.
        </p>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Order #:</span>
              <span className="font-medium">FM-{order.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Style:</span>
              <span className="font-medium">{order.style.charAt(0).toUpperCase() + order.style.slice(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium text-primary">${parseFloat(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Link href="/orders" className="flex-1">
            <Button className="w-full">
              View Order History
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full" onClick={onClose}>
              Create New Order
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [clientSecret, setClientSecret] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  // Get order ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['/api/orders', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('No order ID provided');
      const response = await apiRequest('GET', `/api/orders/${orderId}`);
      return await response.json() as Order;
    },
    enabled: !!orderId,
  });

  // Create payment intent when order is loaded
  useEffect(() => {
    if (order && !clientSecret) {
      apiRequest('POST', '/api/create-payment-intent', { 
        amount: parseFloat(order.totalAmount),
        orderId: order.id 
      })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          toast({
            title: "Payment setup failed",
            description: error.message || "Unable to initialize payment",
            variant: "destructive",
          });
        });
    }
  }, [order, clientSecret, toast]);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Order</h1>
            <p className="text-gray-600 mb-6">No order ID was provided.</p>
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">The requested order could not be found.</p>
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up payment...</p>
        </div>
      </div>
    );
  }

  const styleData = STYLE_OPTIONS.find(s => s.id === order.style);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/">
                <h1 className="text-2xl font-bold text-primary cursor-pointer">Formily</h1>
              </Link>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">How it Works</a>
              <a href="#" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">Gallery</a>
              <a href="#" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">Pricing</a>
              <Link href="/orders" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">Orders</Link>
            </nav>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Secure checkout
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-gray-500 hover:text-gray-700 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Order</h1>
          <p className="text-gray-600 mt-2">Review your order details and complete payment to start 3D printing your custom item.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Review */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Uploaded Photo */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <img 
                      src={order.photoUrl} 
                      alt="Order preview" 
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Custom {styleData?.name}</p>
                    <p className="text-sm text-gray-600">{styleData?.material} • {order.color}</p>
                    {order.engravingText && (
                      <p className="text-sm text-gray-600">Engraving: "{order.engravingText}"</p>
                    )}
                  </div>
                </div>

                {/* Specifications */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Dimensions</p>
                      <p className="font-medium">{styleData?.dimensions}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Quality</p>
                      <p className="font-medium">{order.quality === 'high' ? 'High (0.1mm)' : 'Standard (0.2mm)'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Est. Delivery</p>
                      <p className="font-medium">5-7 business days</p>
                    </div>
                    <div>
                      <p className="text-gray-600">File Format</p>
                      <p className="font-medium">STL Download</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm 
                    order={order} 
                    onPaymentSuccess={() => setShowConfirmation(true)}
                  />
                </Elements>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex justify-center items-center mt-8 text-sm text-gray-500">
          <Shield className="w-4 h-4 mr-1" />
          Secured by Stripe
        </div>
      </main>

      {/* Order Confirmation Modal */}
      <OrderConfirmationModal
        isOpen={showConfirmation}
        order={order}
        onClose={() => setShowConfirmation(false)}
      />
    </div>
  );
}

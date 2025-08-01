import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { STYLE_OPTIONS } from "@/components/ui/style-selector";
import { CheckCircle, ArrowLeft, CreditCard } from "lucide-react";

export default function Summary() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Get order ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['/api/orders', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');
      const response = await apiRequest('GET', `/api/orders/${orderId}`);
      return await response.json();
    },
    enabled: !!orderId,
  });

  // Create checkout session mutation
  const createCheckoutSessionMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', '/api/create-checkout-session', { orderId });
      return await response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    },
  });

  const handleProceedToPayment = async () => {
    if (!orderId) return;
    
    setIsProcessingPayment(true);
    createCheckoutSessionMutation.mutate(orderId);
  };

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Order</h2>
            <p className="text-gray-600 mb-4">No order ID was provided.</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-4">The order could not be loaded.</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedStyle = STYLE_OPTIONS.find(s => s.id === order.model_type || s.id === order.style);
  const isPaid = order.status === 'paid' || order.status === 'completed';

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
              <Link href="/" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
                Create New
              </Link>
              <Link href="/orders" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
                My Orders
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 rounded-full p-3">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Summary
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Review your order details and proceed to secure payment
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Preview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Photo</h3>
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 aspect-square flex items-center justify-center">
                {order.image_url || order.photoUrl ? (
                  <img 
                    src={order.image_url || order.photoUrl} 
                    alt="Uploaded photo" 
                    className="max-w-full max-h-full rounded-lg shadow-lg object-cover"
                  />
                ) : (
                  <div className="text-gray-500 text-center">
                    <p>Photo preview not available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Order Details</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Model Type</span>
                  <p className="text-gray-900 font-medium">
                    {selectedStyle?.name} ({selectedStyle?.material})
                  </p>
                  <p className="text-sm text-gray-600">{selectedStyle?.dimensions}</p>
                </div>

                {(order.engraving_text || order.engravingText) && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Engraving Text</span>
                    <p className="text-gray-900 font-medium">"{order.engraving_text || order.engravingText}"</p>
                    <p className="text-sm text-gray-600">Font: {order.font_style || order.fontStyle || 'arial'}</p>
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium text-gray-500">Customization</span>
                  <p className="text-gray-900">
                    Color: <span className="capitalize">{order.color}</span>
                  </p>
                  <p className="text-gray-900">
                    Quality: <span className="capitalize">{order.quality}</span>
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-500">Order Status</span>
                  <div className="flex items-center mt-1">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      order.status === 'completed' ? 'bg-green-500' : 
                      order.status === 'paid' ? 'bg-blue-500' :
                      order.status === 'processing' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-gray-900 capitalize">{order.status}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <span className="text-sm font-medium text-gray-500">Total Amount</span>
                  <p className="text-xl font-bold text-primary">${order.total_amount || order.totalAmount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Section */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-4">
                Secure Payment
              </h3>
              
              {!isPaid ? (
                <div>
                  <p className="text-gray-600 mb-6">
                    Complete your order with secure payment processing powered by Stripe.
                    Your 3D model will be generated immediately after payment.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      onClick={handleProceedToPayment}
                      size="lg"
                      className="bg-primary hover:bg-primary/90"
                      disabled={isProcessingPayment}
                    >
                      {isProcessingPayment ? (
                        <div className="animate-spin w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        <CreditCard className="w-5 h-5 mr-2" />
                      )}
                      {isProcessingPayment ? 'Processing...' : 'Proceed to Payment'}
                    </Button>
                    
                    <Link href="/">
                      <Button variant="outline" size="lg">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Customize
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="mt-6 text-sm text-gray-500">
                    <p>🔒 Secure payment processing • SSL encrypted • No card data stored</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-green-600 font-medium mb-4">✅ Payment completed successfully!</p>
                  <p className="text-gray-600 mb-6">
                    Your 3D model is being generated and will be ready for download shortly.
                  </p>
                  <Link href="/orders">
                    <Button size="lg">
                      View Order Status
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-center mt-8 space-x-4">
          <Link href="/orders">
            <Button variant="outline">
              View All Orders
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="outline">
              Create Another
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { STYLE_OPTIONS } from "@/components/ui/style-selector";
import { CheckCircle, Download, ExternalLink, ArrowLeft } from "lucide-react";

export default function Confirmation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [paymentProcessed, setPaymentProcessed] = useState(false);

  // Get session ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  // Process payment success mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', '/api/payment-success', { sessionId });
      return await response.json();
    },
    onSuccess: (data) => {
      setPaymentProcessed(true);
      toast({
        title: "Payment Successful!",
        description: "Your order has been confirmed and STL generation has started.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Processing Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    },
  });

  // Process payment when component mounts
  useEffect(() => {
    if (sessionId && !paymentProcessed) {
      processPaymentMutation.mutate(sessionId);
    }
  }, [sessionId, paymentProcessed]);

  // Fetch order details after payment processing
  const { data: order, isLoading } = useQuery({
    queryKey: ['/api/orders', processPaymentMutation.data?.orderId],
    queryFn: async () => {
      if (!processPaymentMutation.data?.orderId) return null;
      const response = await apiRequest('GET', `/api/orders/${processPaymentMutation.data.orderId}`);
      return await response.json();
    },
    enabled: !!processPaymentMutation.data?.orderId,
    refetchInterval: 3000, // Poll every 3 seconds for STL generation updates
  });

  const handleDownloadSTL = () => {
    if (order?.stl_file_url) {
      const link = document.createElement('a');
      link.href = order.stl_file_url;
      link.download = `formily-${order.model_type}-${order.id.slice(-8)}.stl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Your STL file download has begun!",
      });
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Session</h2>
            <p className="text-gray-600 mb-4">No payment session was found.</p>
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

  if (processPaymentMutation.isPending || (paymentProcessed && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your payment and generating your 3D model...</p>
        </div>
      </div>
    );
  }

  if (processPaymentMutation.isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Payment Error</h2>
            <p className="text-gray-600 mb-4">There was an issue processing your payment.</p>
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

  const selectedStyle = STYLE_OPTIONS.find(s => s.id === order?.model_type);
  const isSTLReady = order?.stl_file_url;

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
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your order has been confirmed and your 3D model is being generated.
          </p>
        </div>

        {order && (
          <>
            {/* Order Summary */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Order Confirmation</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order Number</p>
                    <p className="font-medium">FM-{order.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Paid</p>
                    <p className="font-medium text-green-600">${order.total_amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Model Type</p>
                    <p className="font-medium">{selectedStyle?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <p className="font-medium capitalize">{order.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* STL Download Section */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {isSTLReady ? "Your 3D Model is Ready!" : "Generating Your 3D Model..."}
                  </h3>
                  
                  {isSTLReady ? (
                    <div>
                      <p className="text-gray-600 mb-6">
                        Your custom 3D printable file is ready for download!
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button 
                          onClick={handleDownloadSTL}
                          size="lg"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Download className="w-5 h-5 mr-2" />
                          Download STL File
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="lg"
                          onClick={() => window.open('https://www.printables.com/', '_blank')}
                        >
                          <ExternalLink className="w-5 h-5 mr-2" />
                          Find 3D Printing Services
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600 mb-4">
                        We're processing your photo and creating your custom 3D model. 
                        This usually takes just a few moments...
                      </p>
                      <p className="text-sm text-gray-500">
                        You can also check your order status anytime in your order history.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-center mt-8 space-x-4">
          <Link href="/orders">
            <Button variant="outline">
              View Order History
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="outline">
              Create Another Model
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
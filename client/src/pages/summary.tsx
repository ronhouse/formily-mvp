import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { STYLE_OPTIONS } from "@/components/ui/style-selector";
import { Download, CheckCircle, ArrowLeft, ExternalLink } from "lucide-react";

export default function Summary() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  // Get order ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');

  // Fetch order details
  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/orders', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');
      const response = await apiRequest('GET', `/api/orders/${orderId}`);
      return await response.json();
    },
    enabled: !!orderId,
    refetchInterval: 2000, // Poll every 2 seconds until component unmounts or query succeeds
  });

  // Trigger STL generation when component mounts
  useEffect(() => {
    const generateSTL = async () => {
      if (!orderId || !authUser?.id) return;
      
      try {
        await apiRequest('POST', '/api/generate-stl', {
          orderId: orderId,
          userId: authUser.id,
        });
        
        toast({
          title: "STL Generation Started",
          description: "Your 3D model is being created...",
        });
        
        // Start polling for updates
        refetch();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to start STL generation",
          variant: "destructive",
        });
      }
    };

    generateSTL();
  }, [orderId, authUser?.id, refetch, toast]);

  const handleDownloadSTL = () => {
    if (order?.stlFileUrl) {
      // In a real app, this would trigger a download
      // For demo purposes, we'll show a toast
      toast({
        title: "Download Started",
        description: "Your STL file download has begun!",
      });
      
      // Simulate file download
      const link = document.createElement('a');
      link.href = order.stlFileUrl;
      link.download = `formily-${order.style}-${Date.now()}.stl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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

  const selectedStyle = STYLE_OPTIONS.find(s => s.id === order.style);
  const isSTLReady = order.status === 'completed' && order.stlFileUrl;

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
            {isSTLReady ? "Your 3D Model is Ready!" : "Processing Your 3D Model..."}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isSTLReady 
              ? "Your custom 3D printable file has been generated and is ready for download."
              : "We're creating your custom 3D model. This usually takes just a few moments."
            }
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Preview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Photo</h3>
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 aspect-square flex items-center justify-center">
                {order.photoUrl ? (
                  <img 
                    src={order.photoUrl} 
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

                {order.engravingText && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Engraving Text</span>
                    <p className="text-gray-900 font-medium">"{order.engravingText}"</p>
                    <p className="text-sm text-gray-600">Font: {order.fontStyle}</p>
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
                      order.status === 'processing' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-gray-900 capitalize">{order.status}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <span className="text-sm font-medium text-gray-500">Total Amount</span>
                  <p className="text-xl font-bold text-primary">${order.totalAmount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* STL Download Section */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-4">
                {isSTLReady ? "Download Your STL File" : "STL Generation in Progress"}
              </h3>
              
              {isSTLReady ? (
                <div>
                  <p className="text-gray-600 mb-6">
                    Your 3D printable file is ready! Download it and take it to any 3D printing service 
                    or print it yourself if you have a 3D printer.
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
                  
                  <div className="mt-6 text-sm text-gray-500">
                    <p className="mb-2">
                      <strong>File:</strong> {order.stlFileUrl?.split('/').pop()}
                    </p>
                    <p>Compatible with all standard 3D printers and printing services</p>
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
                    Status: <span className="capitalize font-medium">{order.status}</span>
                  </p>
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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm text-gray-500">
            Need help with 3D printing? Check out our{" "}
            <a href="#" className="text-primary hover:underline">printing guide</a> or{" "}
            <a href="#" className="text-primary hover:underline">contact support</a>.
          </p>
        </div>
      </footer>
    </div>
  );
}
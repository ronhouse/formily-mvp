import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { Order } from "@shared/schema";

export default function OrderHistory() {
  const { user: authUser, isLoading: authLoading, isSupabaseAuth } = useAuth();
  
  // Get database user from auth user
  const { data: user } = useQuery({
    queryKey: ['/api/users', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return null;
      const response = await apiRequest('GET', `/api/users/${authUser.id}`);
      return await response.json();
    },
    enabled: !!authUser?.id && !authLoading,
  });

  // Get orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/orders', 'user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest('GET', `/api/orders/user/${user.id}`);
      return await response.json() as Order[];
    },
    enabled: !!user?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
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
              <Link href="/">
                <h1 className="text-2xl font-bold text-primary cursor-pointer">Formily</h1>
              </Link>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">How it Works</a>
              <a href="#" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">Gallery</a>
              <a href="#" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">Pricing</a>
              <span className="text-primary px-3 py-2 text-sm font-medium">Orders</span>
            </nav>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {authUser ? (
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Signed in
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
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-gray-500 hover:text-gray-700 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600 mt-2">View and manage your 3D printing orders</p>
        </div>

        {!orders || orders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m5 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-600 mb-6">Create your first custom 3D model to get started</p>
              <Link href="/">
                <Button>Start Creating</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Order #{order.id.slice(-8).toUpperCase()}</CardTitle>
                      <p className="text-sm text-gray-600">Placed on {formatDate(order.createdAt)}</p>
                    </div>
                    <Badge className={getStatusColor(order.status || 'pending')}>
                      {order.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : 'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Order Preview */}
                    <div className="md:col-span-1">
                      <img 
                        src={order.photoUrl} 
                        alt="Order preview" 
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>

                    {/* Order Details */}
                    <div className="md:col-span-1">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {order.style ? (order.style.charAt(0).toUpperCase() + order.style.slice(1)) : 'Unknown Style'}
                      </h4>
                      {order.engravingText && (
                        <p className="text-sm text-gray-600 mb-1">
                          Engraving: "{order.engravingText}"
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mb-1">
                        Quality: {order.quality === 'high' ? 'High' : 'Standard'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Color: {order.color || 'Black'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-1 flex flex-col justify-between">
                      <div className="text-right mb-4">
                        <p className="text-2xl font-bold text-primary">
                          ${parseFloat(order.totalAmount).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        {order.stlFileUrl && (
                          <a 
                            href={order.stlFileUrl} 
                            download={`formily-${order.style || 'model'}-${order.id.slice(-8)}.stl`}
                          >
                            <Button className="w-full" size="sm">
                              <Download className="w-4 h-4 mr-2" />
                              Download STL
                            </Button>
                          </a>
                        )}
                        
                        <Button variant="outline" className="w-full" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>

                  {order.status === 'processing' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Your 3D model is being generated. You'll receive an email with download instructions when it's ready.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

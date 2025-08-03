import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Download, Printer, RefreshCw, AlertCircle, RotateCcw, XCircle, CheckCircle, Trash2, Settings } from 'lucide-react';

interface Order {
  id: string;
  user_id: string;
  status: string;
  image_url: string;
  model_type: string;
  engraving_text?: string;
  font_style?: string;
  color?: string;
  quality?: string;
  total_amount: number;
  stripe_payment_intent_id?: string;
  stl_file_url?: string | null;
  print_dispatched?: boolean;
  specifications?: any;
  created_at: string;
  updated_at: string;
}

interface PrintDispatchResponse {
  success: boolean;
  message: string;
  orderId: string;
  printPartner?: {
    webhook_url: string;
    status: number;
    dispatched_at: string;
  };
  orderDetails?: {
    product_type: string;
    customer_email: string;
    stl_file_url: string;
  };
  error?: {
    type: string;
    details: string;
    webhook_url: string;
  };
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispatchingOrders, setDispatchingOrders] = useState<Set<string>>(new Set());
  const [regeneratingOrders, setRegeneratingOrders] = useState<Set<string>>(new Set());
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [autoDispatch, setAutoDispatch] = useState(false);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const { toast } = useToast();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/orders');
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }
      
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendToPrinter = async (orderId: string) => {
    setDispatchingOrders(prev => new Set(prev).add(orderId));
    
    try {
      const response = await fetch(`/api/send-to-printer/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: PrintDispatchResponse = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Order ${orderId} dispatched to print partner`,
        });
        
        // Update the order in local state
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, print_dispatched: true }
            : order
        ));
      } else {
        throw new Error(data.message || 'Failed to dispatch order');
      }
    } catch (err: any) {
      console.error('Error dispatching order:', err);
      toast({
        title: "Dispatch Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDispatchingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleRegenerateSTL = async (orderId: string) => {
    setRegeneratingOrders(prev => new Set(prev).add(orderId));
    
    // Optimistically update UI
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'processing' }
        : order
    ));
    
    try {
      const response = await fetch(`/api/generate-stl/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "STL Regenerated",
          description: `New STL file generated for order ${orderId}`,
        });
        
        // Update the order with new STL data
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                status: 'completed',
                stl_file_url: data.stlFileUrl 
              }
            : order
        ));
      } else {
        throw new Error(data.message || 'Failed to regenerate STL');
      }
    } catch (err: any) {
      console.error('Error regenerating STL:', err);
      toast({
        title: "Regeneration Failed",
        description: err.message,
        variant: "destructive",
      });
      
      // Revert optimistic update
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'failed' }
          : order
      ));
    } finally {
      setRegeneratingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleMarkAsFailed = async (orderId: string) => {
    setUpdatingOrders(prev => new Set(prev).add(orderId));
    
    // Optimistically update UI
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'failed', stl_file_url: null }
        : order
    ));
    
    try {
      const response = await fetch(`/api/orders/${orderId}/fail`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Order Failed",
          description: `Order ${orderId} marked as failed`,
        });
      } else {
        throw new Error(data.message || 'Failed to mark order as failed');
      }
    } catch (err: any) {
      console.error('Error marking order as failed:', err);
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
      
      // Revert optimistic update - refetch to get current state
      fetchOrders();
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleForceComplete = async (orderId: string) => {
    setUpdatingOrders(prev => new Set(prev).add(orderId));
    
    // Optimistically update UI
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'completed' }
        : order
    ));
    
    try {
      const response = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Order Completed",
          description: `Order ${orderId} force completed`,
        });
      } else {
        throw new Error(data.message || 'Failed to force complete order');
      }
    } catch (err: any) {
      console.error('Error force completing order:', err);
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
      
      // Revert optimistic update - refetch to get current state
      fetchOrders();
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatProductType = (modelType: string) => {
    switch (modelType) {
      case 'hunting_trophy':
        return 'Hunting Trophy';
      case 'pet_sculpture':
        return 'Pet Sculpture';
      case 'keepsake_3d':
        return '3D Keepsake';
      default:
        return modelType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const handleCleanupSTL = async () => {
    setCleanupInProgress(true);
    
    try {
      const response = await fetch('/api/cleanup-stl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Cleanup Complete",
          description: `Cleaned up ${data.deletedCount} old STL files`,
        });
      } else {
        throw new Error(data.message || 'Failed to cleanup STL files');
      }
    } catch (err: any) {
      console.error('Error cleaning up STL files:', err);
      toast({
        title: "Cleanup Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCleanupInProgress(false);
    }
  };

  const handleAutoDispatchToggle = async (enabled: boolean) => {
    setAutoDispatch(enabled);
    
    try {
      const response = await fetch('/api/admin/auto-dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: enabled ? "Auto Dispatch Enabled" : "Auto Dispatch Disabled",
          description: enabled 
            ? "New completed orders will be automatically dispatched" 
            : "Auto dispatch has been turned off",
        });
      } else {
        // Revert toggle on failure
        setAutoDispatch(!enabled);
        throw new Error(data.message || 'Failed to update auto dispatch setting');
      }
    } catch (err: any) {
      console.error('Error updating auto dispatch:', err);
      setAutoDispatch(!enabled); // Revert toggle
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchOrders();
    
    // Fetch current auto dispatch setting
    fetch('/api/admin/auto-dispatch')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAutoDispatch(data.enabled);
        }
      })
      .catch(err => console.error('Error fetching auto dispatch setting:', err));
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-lg">Loading orders...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center text-destructive">
              <AlertCircle className="h-8 w-8 mr-2" />
              <div>
                <h3 className="font-semibold">Error Loading Orders</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button 
              onClick={fetchOrders} 
              className="w-full mt-4"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Formily Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage orders, STL files, and printer dispatch
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-dispatch"
              checked={autoDispatch}
              onCheckedChange={handleAutoDispatchToggle}
            />
            <Label htmlFor="auto-dispatch" className="text-sm font-medium">
              Auto Dispatch
            </Label>
          </div>
          <Button 
            onClick={handleCleanupSTL} 
            variant="outline"
            disabled={cleanupInProgress}
          >
            {cleanupInProgress ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {cleanupInProgress ? 'Cleaning...' : 'Cleanup STL'}
          </Button>
          <Button onClick={fetchOrders} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold">No Orders Found</h3>
              <p className="text-muted-foreground">
                Orders will appear here once customers place them
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Order ID</th>
                    <th className="text-left p-3 font-semibold">Product Type</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Amount</th>
                    <th className="text-left p-3 font-semibold">STL File</th>
                    <th className="text-left p-3 font-semibold">Admin Actions</th>
                    <th className="text-left p-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-mono text-sm">
                          {order.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatProductType(order.model_type)}
                          </span>
                          {order.engraving_text && (
                            <span className="text-xs text-muted-foreground">
                              "{order.engraving_text}"
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="font-medium">
                          ${Number(order.total_amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3">
                        {order.stl_file_url ? (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <a 
                              href={order.stl_file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              STL
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No file
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {/* Send to Printer Button */}
                          {order.status === 'completed' && 
                           order.stl_file_url && 
                           !order.print_dispatched && (
                            <Button
                              size="sm"
                              onClick={() => handleSendToPrinter(order.id)}
                              disabled={dispatchingOrders.has(order.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1"
                            >
                              {dispatchingOrders.has(order.id) ? (
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Printer className="h-3 w-3 mr-1" />
                              )}
                              {dispatchingOrders.has(order.id) ? 'Sending...' : 'Print'}
                            </Button>
                          )}

                          {/* Print Dispatched Badge */}
                          {order.print_dispatched && (
                            <Badge variant="secondary" className="text-xs">
                              Dispatched
                            </Badge>
                          )}

                          {/* Regenerate STL Button */}
                          {(order.status === 'completed' || order.status === 'failed') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={regeneratingOrders.has(order.id)}
                                  className="text-xs px-2 py-1"
                                >
                                  {regeneratingOrders.has(order.id) ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                  )}
                                  {regeneratingOrders.has(order.id) ? 'Regenerating...' : 'Regenerate'}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Regenerate STL File</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will reprocess the image and generate a new STL file for order {order.id.substring(0, 8)}...
                                    The existing STL file will be replaced.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRegenerateSTL(order.id)}>
                                    Regenerate STL
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {/* Mark as Failed Button */}
                          {order.status !== 'failed' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={updatingOrders.has(order.id)}
                                  className="text-xs px-2 py-1 text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Fail
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Mark Order as Failed</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will mark order {order.id.substring(0, 8)}... as failed and remove any STL file.
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleMarkAsFailed(order.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Mark as Failed
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {/* Force Complete Button */}
                          {order.status !== 'completed' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={updatingOrders.has(order.id)}
                                  className="text-xs px-2 py-1 text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Complete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Force Complete Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will manually mark order {order.id.substring(0, 8)}... as completed.
                                    Use this only if the order should be considered complete.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleForceComplete(order.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Force Complete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
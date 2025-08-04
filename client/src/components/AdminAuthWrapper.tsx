import { useState, useEffect, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';

interface AdminAuthWrapperProps {
  children: ReactNode;
}

export function AdminAuthWrapper({ children }: AdminAuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Check authentication on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('admin_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
    setAuthLoading(false);
  }, []);

  const handleLogin = async () => {
    setAuthError('');
    
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('admin_authenticated', 'true');
        setPassword('');
      } else {
        setAuthError('Invalid password');
      }
    } catch (error) {
      setAuthError('Authentication failed');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_authenticated');
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl">Admin Access</CardTitle>
            <p className="text-gray-600">Enter password to access admin dashboard</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            {authError && (
              <p className="text-sm text-red-600">{authError}</p>
            )}
            <Button 
              onClick={handleLogin} 
              className="w-full"
              disabled={!password.trim()}
            >
              Access Admin Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pass logout function to children via context or props
  return (
    <div>
      {/* Add logout button at the top */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-end">
        <Button onClick={handleLogout} variant="outline" size="sm">
          <Lock className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
      {children}
    </div>
  );
}
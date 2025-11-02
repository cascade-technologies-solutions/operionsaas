import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Settings2, 
  Globe, 
  Shield, 
  Database,
  Bell,
  Mail,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

interface SystemSettings {
  timezone: string;
  currency: string;
  defaultLanguage: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  systemMaintenance: boolean;
  autoApproveFactories: boolean;
  maxFactoriesPerAdmin: number;
  sessionTimeout: number;
}

export default function SuperAdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    timezone: 'UTC',
    currency: 'USD',
    defaultLanguage: 'en',
    emailNotifications: true,
    smsNotifications: false,
    systemMaintenance: false,
    autoApproveFactories: false,
    maxFactoriesPerAdmin: 5,
    sessionTimeout: 30,
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Layout title="System Settings">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">System Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configure global system settings and preferences
          </p>
        </div>

        {/* General Settings */}
        <Card className="shadow-md p-3 sm:p-4 md:p-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
              General Settings
            </CardTitle>
            <CardDescription className="text-sm">
              Configure basic system preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="timezone" className="text-sm sm:text-base">Default Timezone</Label>
                <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                  <SelectTrigger className="mt-1 text-sm sm:text-base min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="EST">Eastern Standard Time</SelectItem>
                    <SelectItem value="PST">Pacific Standard Time</SelectItem>
                    <SelectItem value="GMT">Greenwich Mean Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="currency" className="text-sm sm:text-base">Default Currency</Label>
                <Select value={settings.currency} onValueChange={(value) => updateSetting('currency', value)}>
                  <SelectTrigger className="mt-1 text-sm sm:text-base min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-md p-3 sm:p-4 md:p-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              Security Settings
            </CardTitle>
            <CardDescription className="text-sm">
              Configure security and access control settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex-1">
                <Label className="text-sm sm:text-base">Auto-approve Factory Registrations</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Automatically approve new factory registration requests
                </p>
              </div>
              <Switch
                checked={settings.autoApproveFactories}
                onCheckedChange={(checked) => updateSetting('autoApproveFactories', checked)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="maxFactories" className="text-sm sm:text-base">Max Factories per Admin</Label>
                <Input
                  id="maxFactories"
                  type="number"
                  value={settings.maxFactoriesPerAdmin}
                  onChange={(e) => updateSetting('maxFactoriesPerAdmin', parseInt(e.target.value))}
                  className="mt-1 text-sm sm:text-base min-h-[44px]"
                />
              </div>
              <div>
                <Label htmlFor="sessionTimeout" className="text-sm sm:text-base">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                  className="mt-1 text-sm sm:text-base min-h-[44px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="shadow-md p-3 sm:p-4 md:p-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription className="text-sm">
              Configure system-wide notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex-1">
                <Label className="text-sm sm:text-base">Email Notifications</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Send email notifications for important events
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex-1">
                <Label className="text-sm sm:text-base">SMS Notifications</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Send SMS notifications for critical alerts
                </p>
              </div>
              <Switch
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Maintenance */}
        <Card className="shadow-md p-3 sm:p-4 md:p-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Database className="h-4 w-4 sm:h-5 sm:w-5" />
              System Maintenance
            </CardTitle>
            <CardDescription className="text-sm">
              System maintenance and operational settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex-1">
                <Label className="text-sm sm:text-base">Maintenance Mode</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Enable system maintenance mode
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.systemMaintenance}
                  onCheckedChange={(checked) => updateSetting('systemMaintenance', checked)}
                />
                {settings.systemMaintenance && (
                  <Badge variant="destructive" className="text-xs">Maintenance Active</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-gradient-primary hover:shadow-glow w-full sm:w-auto min-h-[44px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
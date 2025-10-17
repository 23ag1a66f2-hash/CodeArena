import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ui/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { 
  User, 
  Bell, 
  Palette, 
  Code, 
  Lock, 
  Globe,
  Monitor,
  Moon,
  Sun,
  ArrowLeft
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    contests: true,
    assignments: true,
    announcements: true,
  });

  const [codeSettings, setCodeSettings] = useState({
    language: "javascript",
    theme: "vs-dark",
    fontSize: "14",
    tabSize: "2",
    wordWrap: true,
    autoComplete: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showEmail: false,
    showStats: true,
    allowMessages: true,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Settings updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveSettings = (type: string, settings: any) => {
    updateSettingsMutation.mutate({ type, settings });
  };

  if (!user) return null;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <Button
        variant="ghost"
        className="mb-4 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and settings</p>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="account">Account</TabsTrigger>
          {/* <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="editor">Code Editor</TabsTrigger> */}
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                Update your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue={user.firstName || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue={user.lastName || ""} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user.email || ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" placeholder="Tell us about yourself..." />
              </div>

              <Separator />
              
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Change your account password
                  </p>
                  <Button
                    variant="link"
                    className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-0 h-auto"
                    onClick={() => setLocation('/forgot-password?from=settings')}
                  >
                    Change password?
                  </Button>
                </div>
              </div>
              
              {/* <div className="space-y-2">
                <Label>Account Type</Label>
                <div className="text-sm text-muted-foreground">
                  Current role: <span className="font-medium capitalize">{user.role || 'Student'}</span>
                </div>
              </div> */}

              <Button onClick={() => handleSaveSettings('account', {})}>
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

{/*Notifications settings*/}
        {/* <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.email}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, email: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in browser
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.push}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, push: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Contest Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications about upcoming contests
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.contests}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, contests: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Assignment Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Reminders about assignment deadlines
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.assignments}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, assignments: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Announcements</Label>
                    <p className="text-sm text-muted-foreground">
                      Important announcements from instructors
                    </p>
                  </div>
                  <Switch 
                    checked={notifications.announcements}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, announcements: checked }))
                    }
                  />
                </div>
              </div>

              <Button onClick={() => handleSaveSettings('notifications', notifications)}>
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent> */}

{/*Theme settings*/}
        {/* <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose your preferred color theme
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div
                      className={`border rounded-lg p-3 cursor-pointer ${
                        theme === 'light' ? 'border-primary' : ''
                      }`}
                      onClick={() => setTheme('light')}
                    >
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        <span className="text-sm">Light</span>
                      </div>
                    </div>
                    <div
                      className={`border rounded-lg p-3 cursor-pointer ${
                        theme === 'dark' ? 'border-primary' : ''
                      }`}
                      onClick={() => setTheme('dark')}
                    >
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        <span className="text-sm">Dark</span>
                      </div>
                    </div>
                    <div
                      className={`border rounded-lg p-3 cursor-pointer ${
                        theme === 'system' ? 'border-primary' : ''
                      }`}
                      onClick={() => setTheme('system')}
                    >
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        <span className="text-sm">System</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">EST</SelectItem>
                      <SelectItem value="pst">PST</SelectItem>
                      <SelectItem value="cet">CET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={() => handleSaveSettings('appearance', { theme })}>
                Save Appearance Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent> */}

{/*Code editor settings*/}
        {/* <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Code Editor Settings
              </CardTitle>
              <CardDescription>
                Customize your coding environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Select 
                    value={codeSettings.language}
                    onValueChange={(value) => 
                      setCodeSettings(prev => ({ ...prev, language: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                      <SelectItem value="c">C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Editor Theme</Label>
                  <Select 
                    value={codeSettings.theme}
                    onValueChange={(value) => 
                      setCodeSettings(prev => ({ ...prev, theme: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vs-dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="hc-black">High Contrast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select 
                    value={codeSettings.fontSize}
                    onValueChange={(value) => 
                      setCodeSettings(prev => ({ ...prev, fontSize: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12px</SelectItem>
                      <SelectItem value="14">14px</SelectItem>
                      <SelectItem value="16">16px</SelectItem>
                      <SelectItem value="18">18px</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tab Size</Label>
                  <Select 
                    value={codeSettings.tabSize}
                    onValueChange={(value) => 
                      setCodeSettings(prev => ({ ...prev, tabSize: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 spaces</SelectItem>
                      <SelectItem value="4">4 spaces</SelectItem>
                      <SelectItem value="8">8 spaces</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Word Wrap</Label>
                    <p className="text-sm text-muted-foreground">
                      Wrap long lines in the editor
                    </p>
                  </div>
                  <Switch 
                    checked={codeSettings.wordWrap}
                    onCheckedChange={(checked) => 
                      setCodeSettings(prev => ({ ...prev, wordWrap: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Complete</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable code completion suggestions
                    </p>
                  </div>
                  <Switch 
                    checked={codeSettings.autoComplete}
                    onCheckedChange={(checked) => 
                      setCodeSettings(prev => ({ ...prev, autoComplete: checked }))
                    }
                  />
                </div>
              </div>

              <Button onClick={() => handleSaveSettings('editor', codeSettings)}>
                Save Editor Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent> */}

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control your privacy and data sharing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Public Profile</Label>
                    <p className="text-sm text-muted-foreground">
                      Make your profile visible to other users
                    </p>
                  </div>
                  <Switch 
                    checked={privacy.profileVisible}
                    onCheckedChange={(checked) => 
                      setPrivacy(prev => ({ ...prev, profileVisible: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your email address on your profile
                    </p>
                  </div>
                  <Switch 
                    checked={privacy.showEmail}
                    onCheckedChange={(checked) => 
                      setPrivacy(prev => ({ ...prev, showEmail: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Statistics</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your coding statistics publicly
                    </p>
                  </div>
                  <Switch 
                    checked={privacy.showStats}
                    onCheckedChange={(checked) => 
                      setPrivacy(prev => ({ ...prev, showStats: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow other users to send you messages
                    </p>
                  </div>
                  <Switch 
                    checked={privacy.allowMessages}
                    onCheckedChange={(checked) => 
                      setPrivacy(prev => ({ ...prev, allowMessages: checked }))
                    }
                  />
                </div>
              </div> */}

              {/* <Separator /> */}

              <div className="space-y-4">
                <div>
                  {/* <Label className="text-base">Data Management</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your personal data and account
                  </p> */}
                  <div className="flex gap-2">
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </div>
              </div>

              {/* <Button onClick={() => handleSaveSettings('privacy', privacy)}>
                Save Privacy Settings
              </Button> */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
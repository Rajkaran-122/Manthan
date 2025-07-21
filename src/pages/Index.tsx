import { useState, useEffect } from 'react';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  serverTimestamp, 
  addDoc 
} from '@/lib/mock-firebase';
import { performTriage, VulnerabilityProfile, TriageResult } from '@/lib/gemini';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Users, 
  VolumeX, 
  MapPin, 
  AlertTriangle, 
  Heart,
  Eye,
  UserX,
  MessageSquare,
  CheckCircle,
  X,
  ArrowLeft
} from 'lucide-react';

type Screen = 'auth' | 'onboarding' | 'survivor' | 'rescuer' | 'calm';

interface MockUser {
  uid: string;
  isAnonymous: boolean;
}

interface SOSSignal {
  id: string;
  userId: string;
  message: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  profile: VulnerabilityProfile;
  triage: TriageResult;
  timestamp: Date | string;
  priority: number;
}

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [profile, setProfile] = useState<VulnerabilityProfile>({
    sensoryImpaired: false,
    nonVerbal: false,
    mobilityImpaired: false,
    medicalConditions: ''
  });
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [sosSignals, setSOSSignals] = useState<SOSSignal[]>([]);
  const [sendingSOS, setSendingSOS] = useState(false);
  const { toast } = useToast();

  // Authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        
        // Check if user has existing profile
        const profileDoc = await getDoc(doc(null, 'artifacts/sanctuary-mesh/users', user.uid, 'profile/data'));
        
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as unknown as VulnerabilityProfile);
          setCurrentScreen('survivor');
          setIsNewUser(false);
        } else {
          setCurrentScreen('onboarding');
          setIsNewUser(true);
        }
      } else {
        setCurrentScreen('auth');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to SOS signals for rescuer dashboard
  useEffect(() => {
    if (currentScreen === 'rescuer') {
      const unsubscribe = onSnapshot(
        collection(null, 'artifacts/sanctuary-mesh/public/data/sos_signals'),
        (snapshot) => {
          const signals: SOSSignal[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as unknown as {
              userId: string;
              message: string;
              location?: { latitude: number; longitude: number };
              profile: VulnerabilityProfile;
              triage: TriageResult;
              timestamp: Date | string;
            };
            const priority = (data.triage.p_score * 0.7) + (data.triage.v_score * 0.3);
            signals.push({
              id: doc.id,
              ...data,
              triage: data.triage as TriageResult,
              priority
            } as SOSSignal);
          });
          
          // Sort by priority (highest first)
          signals.sort((a, b) => b.priority - a.priority);
          setSOSSignals(signals);
        }
      );

      return () => unsubscribe();
    }
  }, [currentScreen]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInAnonymously();
      toast({
        title: "Secure Connection Established",
        description: "You are now connected to the Sanctuary Mesh network."
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to establish secure connection. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await setDoc(doc(null, 'artifacts/sanctuary-mesh/users', user.uid, 'profile/data'), profile as unknown as Record<string, unknown>);
      toast({
        title: "Profile Saved",
        description: "Your vulnerability profile has been securely stored."
      });
      setCurrentScreen('survivor');
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save profile. Please try again.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleSendSOS = async () => {
    if (!user) return;
    
    setSendingSOS(true);
    
    try {
      // Get location
      const getLocation = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });
      };

      let location = undefined;
      try {
        const position = await getLocation();
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      } catch (error) {
        console.warn('Location access denied or failed');
      }

      // Perform AI triage
      const triage = await performTriage(emergencyMessage, profile);
      
      // Send SOS signal to public collection
      await addDoc(collection(null, 'artifacts/sanctuary-mesh/public/data/sos_signals'), {
        userId: user.uid,
        message: emergencyMessage,
        location,
        profile,
        triage,
        timestamp: serverTimestamp()
      });

      toast({
        title: "SOS Signal Sent",
        description: "Your emergency signal has been broadcast to rescue teams."
      });

      setCurrentScreen('calm');
      
    } catch (error) {
      toast({
        title: "SOS Failed",
        description: "Unable to send emergency signal. Please try again.",
        variant: "destructive"
      });
    }
    
    setSendingSOS(false);
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 70) return 'border-sanctuary-emergency bg-sanctuary-emergency/10';
    if (priority >= 50) return 'border-sanctuary-warning bg-sanctuary-warning/10';
    return 'border-sanctuary-calm bg-sanctuary-calm/10';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 70) return 'CRITICAL';
    if (priority >= 50) return 'HIGH';
    return 'MEDIUM';
  };

  // Authentication Screen
  if (currentScreen === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <Shield className="w-12 h-12 text-primary animate-glow" />
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Sanctuary Mesh
                </h1>
                <p className="text-sm text-muted-foreground mt-1">v1.0 • Zero Infrastructure</p>
              </div>
            </div>
            
            <p className="text-xl text-foreground font-medium">
              A lifeline when all else fails.
            </p>
            
            <p className="text-muted-foreground max-w-sm mx-auto">
              Decentralized disaster response network with AI-powered triage and sensory assistance for vulnerable populations.
            </p>
          </div>

          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-sanctuary-success" />
                <span>End-to-end encrypted</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-sanctuary-success" />
                <span>Works without internet infrastructure</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-sanctuary-success" />
                <span>AI-powered emergency triage</span>
              </div>
              
              <Button 
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-12 text-lg font-semibold animate-sos-pulse"
                size="lg"
              >
                {loading ? (
                  <LoadingSpinner className="mr-2" />
                ) : (
                  <Shield className="w-5 h-5 mr-2" />
                )}
                Enter Secure Mode
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Onboarding Screen
  if (currentScreen === 'onboarding') {
    return (
      <div className="min-h-screen bg-background p-4 animate-fade-in">
        <div className="max-w-md mx-auto space-y-6 pt-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Create Vulnerability Profile</h2>
            <p className="text-muted-foreground">
              This information is private and only shared during an SOS to help rescuers provide appropriate assistance.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50"
                     onClick={() => setProfile(prev => ({ ...prev, sensoryImpaired: !prev.sensoryImpaired }))}>
                  <Eye className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="font-medium">High Sensory Sensitivity</div>
                    <div className="text-sm text-muted-foreground">Sensitive to loud noises, bright lights, or crowds</div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    profile.sensoryImpaired ? 'bg-primary border-primary' : 'border-muted-foreground'
                  }`}>
                    {profile.sensoryImpaired && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50"
                     onClick={() => setProfile(prev => ({ ...prev, nonVerbal: !prev.nonVerbal }))}>
                  <MessageSquare className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="font-medium">Non-Verbal Communication</div>
                    <div className="text-sm text-muted-foreground">May not respond to verbal commands</div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    profile.nonVerbal ? 'bg-primary border-primary' : 'border-muted-foreground'
                  }`}>
                    {profile.nonVerbal && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50"
                     onClick={() => setProfile(prev => ({ ...prev, mobilityImpaired: !prev.mobilityImpaired }))}>
                  <UserX className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="font-medium">Mobility Impaired</div>
                    <div className="text-sm text-muted-foreground">Limited mobility or requires assistance moving</div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    profile.mobilityImpaired ? 'bg-primary border-primary' : 'border-muted-foreground'
                  }`}>
                    {profile.mobilityImpaired && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pre-existing Medical Conditions</label>
                <Textarea
                  placeholder="Heart condition, diabetes, allergies, medications, etc."
                  value={profile.medicalConditions}
                  onChange={(e) => setProfile(prev => ({ ...prev, medicalConditions: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              <Button 
                onClick={handleSaveProfile}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? <LoadingSpinner className="mr-2" /> : null}
                Save and Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Survivor Dashboard
  if (currentScreen === 'survivor') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Emergency Response</h2>
              <p className="text-muted-foreground">Network Status: Connected</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentScreen('rescuer')}
            >
              <Users className="w-4 h-4" />
            </Button>
          </div>

          <Card className="text-center p-8 space-y-6">
            <div className="space-y-4">
              <div className="w-32 h-32 mx-auto relative">
                <Button
                  onClick={handleSendSOS}
                  disabled={sendingSOS}
                  className="w-full h-full rounded-full text-xl font-bold animate-sos-pulse disabled:animate-none bg-gradient-to-r from-sanctuary-emergency to-primary hover:from-sanctuary-emergency/90 hover:to-primary/90"
                >
                  {sendingSOS ? (
                    <LoadingSpinner size="lg" />
                  ) : (
                    'SOS'
                  )}
                </Button>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Emergency Signal</h3>
                <p className="text-sm text-muted-foreground">
                  Tap to broadcast your location and request immediate assistance
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Textarea
                placeholder="Optional: Describe your emergency situation..."
                value={emergencyMessage}
                onChange={(e) => setEmergencyMessage(e.target.value)}
                className="min-h-[100px] text-center"
              />
              
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>Location will be included automatically</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Your Profile
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.sensoryImpaired && (
                  <Badge variant="secondary" className="text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    Sensory Sensitive
                  </Badge>
                )}
                {profile.nonVerbal && (
                  <Badge variant="secondary" className="text-xs">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Non-Verbal
                  </Badge>
                )}
                {profile.mobilityImpaired && (
                  <Badge variant="secondary" className="text-xs">
                    <UserX className="w-3 h-3 mr-1" />
                    Mobility Impaired
                  </Badge>
                )}
                {profile.medicalConditions && (
                  <Badge variant="secondary" className="text-xs">
                    <Heart className="w-3 h-3 mr-1" />
                    Medical Conditions
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Rescuer Dashboard
  if (currentScreen === 'rescuer') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6 pt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Rescue Operations Center</h2>
              <p className="text-muted-foreground">Real-time SOS monitoring • {sosSignals.length} active signals</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentScreen('survivor')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid gap-4">
            {sosSignals.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="space-y-3">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No Active Signals</h3>
                  <p className="text-muted-foreground">Monitoring network for emergency broadcasts...</p>
                </div>
              </Card>
            ) : (
              sosSignals.map((signal) => (
                <Card key={signal.id} className={`${getPriorityColor(signal.priority)} border-l-4 animate-slide-up`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs font-bold">
                          {getPriorityLabel(signal.priority)}
                        </Badge>
                        <span className="text-lg">Priority: {Math.round(signal.priority)}</span>
                      </CardTitle>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Signal ID: {signal.id.slice(-6)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-medium text-sm">{signal.triage.summary}</p>
                    </div>
                    
                    {signal.message && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Survivor Message:</h5>
                        <p className="text-sm bg-card p-3 rounded border">"{signal.message}"</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">AI Triage Scores</h5>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Physical Urgency:</span>
                            <span className="font-mono">{signal.triage.p_score}/100</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Vulnerability:</span>
                            <span className="font-mono">{signal.triage.v_score}/100</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium text-sm">Survivor Profile</h5>
                        <div className="flex flex-wrap gap-1">
                          {signal.profile.sensoryImpaired && (
                            <Badge variant="outline" className="text-xs">
                              <Eye className="w-2 h-2 mr-1" />
                              Sensory
                            </Badge>
                          )}
                          {signal.profile.nonVerbal && (
                            <Badge variant="outline" className="text-xs">
                              <MessageSquare className="w-2 h-2 mr-1" />
                              Non-Verbal
                            </Badge>
                          )}
                          {signal.profile.mobilityImpaired && (
                            <Badge variant="outline" className="text-xs">
                              <UserX className="w-2 h-2 mr-1" />
                              Mobility
                            </Badge>
                          )}
                          {signal.profile.medicalConditions && (
                            <Badge variant="outline" className="text-xs">
                              <Heart className="w-2 h-2 mr-1" />
                              Medical
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {signal.location && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>
                          Location: {signal.location.latitude.toFixed(4)}, {signal.location.longitude.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Crisis Calm Screen
  if (currentScreen === 'calm') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sanctuary-calm/20 via-background to-sanctuary-calm/10 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Breathing animation circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-96 h-96 rounded-full border border-sanctuary-calm/30 animate-breathing" />
          <div className="absolute w-64 h-64 rounded-full border border-sanctuary-calm/20 animate-breathing" style={{ animationDelay: '1s' }} />
          <div className="absolute w-32 h-32 rounded-full border border-sanctuary-calm/40 animate-breathing" style={{ animationDelay: '2s' }} />
        </div>

        <div className="text-center space-y-8 z-10 animate-fade-in">
          <div className="space-y-4">
            <VolumeX className="w-16 h-16 mx-auto text-sanctuary-calm animate-glow" />
            <h1 className="text-3xl font-bold text-sanctuary-calm">Crisis Calm Mode Activated</h1>
            <p className="text-xl text-foreground max-w-md mx-auto">
              Help is on the way. Focus on your breathing and stay calm.
            </p>
          </div>

          <div className="space-y-6">
            <div className="text-sanctuary-calm/80 space-y-2">
              <p className="text-lg">Breathe with the circles</p>
              <p className="text-sm">Inhale as they expand • Exhale as they contract</p>
            </div>

            <Button
              onClick={() => setCurrentScreen('survivor')}
              variant="outline"
              className="border-sanctuary-calm text-sanctuary-calm hover:bg-sanctuary-calm/10"
            >
              <X className="w-4 h-4 mr-2" />
              Exit Calm Mode
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;

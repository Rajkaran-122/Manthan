// Mock authentication system for hackathon demo
// Simulates Firebase Auth without requiring real credentials

interface MockUser {
  uid: string;
  isAnonymous: boolean;
}

type AuthStateCallback = (user: MockUser | null) => void;

class MockAuth {
  private currentUser: MockUser | null = null;
  private listeners: AuthStateCallback[] = [];

  signInAnonymously(): Promise<{ user: MockUser }> {
    return new Promise((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        const mockUser: MockUser = {
          uid: 'demo-user-' + Math.random().toString(36).substr(2, 9),
          isAnonymous: true
        };
        
        this.currentUser = mockUser;
        this.notifyListeners();
        
        resolve({ user: mockUser });
      }, 1000); // 1 second delay to simulate Firebase
    });
  }

  onAuthStateChanged(callback: AuthStateCallback): () => void {
    this.listeners.push(callback);
    
    // Immediately call with current state
    setTimeout(() => callback(this.currentUser), 0);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  signOut(): Promise<void> {
    return new Promise((resolve) => {
      this.currentUser = null;
      this.notifyListeners();
      resolve();
    });
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentUser));
  }
}

// Mock Firestore
interface MockDoc {
  exists(): boolean;
  data(): Record<string, unknown>;
}

interface MockCollection {
  doc(id: string): MockDocRef;
}

interface MockDocRef {
  get(): Promise<MockDoc>;
  set(data: Record<string, unknown>): Promise<void>;
}

class MockFirestore {
  private data: { [path: string]: Record<string, unknown> } = {};

  doc(path: string): MockDocRef {
    return {
      get: () => Promise.resolve({
        exists: () => !!this.data[path],
        data: () => this.data[path]
      }),
      set: (data: Record<string, unknown>) => {
        this.data[path] = data;
        return Promise.resolve();
      }
    };
  }

  collection(path: string): MockCollection {
    return {
      doc: (id: string) => this.doc(`${path}/${id}`)
    };
  }
}

// Create mock instances
export const mockAuth = new MockAuth();
export const mockDb = new MockFirestore();

// Export mock functions that match Firebase API
export const signInAnonymously = () => mockAuth.signInAnonymously();
export const onAuthStateChanged = (callback: AuthStateCallback) => mockAuth.onAuthStateChanged(callback);

export const doc = (db: unknown, ...pathSegments: string[]) => mockDb.doc(pathSegments.join('/'));
export const setDoc = (docRef: MockDocRef, data: Record<string, unknown>) => docRef.set(data);
export const getDoc = (docRef: MockDocRef) => docRef.get();

// Mock collection and other Firestore functions for demo
export const collection = (db: unknown, path: string) => mockDb.collection(path);
export const addDoc = (collectionRef: MockCollection, data: Record<string, unknown>) => {
  const id = 'mock-id-' + Date.now();
  return Promise.resolve({ id });
};

export const onSnapshot = (collectionRef: MockCollection, callback: (snapshot: { forEach: (fn: (signal: { id: string; data: () => Record<string, unknown> }) => void) => void }) => void) => {
  // Return empty snapshot for demo
  setTimeout(() => {
    callback({
      forEach: (fn: (signal: { id: string; data: () => Record<string, unknown> }) => void) => {
        // Mock some demo SOS signals for the rescuer dashboard
        const mockSignals = [
          {
            id: 'signal-1',
            data: () => ({
              userId: 'user-1',
              message: 'Trapped in collapsed building, injured leg',
              location: { latitude: 40.7128, longitude: -74.0060 },
              profile: {
                sensoryImpaired: true,
                nonVerbal: false,
                mobilityImpaired: true,
                medicalConditions: 'Diabetes'
              },
              triage: {
                p_score: 85,
                v_score: 60,
                summary: 'CRITICAL: Immediate medical intervention needed. Vulnerable individual - specialized assistance protocols recommended.'
              },
              timestamp: new Date()
            })
          },
          {
            id: 'signal-2',
            data: () => ({
              userId: 'user-2',
              message: 'Lost, need help finding shelter',
              location: { latitude: 40.7589, longitude: -73.9851 },
              profile: {
                sensoryImpaired: false,
                nonVerbal: true,
                mobilityImpaired: false,
                medicalConditions: 'Autism, anxiety disorder'
              },
              triage: {
                p_score: 45,
                v_score: 70,
                summary: 'HIGH PRIORITY: Urgent rescue response required. Vulnerable individual - specialized assistance protocols recommended.'
              },
              timestamp: new Date()
            })
          }
        ];
        mockSignals.forEach(fn);
      }
    });
  }, 0);
  // Return unsubscribe function
  return () => {};
};

export const serverTimestamp = () => new Date();
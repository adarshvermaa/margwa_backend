# Margwa API Integration Examples

## 📱 Frontend Integration Patterns

This guide provides practical examples for integrating Margwa backend APIs into your React Native applications.

---

## 1. Authentication Integration

### Complete Auth Flow

```typescript
// contexts/auth-context.tsx
import React, { createContext, useContext, useState } from 'react';
import { authService } from '@/services/api/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Step 1: Send OTP
  const sendOTP = async (phone: string, countryCode: string) => {
    try {
      const response = await authService.sendOTP({
        phoneNumber: phone,
        phoneCountryCode: countryCode,
      });
      
      // Auto-register if user doesn't exist
      if (response.error?.code === 'USER_NOT_FOUND') {
        await authService.register({
          phoneNumber: phone,
          phoneCountryCode: countryCode,
          userType: 'client', // or 'driver'
        });
        
        // Retry sending OTP
        return await authService.sendOTP({
          phoneNumber: phone,
          phoneCountryCode: countryCode,
        });
      }
      
      return response;
    } catch (error) {
      console.error('Send OTP failed:', error);
      throw error;
    }
  };

  // Step 2: Verify OTP & Login
  const login = async (phone: string, countryCode: string, otp: string) => {
    const deviceId = `device_${Platform.OS}_${Date.now()}`;
    const deviceType = Platform.OS === 'ios' ? 'ios' : 
                       Platform.OS === 'android' ? 'android' : 'web';

    const response = await authService.verifyOTP({
      phoneNumber: phone,
      phoneCountryCode: countryCode,
      otpCode: otp,
      deviceId,
      deviceType,
    });

    if (response.success && response.data) {
      setUser(response.data.user);
      setIsAuthenticated(true);
      
      // Tokens are automatically stored by API client
      return true;
    }
    
    return false;
  };

  // Step 3: Update Profile
  const updateProfile = async (data: Partial<User>) => {
    const response = await authService.updateProfile({
      fullName: data.fullName,
      email: data.email,
      dob: data.dob,
      gender: data.gender,
    });

    if (response.success) {
      setUser({
        ...user,
        ...response.data,
        isProfileComplete: true,
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, sendOTP, login, updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Usage in Components

```typescript
// app/(auth)/phone-input.tsx
export default function PhoneInputScreen() {
  const { sendOTP } = useAuth();
  const [phone, setPhone] = useState('');

  const handleContinue = async () => {
    try {
      await sendOTP(phone, '+91');
      router.push({ 
        pathname: '/(auth)/otp-verify',
        params: { phoneNumber: phone, countryCode: '+91' }
      });
    } catch (error) {
      showToast({ type: 'error', message: error.message });
    }
  };

  return <PremiumButton onPress={handleContinue} title="Continue" />;
}
```

```typescript
// app/(auth)/otp-verify.tsx
export default function OTPVerifyScreen() {
  const { phoneNumber, countryCode } = useLocalSearchParams();
  const { login } = useAuth();
  const [otp, setOtp] = useState('');

  const handleVerify = async () => {
    const success = await login(phoneNumber, countryCode, otp);
    
    if (success) {
      router.replace('/(auth)/profile-update');
    }
  };

  return (
    <OtpInput
      numberOfDigits={6}
      onFilled={handleVerify}
      onTextChange={setOtp}
    />
  );
}
```

---

## 2. Route Integration (Driver App)

### Create Route

```typescript
// services/api/routes.ts
import { apiClient } from './client';

export const routeService = {
  createRoute: (data: CreateRouteRequest) =>
    apiClient.post('/routes', data),

  searchRoutes: (data: SearchRoutesRequest) =>
    apiClient.post('/routes/search', data),

  getMyRoutes: (driverId: string) =>
    apiClient.get(`/routes/driver/${driverId}`),

  updateRoute: (id: string, data: Partial<Route>) =>
    apiClient.put(`/routes/${id}`, data),

  deleteRoute: (id: string) =>
    apiClient.delete(`/routes/${id}`),
};
```

### Driver Route Creation Screen

```typescript
// app/(driver)/routes/create.tsx
export default function CreateRouteScreen() {
  const { user } = useAuth();
  const [routeData, setRouteData] = useState({
    startLocation: null,
    endLocation: null,
    departureTime: new Date(),
    price: 0,
    totalSeats: 40,
  });

  const handleCreateRoute = async () => {
    try {
      const response = await routeService.createRoute({
        driverId: user.id,
        startLocation: {
          latitude: routeData.startLocation.lat,
          longitude: routeData.startLocation.lng,
          address: routeData.startLocation.address,
        },
        endLocation: {
          latitude: routeData.endLocation.lat,
          longitude: routeData.endLocation.lng,
          address: routeData.endLocation.address,
        },
        departureTime: routeData.departureTime.toISOString(),
        arrivalTime: calculateArrivalTime(routeData),
        price: routeData.price,
        availableSeats: routeData.totalSeats,
        totalSeats: routeData.totalSeats,
        vehicleInfo: {
          type: 'bus',
          number: user.vehicleNumber,
          model: user.vehicleModel,
        },
        status: 'active',
      });

      if (response.success) {
        showToast({ type: 'success', title: 'Route Created!' });
        router.back();
      }
    } catch (error) {
      showToast({ type: 'error', message: error.message });
    }
  };

  return (
    <View>
      <LocationPicker
        label="Starting Point"
        onLocationSelect={(loc) => 
          setRouteData(prev => ({ ...prev, startLocation: loc }))
        }
      />
      <LocationPicker
        label="Destination"
        onLocationSelect={(loc) => 
          setRouteData(prev => ({ ...prev, endLocation: loc }))
        }
      />
      <DateTimePicker
        value={routeData.departureTime}
        onChange={(time) => 
          setRouteData(prev => ({ ...prev, departureTime: time }))
        }
      />
      <PremiumButton title="Create Route" onPress={handleCreateRoute} />
    </View>
  );
}
```

### Client Route Search

```typescript
// app/(client)/search.tsx
export default function SearchRoutesScreen() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [searchParams, setSearchParams] = useState({
    from: '',
    to: '',
    date: new Date(),
    seats: 1,
  });

  const handleSearch = async () => {
    const response = await routeService.searchRoutes({
      from: searchParams.from,
      to: searchParams.to,
      date: searchParams.date.toISOString(),
      seats: searchParams.seats,
    });

    if (response.success) {
      setRoutes(response.data);
    }
  };

  return (
    <ScrollView>
      <TextInput placeholder="From" onChangeText={...} />
      <TextInput placeholder="To" onChangeText={...} />
      <DatePicker value={searchParams.date} onChange={...} />
      
      <PremiumButton title="Search Routes" onPress={handleSearch} />

      {routes.map(route => (
        <RouteCard
          key={route.id}
          route={route}
          onBook={() => router.push(`/booking/${route.id}`)}
        />
      ))}
    </ScrollView>
  );
}
```

---

## 3. Real-time Integration

### WebSocket Setup

```typescript
// services/websocket/realtime.ts
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../api/client';

class RealtimeService {
  private socket: Socket | null = null;

  async connect() {
    const token = await getAuthToken();
    
    this.socket = io('http://192.168.31.119:3004', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to realtime service');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  // Driver: Send location updates
  sendLocationUpdate(location: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    rideId?: string;
  }) {
    this.socket?.emit('location:update', location);
  }

  // Client: Listen for driver location
  onLocationUpdate(callback: (data: any) => void) {
    this.socket?.on('location:updated', callback);
  }

  // Join a ride room
  joinRide(rideId: string) {
    this.socket?.emit('ride:join', rideId);
  }

  // Listen for booking notifications
  onNewBooking(callback: (data: any) => void) {
    this.socket?.on('booking:new', callback);
  }

  // Listen for booking status updates
  onBookingUpdate(callback: (data: any) => void) {
    this.socket?.on('booking:updated', callback);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export const realtimeService = new RealtimeService();
```

### Driver Location Tracking

```typescript
// app/(driver)/active-ride/[id].tsx
import { useEffect } from 'react';
import * as Location from 'expo-location';
import { realtimeService } from '@/services/websocket/realtime';

export default function ActiveRideScreen() {
  const { rideId } = useLocalSearchParams();

  useEffect(() => {
    // Connect to WebSocket
    realtimeService.connect();
    realtimeService.joinRide(rideId);

    // Start location tracking
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Every 5 seconds
          distanceInterval: 10, // Every 10 meters
        },
        (location) => {
          realtimeService.sendLocationUpdate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            rideId,
          });
        }
      );
    };

    startTracking();

    return () => realtimeService.disconnect();
  }, [rideId]);

  return <MapView showing driver location />;
}
```

### Client Live Tracking

```typescript
// app/(client)/track-ride/[id].tsx
export default function TrackRideScreen() {
  const { rideId } = useLocalSearchParams();
  const [driverLocation, setDriverLocation] = useState(null);

  useEffect(() => {
    realtimeService.connect();
    realtimeService.joinRide(rideId);

    realtimeService.onLocationUpdate((data) => {
      setDriverLocation({
        latitude: data.latitude,
        longitude: data.longitude,
      });
    });

    return () => realtimeService.disconnect();
  }, [rideId]);

  return (
    <MapView
      initialRegion={{
        latitude: driverLocation?.latitude || 0,
        longitude: driverLocation?.longitude || 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      {driverLocation && (
        <Marker
          coordinate={driverLocation}
          title="Driver"
          image={require('@/assets/bus-marker.png')}
        />
      )}
    </MapView>
  );
}
```

---

## 4. Chat Integration

### Chat Service

```typescript
// services/api/chat.ts
export const chatService = {
  createConversation: (data: {
    participant1Id: string;
    participant2Id: string;
    bookingId?: string;
  }) => apiClient.post('/chat/conversations', data),

  sendMessage: (data: {
    conversationId: string;
    message: string;
    messageType?: 'text' | 'image' | 'location';
  }) => apiClient.post('/chat/messages', data),

  getMessages: (conversationId: string, limit = 50, offset = 0) =>
    apiClient.get(`/chat/messages/${conversationId}?limit=${limit}&offset=${offset}`),

  markAsRead: (conversationId: string) =>
    apiClient.put(`/chat/messages/${conversationId}/read`, {}),

  getConversations: (userId: string) =>
    apiClient.get(`/chat/conversations/user/${userId}`),

  getUnreadCount: (userId: string) =>
    apiClient.get(`/chat/unread/${userId}`),
};
```

### Chat Screen

```typescript
// app/(main)/chat/[conversationId].tsx
export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    loadMessages();
    
    // Listen for new messages via WebSocket
    realtimeService.onChatMessage((data) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          conversationId,
          senderId: data.senderId,
          message: data.message,
          createdAt: data.timestamp,
        }]);
      }
    });

    // Mark as read when screen is focused
    chatService.markAsRead(conversationId);
  }, [conversationId]);

  const loadMessages = async () => {
    const response = await chatService.getMessages(conversationId);
    if (response.success) {
      setMessages(response.data.reverse());
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const response = await chatService.sendMessage({
      conversationId,
      message: inputText,
      messageType: 'text',
    });

    if (response.success) {
      setMessages(prev => [...prev, response.data]);
      setInputText('');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwnMessage={item.senderId === user.id}
          />
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
        />
        <TouchableOpacity onPress={handleSend}>
          <Ionicons name="send" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

---

## 5. Payment Integration

### Payment Service

```typescript
// services/api/payments.ts
export const paymentService = {
  initiatePayment: (data: {
    bookingId: string;
    amount: number;
    method: 'razorpay' | 'stripe' | 'wallet';
  }) => apiClient.post('/payments/initiate', data),

  verifyPayment: (data: {
    paymentId: string;
    paymentGatewayId: string;
    signature: string;
  }) => apiClient.post('/payments/verify', data),

  getPaymentByBooking: (bookingId: string) =>
    apiClient.get(`/payments/${bookingId}`),
};
```

### Razorpay Integration (Client)

```typescript
// app/(client)/payment/[bookingId].tsx
import RazorpayCheckout from 'react-native-razorpay';

export default function PaymentScreen() {
  const { bookingId, amount } = useLocalSearchParams();

  const handlePayment = async () => {
    try {
      // Step 1: Initiate payment on backend
      const initResponse = await paymentService.initiatePayment({
        bookingId,
        amount: parseFloat(amount),
        method: 'razorpay',
      });

      if (!initResponse.success) {
        throw new Error('Failed to initiate payment');
      }

      const { orderId, paymentId } = initResponse.data;

      // Step 2: Open Razorpay checkout
      const options = {
        description: `Booking #${bookingId}`,
        image: 'https://margwa.com/logo.png',
        currency: 'INR',
        key: 'rzp_test_YOUR_KEY',
        amount: amount * 100, // Amount in paise
        name: 'Margwa',
        order_id: orderId,
        prefill: {
          email: user.email,
          contact: user.phoneNumber,
          name: user.fullName,
        },
        theme: { color: '#006b7d' },
      };

      const data = await RazorpayCheckout.open(options);

      // Step 3: Verify payment on backend
      const verifyResponse = await paymentService.verifyPayment({
        paymentId,
        paymentGatewayId: data.razorpay_payment_id,
        signature: data.razorpay_signature,
      });

      if (verifyResponse.success) {
        showToast({ type: 'success', title: 'Payment Successful!' });
        router.replace(`/(client)/booking-success/${bookingId}`);
      }
    } catch (error) {
      showToast({ type: 'error', message: 'Payment failed' });
    }
  };

  return (
    <View>
      <Text>Amount: ₹{amount}</Text>
      <PremiumButton title="Pay Now" onPress={handlePayment} />
    </View>
  );
}
```

---

## 6. Notifications Integration

### Notification Service

```typescript
// services/api/notifications.ts
export const notificationService = {
  getNotifications: (userId: string, unreadOnly = false) =>
    apiClient.get(
      `/notifications/${userId}?unreadOnly=${unreadOnly}&limit=50`
    ),

  markAsRead: (notificationId: string) =>
    apiClient.put(`/notifications/${notificationId}/read`, {}),

  deleteNotification: (notificationId: string) =>
    apiClient.delete(`/notifications/${notificationId}`),
};
```

### Notification Screen

```typescript
// app/(main)/notifications.tsx
export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();

    // Listen for new notifications
    realtimeService.onNotification((data) => {
      setNotifications(prev => [data, ...prev]);
      showInAppNotification(data);
    });
  }, []);

  const loadNotifications = async () => {
    const response = await notificationService.getNotifications(user.id);
    if (response.success) {
      setNotifications(response.data);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  return (
    <FlatList
      data={notifications}
      renderItem={({ item }) => (
        <NotificationCard
          notification={item}
          onPress={() => handleMarkAsRead(item.id)}
        />
      )}
    />
  );
}
```

---

## 🔑 Best Practices

1. **Token Management**
   - Store tokens in AsyncStorage
   - Refresh before expiry
   - Clear on logout

2. **Error Handling**
   - Use try-catch for all API calls
   - Show user-friendly error messages
   - Log errors for debugging

3. **Loading States**
   - Show loading indicators
   - Disable buttons during requests
   - Handle race conditions

4. **Optimistic Updates**
   - Update UI immediately
   - Rollback on error
   - Sync with server

5. **Offline Support**
   - Queue requests when offline
   - Sync when online
   - Cache important data

---

**Last Updated**: 2026-01-10

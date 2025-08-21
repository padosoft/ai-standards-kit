# React Native Coding Guidelines

> **Extends**: `/docs/standards/global/coding-guidelines.md`
> 
> This document provides **React Native-specific** implementations of the enterprise coding guidelines. Always follow the global principles while applying these mobile development patterns.

## TypeScript Integration

### Component Type Safety
```typescript
// ✅ Good - Strict TypeScript setup
import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ListRenderItem,
  ViewStyle,
  TextStyle
} from 'react-native';

// Define strict interfaces
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  lastSeen: Date;
  isOnline: boolean;
}

interface UserListItemProps {
  user: User;
  onPress: (userId: string) => void;
  style?: ViewStyle;
  testID?: string;
}

// ✅ Good - Memoized component with proper types
const UserListItem = memo<UserListItemProps>(({ 
  user, 
  onPress, 
  style,
  testID 
}) => {
  const handlePress = useCallback(() => {
    onPress(user.id);
  }, [onPress, user.id]);
  
  const statusColor = useMemo(() => 
    user.isOnline ? '#00C851' : '#757575'
  , [user.isOnline]);
  
  const lastSeenText = useMemo(() => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - user.lastSeen.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return user.lastSeen.toLocaleDateString();
  }, [user.lastSeen]);
  
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`User ${user.name}, ${user.isOnline ? 'online' : 'offline'}`}
    >
      <View style={styles.avatarContainer}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: statusColor }]}>
            <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
          </View>
        )}
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={styles.lastSeen} numberOfLines={1}>
          {lastSeenText}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

UserListItem.displayName = 'UserListItem';

// ✅ Good - Strongly typed styles
interface Styles {
  container: ViewStyle;
  avatarContainer: ViewStyle;
  avatar: ViewStyle;
  avatarPlaceholder: ViewStyle;
  avatarText: TextStyle;
  statusIndicator: ViewStyle;
  content: ViewStyle;
  name: TextStyle;
  lastSeen: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  lastSeen: {
    fontSize: 14,
    color: '#757575',
  },
});

// ❌ Bad - No types, no memoization
const BadUserItem = ({ user, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(user.id)}>
      <Text>{user.name}</Text>
    </TouchableOpacity>
  );
};
```

### Hook Patterns
```typescript
// ✅ Good - Custom hook with proper typing
import { useState, useEffect, useCallback, useRef } from 'react';
import { Keyboard, KeyboardEvent, EmitterSubscription } from 'react-native';

interface UseKeyboardState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

export const useKeyboard = (): UseKeyboardState => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const subscriptions = useRef<EmitterSubscription[]>([]);
  
  const handleKeyboardShow = useCallback((event: KeyboardEvent) => {
    setKeyboardHeight(event.endCoordinates.height);
    setIsKeyboardVisible(true);
  }, []);
  
  const handleKeyboardHide = useCallback(() => {
    setKeyboardHeight(0);
    setIsKeyboardVisible(false);
  }, []);
  
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);
    
    subscriptions.current = [showSubscription, hideSubscription];
    
    return () => {
      subscriptions.current.forEach(subscription => subscription.remove());
      subscriptions.current = [];
    };
  }, [handleKeyboardShow, handleKeyboardHide]);
  
  return { keyboardHeight, isKeyboardVisible };
};

// ✅ Good - API hook with error handling and loading states
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export const useApi = <T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
): ApiState<T> & { refetch: () => Promise<void> } => {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  
  const { immediate = true, onSuccess, onError } = options;
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const fetchData = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall();
      
      // Check if component is still mounted and request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setState({ data: result, loading: false, error: null });
        onSuccess?.(result);
      }
    } catch (error) {
      if (!abortControllerRef.current?.signal.aborted) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState({ data: null, loading: false, error: errorMessage });
        onError?.(errorMessage);
      }
    }
  }, [apiCall, onSuccess, onError]);
  
  useEffect(() => {
    if (immediate) {
      fetchData();
    }
    
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [immediate, fetchData]);
  
  return {
    ...state,
    refetch: fetchData,
  };
};
```

## Component Architecture

### Screen Component Structure
```typescript
// ✅ Good - Well-structured screen component
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';

import { UserListItem } from '../components/UserListItem';
import { SearchBar } from '../components/SearchBar';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useUsers } from '../hooks/useUsers';
import { useDebounce } from '../hooks/useDebounce';
import { User } from '../types/User';
import { RootStackParamList } from '../navigation/types';

type UserListScreenNavigationProp = NavigationProp<RootStackParamList, 'UserList'>;

const UserListScreen: React.FC = () => {
  const navigation = useNavigation<UserListScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const {
    users,
    loading,
    error,
    refreshing,
    loadMore,
    refresh,
    hasNextPage,
  } = useUsers({
    searchQuery: debouncedSearchQuery,
  });
  
  // Memoized filtered data
  const filteredUsers = useMemo(() => {
    if (!debouncedSearchQuery) return users;
    
    return users.filter(user =>
      user.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [users, debouncedSearchQuery]);
  
  const handleUserPress = useCallback((userId: string) => {
    navigation.navigate('UserProfile', { userId });
  }, [navigation]);
  
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);
  
  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh users');
    }
  }, [refresh]);
  
  const handleLoadMore = useCallback(() => {
    if (!loading && hasNextPage) {
      loadMore();
    }
  }, [loading, hasNextPage, loadMore]);
  
  const renderUserItem: ListRenderItem<User> = useCallback(({ item, index }) => (
    <UserListItem
      user={item}
      onPress={handleUserPress}
      testID={`user-item-${index}`}
    />
  ), [handleUserPress]);
  
  const keyExtractor = useCallback((item: User) => item.id, []);
  
  const renderEmptyComponent = useCallback(() => {
    if (loading) return <LoadingSpinner />;
    if (error) return <EmptyState message={error} type="error" />;
    if (searchQuery) return <EmptyState message="No users found" type="search" />;
    return <EmptyState message="No users yet" type="empty" />;
  }, [loading, error, searchQuery]);
  
  useEffect(() => {
    navigation.setOptions({
      title: `Users (${filteredUsers.length})`,
    });
  }, [navigation, filteredUsers.length]);
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearchChange}
        placeholder="Search users..."
        testID="user-search-bar"
      />
      
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={keyExtractor}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={renderEmptyComponent}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
        getItemLayout={(data, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
        testID="user-list"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});

export { UserListScreen };
```

### State Management Patterns
```typescript
// ✅ Good - Context with useReducer for complex state
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
      
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
      
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };
      
    case 'LOGOUT':
      return {
        ...initialState,
      };
      
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
      
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const user = await response.json();
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
    }
  }, []);
  
  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, []);
  
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);
  
  const contextValue = useMemo(
    () => ({
      ...state,
      login,
      logout,
      clearError,
    }),
    [state, login, logout, clearError]
  );
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Navigation Patterns

### Type-Safe Navigation
```typescript
// ✅ Good - Strongly typed navigation
import { NavigatorScreenParams } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Define all route parameters
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Modal: {
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
  };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: { email?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Users: NavigatorScreenParams<UserStackParamList>;
  Profile: undefined;
  Settings: undefined;
};

export type UserStackParamList = {
  UserList: { filter?: 'active' | 'all' };
  UserProfile: { userId: string };
  EditUser: { userId: string };
};

// Screen prop types
export type LoginScreenProps = StackScreenProps<AuthStackParamList, 'Login'>;
export type UserListScreenProps = StackScreenProps<UserStackParamList, 'UserList'>;
export type UserProfileScreenProps = StackScreenProps<UserStackParamList, 'UserProfile'>;

// Usage in components
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const UserProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<UserStackParamList, 'UserProfile'>>();
  const route = useRoute<RouteProp<UserStackParamList, 'UserProfile'>>();
  
  const { userId } = route.params;
  
  const handleEditPress = useCallback(() => {
    navigation.navigate('EditUser', { userId });
  }, [navigation, userId]);
  
  // Component implementation
};

// ✅ Good - Navigation service for complex navigation
class NavigationService {
  private navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();
  
  setTopLevelNavigator(ref: NavigationContainerRef<RootStackParamList>) {
    this.navigationRef.current = ref;
  }
  
  navigate<T extends keyof RootStackParamList>(
    name: T,
    params: RootStackParamList[T]
  ) {
    this.navigationRef.current?.navigate(name, params);
  }
  
  goBack() {
    this.navigationRef.current?.goBack();
  }
  
  reset(state: Partial<NavigationState>) {
    this.navigationRef.current?.reset(state);
  }
}

export const navigationService = new NavigationService();
```

## Performance Optimization

### List Optimization Patterns
```typescript
// ✅ Good - Optimized FlatList implementation
import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, ListRenderItem, ViewToken } from 'react-native';

interface OptimizedListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  onEndReached?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  estimatedItemSize?: number;
  numColumns?: number;
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[] }) => void;
}

const OptimizedList = <T,>({
  data,
  renderItem,
  keyExtractor,
  onEndReached,
  refreshing = false,
  onRefresh,
  estimatedItemSize = 80,
  numColumns = 1,
  onViewableItemsChanged,
}: OptimizedListProps<T>) => {
  // Memoize item layout for better performance
  const getItemLayout = useCallback(
    (data: T[] | null | undefined, index: number) => ({
      length: estimatedItemSize,
      offset: estimatedItemSize * index,
      index,
    }),
    [estimatedItemSize]
  );
  
  // Viewability config for onViewableItemsChanged
  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 300,
    }),
    []
  );
  
  const viewabilityConfigCallbackPairs = useMemo(
    () => [
      {
        viewabilityConfig,
        onViewableItemsChanged,
      },
    ],
    [viewabilityConfig, onViewableItemsChanged]
  );
  
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshing={refreshing}
      onRefresh={onRefresh}
      getItemLayout={getItemLayout}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      windowSize={10}
      initialNumToRender={15}
      numColumns={numColumns}
      viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
    />
  );
};

// ✅ Good - Memoized list item
interface ProductItemProps {
  product: Product;
  onPress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
}

const ProductItem = memo<ProductItemProps>(({ product, onPress, onAddToCart }) => {
  const handlePress = useCallback(() => {
    onPress(product.id);
  }, [onPress, product.id]);
  
  const handleAddToCart = useCallback(() => {
    onAddToCart(product.id);
  }, [onAddToCart, product.id]);
  
  const priceFormatted = useMemo(
    () => `$${product.price.toFixed(2)}`,
    [product.price]
  );
  
  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Image source={{ uri: product.image }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={styles.price}>{priceFormatted}</Text>
      </View>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddToCart}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.title === nextProps.product.title &&
    prevProps.product.image === nextProps.product.image
  );
});
```

### Image Optimization
```typescript
// ✅ Good - Optimized image component with caching
import React, { useState, useCallback, memo } from 'react';
import {
  Image,
  ImageProps,
  View,
  ActivityIndicator,
  Text,
  ImageStyle,
  ViewStyle,
} from 'react-native';
import FastImage, { FastImageProps, ResizeMode } from 'react-native-fast-image';

interface OptimizedImageProps extends Omit<FastImageProps, 'source'> {
  uri: string;
  width: number;
  height: number;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  resizeMode?: ResizeMode;
  priority?: 'low' | 'normal' | 'high';
  cache?: 'immutable' | 'web' | 'cacheOnly';
}

const OptimizedImage = memo<OptimizedImageProps>(({
  uri,
  width,
  height,
  placeholder,
  fallback,
  resizeMode = 'cover',
  priority = 'normal',
  cache = 'web',
  style,
  onLoad,
  onError,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const handleLoad = useCallback((event: any) => {
    setLoading(false);
    onLoad?.(event);
  }, [onLoad]);
  
  const handleError = useCallback((event: any) => {
    setLoading(false);
    setError(true);
    onError?.(event);
  }, [onError]);
  
  const imageStyle: ImageStyle = {
    width,
    height,
    ...StyleSheet.flatten(style),
  };
  
  if (error) {
    return (
      <View style={[imageStyle, styles.fallbackContainer]}>
        {fallback || (
          <Text style={styles.fallbackText}>Image not available</Text>
        )}
      </View>
    );
  }
  
  return (
    <View style={imageStyle}>
      <FastImage
        {...props}
        source={{
          uri,
          priority: FastImage.priority[priority],
          cache: FastImage.cacheControl[cache],
        }}
        style={imageStyle}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          {placeholder || (
            <ActivityIndicator size="small" color="#666" />
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  fallbackText: {
    fontSize: 12,
    color: '#666',
  },
});

// ✅ Good - Image preloading utility
export const preloadImages = (urls: string[]): Promise<void[]> => {
  const preloadPromises = urls.map(url => 
    FastImage.preload([{
      uri: url,
      priority: FastImage.priority.high,
    }])
  );
  
  return Promise.all(preloadPromises);
};
```

## Testing Patterns

### Component Testing
```typescript
// ✅ Good - Comprehensive component testing
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { UserListScreen } from '../UserListScreen';
import { useUsers } from '../../hooks/useUsers';

// Mock the hook
jest.mock('../../hooks/useUsers');
const mockUseUsers = useUsers as jest.MockedFunction<typeof useUsers>;

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: jest.fn(),
  }),
}));

const Stack = createStackNavigator();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="Test" component={() => <>{children}</>} />
    </Stack.Navigator>
  </NavigationContainer>
);

describe('UserListScreen', () => {
  const mockUsers = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      lastSeen: new Date(),
      isOnline: true,
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      lastSeen: new Date(),
      isOnline: false,
    },
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUsers.mockReturnValue({
      users: mockUsers,
      loading: false,
      error: null,
      refreshing: false,
      loadMore: jest.fn(),
      refresh: jest.fn(),
      hasNextPage: false,
    });
  });
  
  it('renders user list correctly', () => {
    const { getByText, getByTestId } = render(
      <TestWrapper>
        <UserListScreen />
      </TestWrapper>
    );
    
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('Jane Smith')).toBeTruthy();
    expect(getByTestId('user-list')).toBeTruthy();
  });
  
  it('navigates to user profile when item is pressed', () => {
    const { getByText } = render(
      <TestWrapper>
        <UserListScreen />
      </TestWrapper>
    );
    
    fireEvent.press(getByText('John Doe'));
    
    expect(mockNavigate).toHaveBeenCalledWith('UserProfile', {
      userId: '1',
    });
  });
  
  it('filters users when searching', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <TestWrapper>
        <UserListScreen />
      </TestWrapper>
    );
    
    const searchBar = getByTestId('user-search-bar');
    fireEvent.changeText(searchBar, 'John');
    
    // Wait for debounce
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(queryByText('Jane Smith')).toBeNull();
    });
  });
  
  it('shows loading state', () => {
    mockUseUsers.mockReturnValue({
      users: [],
      loading: true,
      error: null,
      refreshing: false,
      loadMore: jest.fn(),
      refresh: jest.fn(),
      hasNextPage: false,
    });
    
    const { getByTestId } = render(
      <TestWrapper>
        <UserListScreen />
      </TestWrapper>
    );
    
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });
  
  it('shows error state', () => {
    mockUseUsers.mockReturnValue({
      users: [],
      loading: false,
      error: 'Failed to load users',
      refreshing: false,
      loadMore: jest.fn(),
      refresh: jest.fn(),
      hasNextPage: false,
    });
    
    const { getByText } = render(
      <TestWrapper>
        <UserListScreen />
      </TestWrapper>
    );
    
    expect(getByText('Failed to load users')).toBeTruthy();
  });
});
```

## Final Checklist

### React Native Code Quality Checklist
- [ ] TypeScript strict mode enabled
- [ ] All components properly memoized where appropriate
- [ ] Proper key extraction for lists
- [ ] Image optimization implemented
- [ ] Navigation properly typed
- [ ] Accessibility props added to interactive elements
- [ ] Performance optimizations (FlatList props, memoization)
- [ ] Error boundaries implemented
- [ ] Loading and error states handled
- [ ] Proper cleanup in useEffect hooks
- [ ] Platform-specific code separated when needed
- [ ] Deep linking configured and tested
- [ ] Push notifications implemented securely
- [ ] Offline support for critical features
- [ ] Proper testing coverage with @testing-library/react-native
# React Native Enterprise Coding Guidelines

> **Extends**: `/docs/standards/global/coding-guidelines.md`
> 
> This document provides **React Native-specific** implementation patterns and enterprise standards. Apply these RN-specific strategies while following global coding principles.

## Stack Configuration

### With Expo (Recommended)
```json
{
  "expo": "~51.0.0",
  "@shopify/flash-list": "^1.7.0",
  "nativewind": "^4.0.0",
  "react-navigation": "^6.0.0",
  "expo-router": null  // ❌ NOT USED - use react-navigation
}
```

### Without Expo (Bare React Native)
```json
{
  "react-native": "0.74.0",
  "@shopify/flash-list": "^1.7.0",
  "nativewind": "^4.0.0",
  "react-navigation": "^6.0.0"
}
```

## Component Architecture

### Props Extension Pattern (REQUIRED)
Components MUST extend the props of their root element for proper typing and accessibility:

```tsx
// ❌ BAD - No props extension
interface UserMenuProps {
  userData: User;
  onPress?: () => void;
}

// ✅ GOOD - Extends root component props
import { View, type ViewProps, Pressable, type PressableProps } from 'react-native';
import { forwardRef, memo } from 'react';

interface UserMenuProps extends ViewProps {
  userData: User;
  onMenuPress?: () => void;
  
  // Style overrides for internal elements
  containerStyle?: ViewProps['style'];
  avatarStyle?: ImageProps['style'];
  labelStyle?: TextProps['style'];
}

export const UserMenu = memo(
  forwardRef<View, UserMenuProps>(
    ({ userData, onMenuPress, containerStyle, avatarStyle, labelStyle, style, ...viewProps }, ref) => {
      return (
        <View 
          ref={ref}
          style={[style, containerStyle]}
          {...viewProps}  // All View props (accessibility, testID, etc.)
        >
          <Pressable onPress={onMenuPress}>
            <Avatar style={avatarStyle} source={userData.avatar} />
            <Text style={labelStyle}>{userData.name}</Text>
          </Pressable>
        </View>
      );
    }
  )
);

UserMenu.displayName = 'UserMenu';
```

### Component Structure with NativeWind

```tsx
import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { forwardRef, memo } from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';

// Define variants using CVA
const buttonVariants = cva(
  'flex items-center justify-center rounded-lg active:opacity-90',
  {
    variants: {
      variant: {
        primary: 'bg-blue-500',
        secondary: 'bg-gray-500',
        danger: 'bg-red-500',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-12 px-5',
        lg: 'h-14 px-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

// Props extend root component + variants
interface ButtonProps 
  extends PressableProps,
    VariantProps<typeof buttonVariants> {
  label: string;
  loading?: boolean;
  
  // Style overrides
  containerClassName?: string;
  textClassName?: string;
}

export const Button = memo(
  forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
    ({ 
      label, 
      loading, 
      variant, 
      size, 
      className,
      containerClassName,
      textClassName,
      disabled,
      ...pressableProps 
    }, ref) => {
      return (
        <Pressable
          ref={ref}
          className={cn(
            buttonVariants({ variant, size }),
            containerClassName,
            className
          )}
          disabled={disabled || loading}
          {...pressableProps}
        >
          <Text className={cn('text-white font-semibold', textClassName)}>
            {loading ? 'Loading...' : label}
          </Text>
        </Pressable>
      );
    }
  )
);

Button.displayName = 'Button';
```

### Ref Forwarding (REQUIRED for Interactive Components)

```tsx
// ✅ GOOD - Proper ref forwarding for programmatic control
import { useRef, useImperativeHandle, forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

interface SearchInputRef {
  focus: () => void;
  clear: () => void;
  getValue: () => string;
}

interface SearchInputProps extends TextInputProps {
  onSearch?: (text: string) => void;
}

export const SearchInput = forwardRef<SearchInputRef, SearchInputProps>(
  ({ onSearch, ...textInputProps }, ref) => {
    const inputRef = useRef<TextInput>(null);
    const [value, setValue] = useState('');
    
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => {
        setValue('');
        inputRef.current?.clear();
      },
      getValue: () => value,
    }));
    
    return (
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={setValue}
        onSubmitEditing={() => onSearch?.(value)}
        {...textInputProps}
      />
    );
  }
);

// Usage
const MyScreen = () => {
  const searchRef = useRef<SearchInputRef>(null);
  
  useEffect(() => {
    // Programmatic focus
    searchRef.current?.focus();
  }, []);
  
  return <SearchInput ref={searchRef} placeholder="Search..." />;
};
```

## List Performance with FlashList

### ALWAYS Use FlashList for Lists

```tsx
// ❌ BAD - Using FlatList
import { FlatList } from 'react-native';

// ✅ GOOD - Using FlashList with proper configuration
import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useRef } from 'react';

interface ListItem {
  id: string;
  title: string;
  description: string;
}

interface OptimizedListProps {
  data: ListItem[];
  onItemPress?: (item: ListItem) => void;
}

export const OptimizedList = memo<OptimizedListProps>(({ data, onItemPress }) => {
  const listRef = useRef<FlashList<ListItem>>(null);
  
  // Memoized item renderer
  const renderItem = useCallback(({ item }: { item: ListItem }) => (
    <ListItemComponent
      item={item}
      onPress={() => onItemPress?.(item)}
    />
  ), [onItemPress]);
  
  // Stable key extractor
  const keyExtractor = useCallback((item: ListItem) => item.id, []);
  
  // Estimated item size for better performance
  const estimatedItemSize = 80;
  
  return (
    <FlashList
      ref={listRef}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={estimatedItemSize}
      
      // Performance optimizations
      drawDistance={200}
      removeClippedSubviews={true}
      
      // Content container style with NativeWind
      contentContainerClassName="pb-4"
      
      // List optimizations
      ItemSeparatorComponent={ItemSeparator}
      ListEmptyComponent={EmptyState}
      
      // Scroll to item programmatically
      onLoad={() => {
        // Example: scroll to specific item
        const targetIndex = data.findIndex(item => item.id === 'target');
        if (targetIndex >= 0) {
          listRef.current?.scrollToIndex({ index: targetIndex, animated: true });
        }
      }}
    />
  );
});

// Memoized list item component
const ListItemComponent = memo<{ item: ListItem; onPress: () => void }>(
  ({ item, onPress }) => (
    <Pressable 
      onPress={onPress}
      className="flex-row items-center p-4 bg-white active:bg-gray-50"
    >
      <View className="flex-1">
        <Text className="text-lg font-semibold">{item.title}</Text>
        <Text className="text-gray-600">{item.description}</Text>
      </View>
    </Pressable>
  )
);

ListItemComponent.displayName = 'ListItemComponent';

// Separator component
const ItemSeparator = memo(() => <View className="h-px bg-gray-200" />);
ItemSeparator.displayName = 'ItemSeparator';

// Empty state component
const EmptyState = memo(() => (
  <View className="flex-1 items-center justify-center p-8">
    <Text className="text-gray-500">No items found</Text>
  </View>
));
EmptyState.displayName = 'EmptyState';
```

## Screen Architecture

### Screen Component Pattern

```tsx
import { memo, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Screen props extend ScrollView or View based on content
interface ProfileScreenProps extends ScrollViewProps {
  userId?: string;
}

export const ProfileScreen = memo<ProfileScreenProps>(
  ({ userId, ...scrollViewProps }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);
    
    // Data fetching with Expo
    const { data: user, loading, error, refetch } = useUser(userId);
    
    // Handle navigation
    const handleEditPress = useCallback(() => {
      navigation.navigate('EditProfile', { userId: user?.id });
    }, [navigation, user?.id]);
    
    // Programmatic scroll example
    useEffect(() => {
      if (user?.hasNewContent) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    }, [user?.hasNewContent]);
    
    if (loading) return <LoadingScreen />;
    if (error) return <ErrorScreen error={error} onRetry={refetch} />;
    
    return (
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        {...scrollViewProps}
      >
        <View className="p-4">
          <ProfileHeader user={user} onEditPress={handleEditPress} />
          <ProfileContent user={user} />
        </View>
      </ScrollView>
    );
  }
);

ProfileScreen.displayName = 'ProfileScreen';
```

## Navigation with React Navigation (NOT Expo Router)

### Navigation Setup

```tsx
// navigation/RootNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Type-safe navigation
export type RootStackParamList = {
  Main: undefined;
  Profile: { userId: string };
  EditProfile: { userId: string };
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Tab Navigator
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#3B82F6',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
      },
    }}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Root Navigator
export const RootNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen 
        name="Main" 
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={({ route }) => ({
          title: 'Profile',
          headerBackTitle: 'Back',
        })}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ 
          presentation: 'modal',
          title: 'Edit Profile',
        }}
      />
    </Stack.Navigator>
  </NavigationContainer>
);
```

### Type-Safe Navigation Hook

```tsx
// hooks/useTypedNavigation.ts
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

export const useTypedNavigation = () => 
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();

// Usage in components
const MyComponent = () => {
  const navigation = useTypedNavigation();
  
  const handlePress = () => {
    // Type-safe navigation
    navigation.navigate('Profile', { userId: '123' });
  };
};
```

## State Management Patterns

### Context with Proper Types

```tsx
import { createContext, useContext, useReducer, type ReactNode } from 'react';

// State types
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  isOnline: boolean;
}

// Action types
type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_ONLINE'; payload: boolean };

// Context type
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Helper methods
  setUser: (user: User | null) => void;
  toggleTheme: () => void;
  setOnlineStatus: (isOnline: boolean) => void;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };
    default:
      return state;
  }
};

// Provider component
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, {
    user: null,
    theme: 'light',
    isOnline: true,
  });
  
  // Helper methods
  const setUser = (user: User | null) => 
    dispatch({ type: 'SET_USER', payload: user });
    
  const toggleTheme = () => 
    dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' });
    
  const setOnlineStatus = (isOnline: boolean) =>
    dispatch({ type: 'SET_ONLINE', payload: isOnline });
  
  return (
    <AppContext.Provider value={{ 
      state, 
      dispatch, 
      setUser, 
      toggleTheme, 
      setOnlineStatus 
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook with type safety
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
```

## Expo-Specific Patterns

### Using Expo SDK Features

```tsx
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { Camera } from 'expo-camera';

// Image picker with proper permissions
export const useImagePicker = () => {
  const pickImage = async (): Promise<string | null> => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'We need camera roll permissions');
      return null;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      return result.assets[0].uri;
    }
    
    return null;
  };
  
  return { pickImage };
};

// File system operations
export const useCachedImage = (url: string) => {
  const [localUri, setLocalUri] = useState<string | null>(null);
  
  useEffect(() => {
    const cacheImage = async () => {
      const filename = url.split('/').pop();
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (fileInfo.exists) {
        setLocalUri(fileUri);
      } else {
        const downloadResult = await FileSystem.downloadAsync(url, fileUri);
        setLocalUri(downloadResult.uri);
      }
    };
    
    cacheImage();
  }, [url]);
  
  return localUri;
};
```

## Performance Optimizations

### Memoization Patterns

```tsx
// ✅ GOOD - Proper memoization
import { memo, useMemo, useCallback } from 'react';

interface ExpensiveListProps {
  data: Item[];
  filter: string;
  onItemSelect: (item: Item) => void;
}

export const ExpensiveList = memo<ExpensiveListProps>(
  ({ data, filter, onItemSelect }) => {
    // Memoize filtered data
    const filteredData = useMemo(
      () => data.filter(item => 
        item.name.toLowerCase().includes(filter.toLowerCase())
      ),
      [data, filter]
    );
    
    // Memoize callback
    const handleItemPress = useCallback(
      (item: Item) => {
        // Expensive operation
        Analytics.track('item_selected', { itemId: item.id });
        onItemSelect(item);
      },
      [onItemSelect]
    );
    
    // Memoize render function
    const renderItem = useCallback(
      ({ item }: { item: Item }) => (
        <ItemComponent 
          item={item} 
          onPress={() => handleItemPress(item)}
        />
      ),
      [handleItemPress]
    );
    
    return (
      <FlashList
        data={filteredData}
        renderItem={renderItem}
        estimatedItemSize={60}
        keyExtractor={item => item.id}
      />
    );
  }
);

ExpensiveList.displayName = 'ExpensiveList';
```

## Error Boundaries

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, Button } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry or crash analytics
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }
  
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-xl font-bold mb-2">Something went wrong</Text>
          <Text className="text-gray-600 text-center mb-4">
            {this.state.error?.message}
          </Text>
          <Button title="Try Again" onPress={this.handleReset} />
        </View>
      );
    }
    
    return this.props.children;
  }
}
```

## Accessibility Patterns

```tsx
// ✅ GOOD - Proper accessibility
export const AccessibleButton = memo<ButtonProps>(
  ({ label, onPress, disabled, ...props }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityHint={`Tap to ${label.toLowerCase()}`}
      className="px-4 py-3 bg-blue-500 rounded-lg active:opacity-90"
      {...props}
    >
      <Text className="text-white font-semibold">{label}</Text>
    </Pressable>
  )
);

// List with accessibility
export const AccessibleList = ({ items }: { items: Item[] }) => (
  <FlashList
    data={items}
    renderItem={({ item, index }) => (
      <View
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Item ${index + 1} of ${items.length}: ${item.title}`}
      >
        <Text>{item.title}</Text>
      </View>
    )}
    keyExtractor={item => item.id}
    estimatedItemSize={60}
  />
);
```

## Quality Checklist

### Component Requirements
- [ ] Props extend root component props (ViewProps, PressableProps, etc.)
- [ ] ForwardRef implemented for interactive components
- [ ] Memo applied for performance
- [ ] DisplayName set for debugging
- [ ] Style overrides available (containerStyle, textStyle, etc.)
- [ ] NativeWind classes with cn() utility
- [ ] Accessibility props properly set

### List Requirements
- [ ] FlashList used (NOT FlatList)
- [ ] Estimated item size provided
- [ ] Key extractor implemented
- [ ] Render functions memoized
- [ ] Empty state component
- [ ] Ref forwarded for programmatic control

### Screen Requirements  
- [ ] Safe area insets applied
- [ ] Navigation properly typed
- [ ] Loading/error states handled
- [ ] ScrollView ref for programmatic scroll
- [ ] Error boundary wrapped

### Performance Requirements
- [ ] Heavy computations memoized
- [ ] Callbacks wrapped in useCallback
- [ ] Lists use FlashList
- [ ] Images cached with Expo FileSystem
- [ ] Re-renders minimized with memo

### Testing Requirements (NOT Jest)
- [ ] Using React Native Testing Library
- [ ] Using Detox for E2E (Expo compatible)
- [ ] Components have testID props
- [ ] Accessibility identifiers set
- [ ] Snapshot tests for UI components

Remember: Always extend base component props for full type safety and accessibility support!
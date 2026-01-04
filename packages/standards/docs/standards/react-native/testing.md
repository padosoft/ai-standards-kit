# React Native Testing Standards

> **Extends**: `/docs/standards/global/testing.md`
> 
> This document provides **React Native-specific** testing implementations and patterns. Apply these mobile-specific testing strategies while following global testing principles.

## React Native Testing Environment Setup

### Test Configuration (Jest + React Native Testing Library)
```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts',
    '@testing-library/jest-native/extend-expect'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-navigation|@react-navigation|react-native-vector-icons|react-native-gesture-handler)/)',
  ],
  moduleNameMapping: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/**/__tests__/**/*',
    '!src/**/*.stories.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Test Setup File
```typescript
// src/test/setup.ts
import 'react-native-gesture-handler/jestSetup';
import '@testing-library/jest-native/extend-expect';
import { jest } from '@jest/globals';

// Mock react-native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      canGoBack: jest.fn(() => true),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: (callback: () => void) => callback(),
  };
});

// Mock react-native-permissions
jest.mock('react-native-permissions', () => {
  return {
    PERMISSIONS: {
      ANDROID: {
        CAMERA: 'android.permission.CAMERA',
        READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      },
      IOS: {
        CAMERA: 'ios.permission.CAMERA',
        PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
      },
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      BLOCKED: 'blocked',
      UNAVAILABLE: 'unavailable',
    },
    request: jest.fn(() => Promise.resolve('granted')),
    check: jest.fn(() => Promise.resolve('granted')),
  };
});

// Mock NetInfo
jest.mock('@react-native-netinfo/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Global test utilities
global.testUtils = {
  // Create mock navigation prop
  createMockNavigation: (overrides = {}) => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    isFocused: jest.fn(() => true),
    ...overrides,
  }),
  
  // Create mock route prop
  createMockRoute: (params = {}) => ({
    key: 'test-route',
    name: 'TestScreen',
    params,
  }),
  
  // Wait for async operations
  waitForAsync: () => new Promise(resolve => setImmediate(resolve)),
};
```

## Component Testing Patterns

### Basic Component Testing
```tsx
// src/components/__tests__/Button.test.tsx
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    render(<Button title="Press me" onPress={jest.fn()} />);
    
    expect(screen.getByText('Press me')).toBeTruthy();
  });
  
  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    render(<Button title="Press me" onPress={mockOnPress} />);
    
    fireEvent.press(screen.getByText('Press me'));
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
  
  it('is disabled when disabled prop is true', () => {
    render(
      <Button title="Press me" onPress={jest.fn()} disabled={true} />
    );
    
    const button = screen.getByText('Press me');
    expect(button).toBeDisabled();
  });
  
  it('applies custom styles correctly', () => {
    const customStyle = { backgroundColor: 'red' };
    render(
      <Button
        title="Press me"
        onPress={jest.fn()}
        style={customStyle}
        testID="custom-button"
      />
    );
    
    const button = screen.getByTestId('custom-button');
    expect(button).toHaveStyle(customStyle);
  });
  
  it('handles long press events', () => {
    const mockOnLongPress = jest.fn();
    render(
      <Button
        title="Press me"
        onPress={jest.fn()}
        onLongPress={mockOnLongPress}
      />
    );
    
    fireEvent(screen.getByText('Press me'), 'onLongPress');
    
    expect(mockOnLongPress).toHaveBeenCalledTimes(1);
  });
});
```

### Form Component Testing
```tsx
// src/components/__tests__/LoginForm.test.tsx
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { LoginForm } from '../LoginForm';

describe('LoginForm Component', () => {
  const mockOnSubmit = jest.fn();
  
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });
  
  it('renders email and password inputs', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByText('Login')).toBeTruthy();
  });
  
  it('updates input values when user types', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    
    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });
  
  it('shows validation errors for invalid input', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const loginButton = screen.getByText('Login');
    
    // Try to submit with invalid email
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeTruthy();
    });
  });
  
  it('submits form with valid data', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const loginButton = screen.getByText('Login');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
  
  it('shows loading state during submission', async () => {
    const slowSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<LoginForm onSubmit={slowSubmit} />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const loginButton = screen.getByText('Login');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);
    
    // Should show loading state
    expect(screen.getByText('Logging in...')).toBeTruthy();
    expect(loginButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.getByText('Login')).toBeTruthy();
      expect(loginButton).not.toBeDisabled();
    });
  });
});
```

### List Component Testing
```tsx
// src/components/__tests__/UserList.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { UserList } from '../UserList';

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
];

describe('UserList Component', () => {
  it('renders list of users', () => {
    render(<UserList users={mockUsers} onUserPress={jest.fn()} />);
    
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Jane Smith')).toBeTruthy();
    expect(screen.getByText('Bob Johnson')).toBeTruthy();
  });
  
  it('calls onUserPress when user item is pressed', () => {
    const mockOnUserPress = jest.fn();
    render(<UserList users={mockUsers} onUserPress={mockOnUserPress} />);
    
    fireEvent.press(screen.getByText('John Doe'));
    
    expect(mockOnUserPress).toHaveBeenCalledWith(mockUsers[0]);
  });
  
  it('shows empty state when no users', () => {
    render(<UserList users={[]} onUserPress={jest.fn()} />);
    
    expect(screen.getByText('No users found')).toBeTruthy();
  });
  
  it('shows loading state', () => {
    render(<UserList users={[]} onUserPress={jest.fn()} loading={true} />);
    
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });
  
  it('handles pull to refresh', () => {
    const mockOnRefresh = jest.fn();
    render(
      <UserList
        users={mockUsers}
        onUserPress={jest.fn()}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />
    );
    
    const flatList = screen.getByTestId('user-list');
    fireEvent(flatList, 'onRefresh');
    
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });
  
  it('handles end reached for pagination', () => {
    const mockOnEndReached = jest.fn();
    render(
      <UserList
        users={mockUsers}
        onUserPress={jest.fn()}
        onEndReached={mockOnEndReached}
      />
    );
    
    const flatList = screen.getByTestId('user-list');
    fireEvent(flatList, 'onEndReached');
    
    expect(mockOnEndReached).toHaveBeenCalledTimes(1);
  });
});
```

## Screen Testing

### Screen Component Testing
```tsx
// src/screens/__tests__/ProfileScreen.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileScreen } from '../ProfileScreen';
import { AuthContext } from '../../contexts/AuthContext';
import * as userService from '../../services/userService';

// Mock the user service
jest.mock('../../services/userService');
const mockUserService = userService as jest.Mocked<typeof userService>;

describe('ProfileScreen', () => {
  const mockNavigation = global.testUtils.createMockNavigation();
  const mockRoute = global.testUtils.createMockRoute({ userId: '123' });
  
  const mockAuthContext = {
    user: { id: '123', name: 'John Doe', email: 'john@example.com' },
    logout: jest.fn(),
    updateUser: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  const renderWithContext = () => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <ProfileScreen navigation={mockNavigation} route={mockRoute} />
      </AuthContext.Provider>
    );
  };
  
  it('displays user information', () => {
    renderWithContext();
    
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('john@example.com')).toBeTruthy();
  });
  
  it('navigates to edit profile screen when edit button is pressed', () => {
    renderWithContext();
    
    fireEvent.press(screen.getByText('Edit Profile'));
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile', {
      user: mockAuthContext.user,
    });
  });
  
  it('handles logout correctly', async () => {
    renderWithContext();
    
    fireEvent.press(screen.getByText('Logout'));
    
    await waitFor(() => {
      expect(mockAuthContext.logout).toHaveBeenCalledTimes(1);
    });
  });
  
  it('shows loading state while fetching user data', () => {
    mockUserService.getUserProfile.mockReturnValue(
      new Promise(() => {}) // Never resolves
    );
    
    renderWithContext();
    
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });
  
  it('handles error state when user data fails to load', async () => {
    mockUserService.getUserProfile.mockRejectedValue(
      new Error('Failed to load user')
    );
    
    renderWithContext();
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load profile')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });
  });
  
  it('retries loading user data when retry button is pressed', async () => {
    mockUserService.getUserProfile
      .mockRejectedValueOnce(new Error('Failed to load user'))
      .mockResolvedValueOnce(mockAuthContext.user);
    
    renderWithContext();
    
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeTruthy();
    });
    
    fireEvent.press(screen.getByText('Retry'));
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeTruthy();
    });
  });
});
```

### Navigation Testing
```tsx
// src/navigation/__tests__/AppNavigator.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from '../AppNavigator';
import { AuthContext } from '../../contexts/AuthContext';

describe('AppNavigator', () => {
  const mockAuthContext = {
    user: null,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
  };
  
  const renderWithAuth = (contextValue = mockAuthContext) => {
    return render(
      <NavigationContainer>
        <AuthContext.Provider value={contextValue}>
          <AppNavigator />
        </AuthContext.Provider>
      </NavigationContainer>
    );
  };
  
  it('shows login screen when user is not authenticated', () => {
    renderWithAuth();
    
    expect(screen.getByText('Login')).toBeTruthy();
  });
  
  it('shows main app when user is authenticated', () => {
    const authenticatedContext = {
      ...mockAuthContext,
      user: { id: '123', name: 'John Doe' },
    };
    
    renderWithAuth(authenticatedContext);
    
    expect(screen.getByText('Home')).toBeTruthy();
  });
  
  it('shows loading screen while authentication is being checked', () => {
    const loadingContext = {
      ...mockAuthContext,
      isLoading: true,
    };
    
    renderWithAuth(loadingContext);
    
    expect(screen.getByTestId('loading-screen')).toBeTruthy();
  });
});
```

## Hook Testing

### Custom Hook Testing
```tsx
// src/hooks/__tests__/useAuth.test.tsx
import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../useAuth';
import * as authService from '../../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../services/authService');
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });
  
  it('initializes with no user and not loading', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
  
  it('logs in user successfully', async () => {
    const mockUser = { id: '123', name: 'John Doe' };
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      token: 'mock-token',
    });
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(result.current.user).toEqual(mockUser);
    expect(mockAuthService.login).toHaveBeenCalledWith(
      'test@example.com',
      'password'
    );
  });
  
  it('handles login error', async () => {
    mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrong-password');
      } catch (error) {
        expect(error.message).toBe('Invalid credentials');
      }
    });
    
    expect(result.current.user).toBeNull();
  });
  
  it('logs out user', async () => {
    const mockUser = { id: '123', name: 'John Doe' };
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      token: 'mock-token',
    });
    
    const { result } = renderHook(() => useAuth());
    
    // First login
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(result.current.user).toEqual(mockUser);
    
    // Then logout
    await act(async () => {
      result.current.logout();
    });
    
    expect(result.current.user).toBeNull();
  });
  
  it('persists authentication state', async () => {
    const mockUser = { id: '123', name: 'John Doe' };
    AsyncStorage.setItem('@auth_token', 'existing-token');
    mockAuthService.verifyToken.mockResolvedValue(mockUser);
    
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      // Wait for initial authentication check
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.user).toEqual(mockUser);
  });
});
```

### API Hook Testing
```tsx
// src/hooks/__tests__/useUserData.test.tsx
import { renderHook, act } from '@testing-library/react-native';
import { useUserData } from '../useUserData';
import * as userService from '../../services/userService';

jest.mock('../../services/userService');
const mockUserService = userService as jest.Mocked<typeof userService>;

describe('useUserData Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('fetches user data on mount', async () => {
    const mockUsers = [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Smith' },
    ];
    mockUserService.getUsers.mockResolvedValue(mockUsers);
    
    const { result } = renderHook(() => useUserData());
    
    expect(result.current.loading).toBe(true);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
  
  it('handles API error', async () => {
    const mockError = new Error('Network error');
    mockUserService.getUsers.mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useUserData());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.users).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });
  
  it('refetches data when refresh is called', async () => {
    const initialUsers = [{ id: '1', name: 'John Doe' }];
    const updatedUsers = [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Smith' },
    ];
    
    mockUserService.getUsers
      .mockResolvedValueOnce(initialUsers)
      .mockResolvedValueOnce(updatedUsers);
    
    const { result } = renderHook(() => useUserData());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.users).toEqual(initialUsers);
    
    await act(async () => {
      result.current.refresh();
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.users).toEqual(updatedUsers);
    expect(mockUserService.getUsers).toHaveBeenCalledTimes(2);
  });
});
```

## E2E Testing with Detox

### E2E Test Configuration
```javascript
// e2e/jest.config.js
module.exports = {
  maxWorkers: 1,
  testTimeout: 120000,
  testRegex: '\\.e2e\\.js$',
  verbose: true,
  setupFilesAfterEnv: ['./init.js'],
};
```

### E2E Test Setup
```javascript
// e2e/init.js
const { device, expect, element, by } = require('detox');

describe('App E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });
});
```

### E2E Test Examples
```javascript
// e2e/loginFlow.e2e.js
const { device, expect, element, by } = require('detox');

describe('Login Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login with valid credentials', async () => {
    // Navigate to login screen
    await element(by.id('login-button')).tap();
    
    // Fill in credentials
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    
    // Submit form
    await element(by.id('submit-button')).tap();
    
    // Verify successful login
    await expect(element(by.id('home-screen'))).toBeVisible();
    await expect(element(by.text('Welcome back!'))).toBeVisible();
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('login-button')).tap();
    
    await element(by.id('email-input')).typeText('invalid@example.com');
    await element(by.id('password-input')).typeText('wrongpassword');
    
    await element(by.id('submit-button')).tap();
    
    await expect(element(by.text('Invalid credentials'))).toBeVisible();
  });

  it('should navigate between screens', async () => {
    // Login first
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('submit-button')).tap();
    
    // Navigate to profile
    await element(by.id('profile-tab')).tap();
    await expect(element(by.id('profile-screen'))).toBeVisible();
    
    // Navigate to settings
    await element(by.id('settings-button')).tap();
    await expect(element(by.id('settings-screen'))).toBeVisible();
  });
});
```

## Performance Testing

### React Native Performance Testing
```tsx
// src/test/performance/ListPerformance.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { UserList } from '../../components/UserList';

describe('UserList Performance', () => {
  it('renders large list efficiently', () => {
    const largeUserList = Array.from({ length: 1000 }, (_, index) => ({
      id: index.toString(),
      name: `User ${index}`,
      email: `user${index}@example.com`,
    }));
    
    const startTime = performance.now();
    
    render(<UserList users={largeUserList} onUserPress={jest.fn()} />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within reasonable time (< 100ms)
    expect(renderTime).toBeLessThan(100);
  });
  
  it('handles frequent updates without performance degradation', () => {
    const { rerender } = render(
      <UserList users={[]} onUserPress={jest.fn()} />
    );
    
    const updateTimes: number[] = [];
    
    // Perform multiple updates and measure time
    for (let i = 0; i < 50; i++) {
      const users = Array.from({ length: 10 }, (_, index) => ({
        id: `${i}-${index}`,
        name: `User ${i}-${index}`,
        email: `user${i}${index}@example.com`,
      }));
      
      const startTime = performance.now();
      rerender(<UserList users={users} onUserPress={jest.fn()} />);
      const endTime = performance.now();
      
      updateTimes.push(endTime - startTime);
    }
    
    // Average update time should be reasonable
    const averageTime = updateTimes.reduce((a, b) => a + b) / updateTimes.length;
    expect(averageTime).toBeLessThan(10);
    
    // No single update should take too long
    const maxTime = Math.max(...updateTimes);
    expect(maxTime).toBeLessThan(50);
  });
});
```

## Testing Utilities

### Custom Render Helpers
```tsx
// src/test/testUtils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext, AuthContextType } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

interface CustomRenderOptions extends RenderOptions {
  authContext?: Partial<AuthContextType>;
  navigationOptions?: object;
}

const mockAuthContext: AuthContextType = {
  user: null,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
};

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { authContext = {}, navigationOptions = {}, ...renderOptions } = options;
  
  const authValue = { ...mockAuthContext, ...authContext };
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <NavigationContainer {...navigationOptions}>
      <ThemeProvider>
        <AuthContext.Provider value={authValue}>
          {children}
        </AuthContext.Provider>
      </ThemeProvider>
    </NavigationContainer>
  );
  
  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Export everything from React Native Testing Library
export * from '@testing-library/react-native';

// Mock factory functions
export const createMockUser = (overrides = {}) => ({
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  ...overrides,
});

export const createMockApiResponse = <T>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const createMockApiError = (message: string, delay = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), delay);
  });
};
```

## React Native Testing Best Practices

### Accessibility Testing
```tsx
it('has proper accessibility labels', () => {
  render(<Button title="Submit" onPress={jest.fn()} />);
  
  const button = screen.getByRole('button');
  expect(button).toHaveAccessibilityLabel('Submit');
  expect(button).toHaveAccessibilityHint('Double tap to submit the form');
});
```

### Platform-Specific Testing
```tsx
import { Platform } from 'react-native';

describe('Platform-specific behavior', () => {
  it('shows iOS-specific elements on iOS', () => {
    Platform.OS = 'ios';
    
    render(<HeaderComponent />);
    
    expect(screen.getByTestId('ios-back-button')).toBeTruthy();
  });
  
  it('shows Android-specific elements on Android', () => {
    Platform.OS = 'android';
    
    render(<HeaderComponent />);
    
    expect(screen.getByTestId('android-menu-button')).toBeTruthy();
  });
});
```

## React Native Testing Checklist

### Component Tests
- [ ] All components render correctly with required props
- [ ] All user interactions (press, long press, swipe) tested
- [ ] All component states (loading, error, success) tested
- [ ] All conditional rendering tested
- [ ] All accessibility features tested

### Screen Tests
- [ ] Screen navigation tested with mock navigation
- [ ] Screen parameters handling tested
- [ ] Screen lifecycle methods tested
- [ ] Error states and retry mechanisms tested
- [ ] Back button and hardware button handling tested

### Hook Tests
- [ ] All custom hooks tested in isolation
- [ ] Hook state changes tested with act()
- [ ] Hook cleanup tested
- [ ] Hook error handling tested
- [ ] Hook dependencies and re-renders tested

### Integration Tests
- [ ] Full user flows tested end-to-end
- [ ] API integration tested with mocked services
- [ ] Navigation flows tested
- [ ] Data persistence tested
- [ ] Device features (camera, permissions) mocked and tested

### Performance Tests
- [ ] Large list rendering performance tested
- [ ] Frequent update performance tested
- [ ] Memory usage monitored
- [ ] Animation performance considered

Remember: React Native tests should focus on user behavior and interactions while properly mocking platform-specific APIs and external dependencies.

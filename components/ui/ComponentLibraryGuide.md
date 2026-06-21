# PlayPBNow Component Library Guide

This guide documents design patterns and conventions for all components in PlayPBNow. All new components should follow these patterns to maintain consistency across the app.

---

## Architecture

### Centralized API Client

All API calls must go through the centralized `ApiClient` singleton and the `useApi` hook.

**File:** `/lib/api/ApiClient.ts`

**Never use raw `fetch()` calls.** Always use:

```typescript
import { useApi } from '@/hooks/useApi';

// In component:
const { data: players, loading, error, refetch } = useApi<Player[]>('GET', '/api/players');
```

### Error Handling

Wrap components with `ErrorBoundary` to catch component errors:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

Use `LoadingBoundary` for request states:

```typescript
import { LoadingBoundary } from '@/components/LoadingBoundary';

<LoadingBoundary isLoading={loading} error={error} skeleton={<SkeletonList />}>
  <PlayerList players={players} />
</LoadingBoundary>
```

---

## Spacing System

Use an 8px grid system for all spacing:

```
Spacing values: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64
```

**StyleSheet example:**

```typescript
const styles = StyleSheet.create({
  container: {
    padding: 16, // 2 units
    marginBottom: 12, // 1.5 units
    gap: 8, // 1 unit
  },
});
```

---

## Typography

### Font Sizes

- **Display/Heading:** 24px, 20px, 18px (for screens, titles)
- **Body Large:** 16px (primary text)
- **Body Regular:** 14px (default text, descriptions)
- **Body Small:** 12px (labels, captions)

### Font Weights

Use these constants from `/constants/theme`:

- **Regular:** 400
- **Medium:** 500
- **Semibold:** 600
- **Bold:** 700
- **Extrabold:** 800
- **Black:** 900

**Example:**

```typescript
<Text style={{ fontSize: 16, fontWeight: '600' }}>Semibold text</Text>
```

### Line Height

- Body text: `lineHeight = fontSize * 1.5` (e.g., 16px → 24px line height)
- Headings: `lineHeight = fontSize * 1.2`

---

## Colors

Colors are managed via `ThemeContext`. Access via `useTheme()` hook:

```typescript
import { useTheme } from '@/context/ThemeContext';

const { colors } = useTheme();

return (
  <View style={{ backgroundColor: colors.background }}>
    <Text style={{ color: colors.text }}>Hello</Text>
  </View>
);
```

### Core Color Values

- **Primary:** `#3b82f6` (blue)
- **Success:** `#10b981` (green)
- **Danger:** `#dc2626` (red)
- **Warning:** `#f59e0b` (orange)
- **Background:** `#ffffff` (light) / `#1f2937` (dark)
- **Text:** `#1f2937` (light) / `#f9fafb` (dark)
- **Border:** `#e5e7eb` (light) / `#374151` (dark)

---

## Buttons

### Button Styles

Use consistent button patterns with TouchableOpacity:

```typescript
const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },

  dangerButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
});
```

### Button States

Always handle loading and disabled states:

```typescript
<TouchableOpacity
  disabled={loading || disabled}
  style={[
    styles.primaryButton,
    (loading || disabled) && styles.buttonDisabled,
  ]}
  onPress={handlePress}
>
  {loading ? (
    <ActivityIndicator size="small" color="#ffffff" />
  ) : (
    <Text style={styles.primaryButtonText}>Save</Text>
  )}
</TouchableOpacity>
```

---

## Inputs & Forms

### Text Input

```typescript
<TextInput
  style={styles.input}
  placeholder="Enter player name"
  placeholderTextColor="#9ca3af"
  value={value}
  onChangeText={setValue}
  editable={!loading}
/>
```

### Input Styles

```typescript
const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fee2e2',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
});
```

### Form Validation Example

```typescript
function PlayerForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { execute, loading, error } = useApi('POST', '/api/players', { immediate: false });
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async () => {
    try {
      const result = await execute({ name });
      onSubmit(result);
    } catch (err) {
      if (err instanceof ValidationError) {
        setErrors(err.fields);
      }
    }
  };

  return (
    <View>
      <TextInput
        style={[styles.input, errors.name && styles.inputError]}
        value={name}
        onChangeText={setName}
        placeholder="Player name"
      />
      {errors.name && <Text style={styles.errorText}>{errors.name[0]}</Text>}

      <TouchableOpacity
        disabled={loading}
        style={styles.primaryButton}
        onPress={handleSubmit}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
```

---

## Cards

### Card Layout

Cards should have consistent padding and shadows:

```typescript
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    // Shadow (iOS)
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Elevation (Android)
    elevation: 3,
  },
});
```

### Card Content Example

```typescript
function PlayerCard({ player }: { player: Player }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{player.name}</Text>
        <BrandedIcon name="chevron-right" size={20} color="#9ca3af" strokeWidth={2} />
      </View>
      <Text style={styles.cardSubtitle}>{player.skillLevel}</Text>
    </View>
  );
}
```

---

## Lists

### FlatList/ScrollView

Always include key extraction and optimize rendering:

```typescript
<FlatList
  data={players}
  keyExtractor={(item) => item.id.toString()}
  renderItem={({ item }) => <PlayerCard player={item} />}
  scrollEnabled={true}
  contentContainerStyle={styles.listContainer}
/>
```

### Empty State

Show meaningful UI when list is empty:

```typescript
function PlayerList({ players }: { players: Player[] }) {
  return (
    <View style={styles.container}>
      {players.length === 0 ? (
        <EmptyState
          icon="players"
          title="No players yet"
          message="Invite your first player to get started"
          action={{
            label: 'Add Player',
            onPress: () => navigation.navigate('NewPlayer'),
          }}
        />
      ) : (
        <FlatList
          data={players}
          renderItem={({ item }) => <PlayerCard player={item} />}
          keyExtractor={(item) => item.id.toString()}
        />
      )}
    </View>
  );
}
```

---

## Loading States

### Skeleton Loaders

Use skeleton components while data loads:

```typescript
import { LoadingBoundary, SkeletonList, SkeletonCard } from '@/components/LoadingBoundary';

function GroupsScreen() {
  const { data: groups, loading, error } = useApi<Group[]>('GET', '/api/groups');

  return (
    <LoadingBoundary
      isLoading={loading}
      error={error}
      skeleton={<SkeletonList count={5} />}
    >
      <GroupList groups={groups} />
    </LoadingBoundary>
  );
}
```

### Activity Indicators

Use for smaller loading states:

```typescript
{loading && <ActivityIndicator size="large" color="#3b82f6" />}
```

---

## Error States

### Error Messages

Always provide helpful error messages:

```typescript
<View style={styles.errorContainer}>
  <BrandedIcon name="warning" size={48} color="#dc2626" strokeWidth={1.5} />
  <Text style={styles.errorTitle}>Failed to load players</Text>
  <Text style={styles.errorMessage}>
    {error?.message || 'An unexpected error occurred'}
  </Text>
  <TouchableOpacity style={styles.retryButton} onPress={refetch}>
    <Text style={styles.retryButtonText}>Try Again</Text>
  </TouchableOpacity>
</View>
```

---

## Modals

### Modal Structure

```typescript
import { Modal, View, Text, TouchableOpacity } from 'react-native';

function ConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: ModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onCancel}
            >
              <Text style={styles.secondaryButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onConfirm}
            >
              <Text style={styles.primaryButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

### Modal Styles

```typescript
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
});
```

---

## Animations

### Duration

- **Quick:** 200ms (micro-interactions)
- **Normal:** 300ms (standard transitions)
- **Slow:** 500ms (complex animations)

### Easing

Use consistent easing functions:

```typescript
import { Easing } from 'react-native';

Animated.timing(animValue, {
  toValue: 1,
  duration: 300,
  easing: Easing.inOut(Easing.ease),
  useNativeDriver: true,
}).start();
```

---

## Icons

### Using BrandedIcon

All icons go through the centralized `BrandedIcon` component:

```typescript
import { BrandedIcon } from '@/components/BrandedIcon';

<BrandedIcon
  name="players"
  size={24}
  color="#3b82f6"
  strokeWidth={2}
/>
```

### Available Icons

See `BrandedIcon.tsx` for full list. Common ones:

- Navigation: `groups`, `playnow`, `players`, `leaderboard`
- Actions: `add`, `edit`, `trash`, `save`, `share`
- Status: `checkmark`, `warning`, `lock`, `connection`
- UI: `close`, `menu`, `chevron-right`, `back`, `refresh`

---

## Accessibility

### Labels and Descriptions

Always add semantic labels to touch targets:

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Delete player"
  accessibilityHint="Long press to delete this player"
  onPress={handleDelete}
>
  <BrandedIcon name="trash" size={24} color="#dc2626" />
</TouchableOpacity>
```

### Color Contrast

Ensure text has sufficient contrast:

- Normal text: minimum 4.5:1 contrast ratio
- Large text (18pt+): minimum 3:1 contrast ratio

---

## Testing

### Component Testing Pattern

```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected text')).toBeTruthy();
  });

  it('handles user interaction', () => {
    const onPress = jest.fn();
    render(<MyComponent onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

---

## Performance Tips

### Memoization

Use `React.memo` for expensive component renders:

```typescript
const PlayerCard = React.memo(({ player }: { player: Player }) => {
  return (
    <View style={styles.card}>
      <Text>{player.name}</Text>
    </View>
  );
});
```

### useMemo and useCallback

Optimize expensive computations and callbacks:

```typescript
const filteredPlayers = useMemo(
  () => players.filter((p) => p.level === level),
  [players, level]
);

const handlePress = useCallback(() => {
  navigation.navigate('Detail', { id });
}, [navigation, id]);
```

### Lazy Loading

Load data on demand:

```typescript
const { execute: loadMore } = useApi(
  'GET',
  '/api/players?page=2',
  { immediate: false }
);

const handleLoadMore = async () => {
  await loadMore();
};
```

---

## Summary

- **API:** Always use `useApi` hook, never raw `fetch()`
- **Errors:** Wrap with `ErrorBoundary`, use `LoadingBoundary` for states
- **Spacing:** Use 8px grid system
- **Colors:** Use `useTheme()` hook
- **Buttons:** Follow button style patterns
- **Typography:** Use consistent font sizes and weights
- **Icons:** Use `BrandedIcon` component
- **Accessibility:** Add labels and ensure contrast
- **Performance:** Use memoization where needed

For questions or improvements, refer to the codebase examples and discuss with the team.

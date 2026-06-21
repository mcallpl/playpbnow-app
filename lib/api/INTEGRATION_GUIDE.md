# API Client Integration Guide

This guide shows how to integrate the new ApiClient, useApi hook, and error boundaries into existing components.

## Step 1: Wrap App with ErrorBoundary

In `app/_layout.tsx`, wrap the entire app structure:

```typescript
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SubscriptionProvider>
          <ActiveMatchProvider>
            <BeaconProvider>
              <Stack>
                {/* Your routes */}
              </Stack>
            </BeaconProvider>
          </ActiveMatchProvider>
        </SubscriptionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

## Step 2: Replace Raw fetch() Calls with useApi

### Before (Raw fetch):
```typescript
function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/groups')
      .then(res => res.json())
      .then(data => {
        setGroups(data.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>{error}</Text>;
  return <FlatList data={groups} renderItem={...} />;
}
```

### After (useApi):
```typescript
import { useApi } from '@/hooks/useApi';
import { LoadingBoundary, SkeletonList } from '@/components/LoadingBoundary';

function GroupsScreen() {
  const { data: groups, loading, error, refetch } = useApi<Group[]>('GET', '/api/groups');

  return (
    <LoadingBoundary
      isLoading={loading}
      error={error}
      skeleton={<SkeletonList count={5} />}
      onRetry={refetch}
    >
      <FlatList data={groups} renderItem={...} />
    </LoadingBoundary>
  );
}
```

## Step 3: Handle POST/PUT/DELETE Requests

### POST (Create):
```typescript
function CreatePlayerScreen() {
  const { execute: createPlayer, loading } = useApi(
    'POST',
    '/api/players',
    { immediate: false }
  );

  const handleSubmit = async (name: string) => {
    try {
      const newPlayer = await createPlayer({ name });
      navigation.goBack();
    } catch (error) {
      if (error instanceof ValidationError) {
        setFieldErrors(error.fields);
      } else {
        showErrorAlert(error.message);
      }
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {/* Form fields */}
    </Form>
  );
}
```

### PUT (Update):
```typescript
function EditPlayerScreen({ playerId }: { playerId: string }) {
  const { execute: updatePlayer, loading } = useApi(
    'PUT',
    `/api/players/${playerId}`,
    { immediate: false }
  );

  const handleSave = async (updates: Partial<Player>) => {
    try {
      await updatePlayer(updates);
      navigation.goBack();
    } catch (error) {
      showErrorAlert(error.message);
    }
  };

  return (
    <Form onSubmit={handleSave}>
      {/* Form fields */}
    </Form>
  );
}
```

### DELETE:
```typescript
function DeletePlayerButton({ playerId }: { playerId: string }) {
  const { execute: deletePlayer, loading } = useApi(
    'DELETE',
    `/api/players/${playerId}`,
    { immediate: false }
  );

  const handleDelete = async () => {
    const confirmed = await showConfirmAlert('Delete player?');
    if (!confirmed) return;

    try {
      await deletePlayer();
      navigation.goBack();
    } catch (error) {
      showErrorAlert('Failed to delete player');
    }
  };

  return (
    <TouchableOpacity onPress={handleDelete} disabled={loading}>
      {loading ? <ActivityIndicator /> : <Text>Delete</Text>}
    </TouchableOpacity>
  );
}
```

## Step 4: Advanced Patterns

### Multiple Concurrent Requests:
```typescript
import { useApiMultiple } from '@/hooks/useApi';

function DashboardScreen() {
  const { data, loading, error, refetch } = useApiMultiple({
    groups: { method: 'GET', path: '/api/groups' },
    players: { method: 'GET', path: '/api/players' },
    stats: { method: 'GET', path: '/api/stats' },
  });

  return (
    <ScrollView>
      <LoadingBoundary isLoading={loading} error={error}>
        <GroupsWidget data={data.groups} />
        <PlayersWidget data={data.players} />
        <StatsWidget data={data.stats} />
      </LoadingBoundary>
    </ScrollView>
  );
}
```

### Refetch on Dependency Change:
```typescript
function PlayerDetailScreen({ playerId }: { playerId: string }) {
  const { data: player, refetch } = useApi<Player>(
    'GET',
    `/api/players/${playerId}`
  );

  // Refetch when playerId changes
  useEffect(() => {
    refetch();
  }, [playerId, refetch]);

  return <PlayerDetail player={player} />;
}
```

### Poll for Updates:
```typescript
function LiveMatchScreen({ matchId }: { matchId: string }) {
  const { data: match, refetch } = useApi<Match>(
    'GET',
    `/api/matches/${matchId}`
  );

  // Poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(refetch, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  return <MatchScoreboard match={match} />;
}
```

### Pagination:
```typescript
function PlayersListScreen() {
  const [page, setPage] = useState(1);
  const { data: players, refetch } = useApi<Player[]>(
    'GET',
    `/api/players?page=${page}`
  );

  const handleLoadMore = () => {
    setPage(page + 1);
  };

  return (
    <FlatList
      data={players}
      onEndReached={handleLoadMore}
      renderItem={...}
    />
  );
}
```

## Step 5: Error Handling Patterns

### Type-Specific Error Handling:
```typescript
import {
  ValidationError,
  AuthError,
  NotFoundError,
  RateLimitError,
} from '@/lib/api/types';

function savePlayer(data: any) {
  try {
    await execute(data);
  } catch (error) {
    if (error instanceof ValidationError) {
      // Show field-level errors
      setFieldErrors(error.fields);
    } else if (error instanceof AuthError) {
      // Redirect to login
      navigation.replace('/login');
    } else if (error instanceof NotFoundError) {
      // Show "not found" UI
      showErrorAlert('Player not found');
    } else if (error instanceof RateLimitError) {
      // Wait and retry
      showWarningAlert(
        `Too many requests. Try again in ${error.retryAfter}s`
      );
    } else {
      // Generic error handling
      showErrorAlert(error.message);
    }
  }
}
```

### Global Error Handling:
```typescript
// lib/api/errorHandler.ts
export function handleApiError(error: Error): string {
  if (error instanceof ValidationError) {
    return 'Please check the form for errors';
  }
  if (error instanceof AuthError) {
    // Trigger logout
    return 'Your session has expired. Please login again.';
  }
  if (error instanceof RateLimitError) {
    return 'Too many requests. Please wait a moment.';
  }
  return error.message || 'An unexpected error occurred';
}

// In component:
import { handleApiError } from '@/lib/api/errorHandler';

const handleSubmit = async () => {
  try {
    await execute();
  } catch (error) {
    const message = handleApiError(error as Error);
    showErrorAlert(message);
  }
};
```

## Step 6: Logging and Debugging

### Enable Development Logging:
The ApiClient automatically logs all requests in development mode. Check console:

```
[API] GET /api/players → 200
[API] POST /api/groups → 201
[API] GET /api/protected → 401
```

### Custom Request Logging:
```typescript
// lib/api/logger.ts
export class ApiLogger {
  static log(method: string, path: string, duration: number, status: number) {
    console.log(`[API] ${method} ${path} → ${status} (${duration}ms)`);
  }

  static error(method: string, path: string, code: string, message: string) {
    console.error(`[API] ${method} ${path} → ${code}`, message);
  }
}
```

## Migration Checklist

- [ ] Wrap app with `ErrorBoundary` in `_layout.tsx`
- [ ] Replace all raw `fetch()` calls with `useApi` hook
- [ ] Use `LoadingBoundary` for loading states
- [ ] Update error handling to use typed errors (ValidationError, AuthError, etc.)
- [ ] Test form submissions with validation errors
- [ ] Test 401 responses (token refresh/logout)
- [ ] Test network errors (offline mode)
- [ ] Test timeout scenarios
- [ ] Test pagination and polling patterns
- [ ] Add `onSuccess` and `onError` callbacks where needed
- [ ] Update component tests to mock `useApi` hook
- [ ] Remove any custom API client code

## Common Patterns

### Loading Data on Mount + Manual Refresh:
```typescript
const { data, loading, error, refetch } = useApi<Data>('GET', '/api/data');

return (
  <>
    {error && (
      <TouchableOpacity onPress={refetch}>
        <Text>Retry</Text>
      </TouchableOpacity>
    )}
    {loading && <ActivityIndicator />}
    {data && <DataView data={data} />}
  </>
);
```

### Form Submission with Loading:
```typescript
const { execute, loading, error } = useApi('POST', '/api/form', { immediate: false });

return (
  <TouchableOpacity disabled={loading} onPress={() => execute(formData)}>
    {loading ? <ActivityIndicator /> : <Text>Submit</Text>}
  </TouchableOpacity>
);
```

### Conditional Requests:
```typescript
const { execute: search } = useApi('GET', `/api/search?q=${query}`, {
  immediate: false,
});

const handleSearch = async () => {
  if (!query.trim()) return;
  await search();
};
```

---

## API Response Format

The backend must return responses in this format:

```json
{
  "status": "success",
  "data": { /* actual data */ },
  "error": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

Or on error:

```json
{
  "status": "error",
  "data": null,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "fields": {
      "name": ["Name is required"],
      "email": ["Invalid email format"]
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

For questions or examples, see the test files in `__tests__/ApiClient.test.ts`.

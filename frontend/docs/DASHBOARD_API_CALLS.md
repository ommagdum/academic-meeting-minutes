# Dashboard API Calls

When loading the Dashboard (`/dashboard`), the frontend makes **3 backend API calls** in parallel:

## API Endpoints Called

### 1. Dashboard Statistics
- **Endpoint:** `GET /api/v1/dashboard/stats`
- **Service Method:** `searchService.getDashboardStats()`
- **Purpose:** Get dashboard statistics (total meetings, processed count, etc.)
- **Timeout:** 15 seconds (with fallback to zeros)
- **Fallback:** Returns zeros for all stats if API fails

### 2. Recent Meetings
- **Endpoint:** `GET /api/v1/search/meetings/category/recent?page=0&size=5`
- **Service Method:** `searchService.searchByCategory('recent', 0, 5)`
- **Purpose:** Get 5 most recent meetings
- **Timeout:** 15 seconds (with fallback to empty array)
- **Fallback:** Returns empty results array if API fails

### 3. Upcoming Meetings
- **Endpoint:** `GET /api/v1/dashboard/upcoming-meetings?limit=5`
- **Service Method:** `searchService.getUpcomingMeetings(5)`
- **Purpose:** Get 5 upcoming meetings
- **Timeout:** 15 seconds (with fallback to empty array)
- **Fallback:** Returns empty array if API fails

## How They're Called

All 3 APIs are called in parallel using `Promise.all()`:
```typescript
const [statsResponse, recentMeetingsResponse, upcomingMeetingsResponse] = await Promise.all([
  // API 1: Dashboard stats
  // API 2: Recent meetings
  // API 3: Upcoming meetings
]);
```

## Timeout Protection

Each API call has a **15-second timeout** wrapper. If an API doesn't respond within 15 seconds:
- The request times out
- A fallback value is used
- Loading state is cleared
- Dashboard displays with fallback data

## Debugging

Check the browser console for logs:
- `[Dashboard] Loading dashboard data...`
- `[Dashboard] Fetching 3 APIs:`
- `[Dashboard] Stats loaded successfully:` (or error)
- `[Dashboard] Recent meetings loaded successfully:` (or error)
- `[Dashboard] Upcoming meetings loaded successfully:` (or error)
- `[Dashboard] All API calls completed`

## Common Issues

1. **Infinite Loading:** One of the 3 APIs is hanging
   - Check console logs to see which API is stuck
   - Check Network tab in DevTools to see request status
   - Timeout will trigger after 15 seconds per API

2. **401 Unauthorized:** Authentication token expired
   - Check if `/api/auth/me` is working
   - Verify cookies are being sent

3. **404 Not Found:** API endpoint doesn't exist
   - Verify backend has these endpoints implemented
   - Check backend logs for routing errors

4. **500 Server Error:** Backend error
   - Check backend logs
   - API will use fallback values

## Network Tab

In browser DevTools → Network tab, you should see:
1. `GET /api/v1/dashboard/stats` - Status should be 200 (or error)
2. `GET /api/v1/search/meetings/category/recent?page=0&size=5` - Status should be 200 (or error)
3. `GET /api/v1/dashboard/upcoming-meetings?limit=5` - Status should be 200 (or error)

If any of these show "pending" or take longer than 15 seconds, that's the issue.


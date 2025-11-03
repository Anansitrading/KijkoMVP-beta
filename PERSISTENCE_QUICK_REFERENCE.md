# Persistence Implementation Quick Reference

## 🎯 Core Principles

1. **Offline-First:** IndexedDB is the source of truth for UI, PostgreSQL is the source of truth for sync
2. **Optimistic Updates:** Show changes immediately, sync in background
3. **Progressive Loading:** Metadata first, full data on-demand
4. **Resilient Sync:** Exponential backoff with max 5 retries

## 📦 Package Structure

```
packages/
├── storage/
│   ├── indexeddb/
│   │   └── db.ts                    # Dexie.js schema
│   └── asset-sync-service.ts        # Upload/download/sync logic
└── stores/
    └── ai/
        └── chat-store.ts            # Zustand store with persist
```

## 🗄️ IndexedDB Tables (Dexie.js)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `chatSessions` | Chat session metadata | `id`, `projectId`, `updatedAt` |
| `chatMessages` | Message cache | `id`, `sessionId`, `createdAt` |
| `assets` | Asset files + metadata | `id`, `projectId`, `file` (Blob), `uploadStatus` |
| `assetMetadata` | Asset metadata only | `id`, `projectId`, `storageUrl` |
| `syncQueue` | Upload retry queue | `id`, `assetId`, `status`, `nextRetryAt` |
| `projects` | Project metadata | `id`, `name`, `thumbnailAssetId` |

## 🌐 API Routes

### Chat
- `GET /api/chat/sessions` - List sessions
- `POST /api/chat/sessions` - Create session
- `POST /api/chat/messages/batch` - Batch sync messages
- `GET /api/chat/[sessionId]/messages` - Get messages

### Assets
- `POST /api/assets/presign` - Get presigned URLs (upload/download)
- `POST /api/assets` - Register uploaded asset metadata
- `GET /api/assets/[id]` - Get asset metadata
- `GET /api/assets/[id]/download-url` - Get presigned download URL

### Sync
- `GET /api/sync/init` - Comprehensive login sync

## 🔄 Key Flows

### 1. User Login
```typescript
// 1. Call sync endpoint
const syncData = await fetch('/api/sync/init').then(r => r.json());

// 2. Cache in IndexedDB
for (const session of syncData.sessions) {
  await db.chatSessions.put({ ...session, syncedAt: new Date() });
}

// 3. Update Zustand
useChatStore.setState({ sessions: syncData.sessions });
```

### 2. Send Chat Message
```typescript
// 1. Optimistic update with temp ID
const tempId = `temp-${Date.now()}`;
const message = { id: tempId, content, role: 'user', createdAt: new Date() };

// 2. Update UI immediately
useChatStore.setState(state => ({
  messages: [...state.messages, message]
}));

// 3. Save to IndexedDB
await db.chatMessages.add(message);

// 4. Batch sync after 2 seconds
setTimeout(() => syncMessages(), 2000);
```

### 3. Upload Asset
```typescript
// 1. Save to IndexedDB immediately
const assetId = crypto.randomUUID();
await db.assets.add({
  id: assetId,
  file: file, // Blob
  uploadStatus: 'pending'
});

// 2. Queue for upload
await db.syncQueue.add({
  id: crypto.randomUUID(),
  type: 'upload',
  assetId,
  status: 'pending',
  attempts: 0
});

// 3. Background worker processes queue
// - Get presigned URL from /api/assets/presign
// - Upload to Garage
// - Save metadata to PostgreSQL
// - Update IndexedDB status
```

### 4. Download Asset
```typescript
// 1. Check IndexedDB cache
const cached = await db.assets.get(assetId);
if (cached?.file) return cached.file;

// 2. Get presigned URL
const { url } = await fetch('/api/assets/presign', {
  method: 'POST',
  body: JSON.stringify({ assetIds: [assetId], operation: 'download' })
}).then(r => r.json());

// 3. Download and cache
const blob = await fetch(url).then(r => r.blob());
await db.assets.put({ id: assetId, file: blob });
```

## ⚙️ Configuration

### Environment Variables
```bash
# Railway PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/db

# Railway Garage (S3)
GARAGE_ENDPOINT=https://garage.railway.app
GARAGE_ACCESS_KEY=your_access_key
GARAGE_SECRET_KEY=your_secret_key
GARAGE_BUCKET=user-assets
```

### Dexie.js Setup
```typescript
import Dexie from 'dexie';

class AppDatabase extends Dexie {
  constructor() {
    super('kijko_db');
    this.version(1).stores({
      chatSessions: 'id, projectId, updatedAt',
      chatMessages: 'id, sessionId, [sessionId+createdAt]',
      assets: 'id, projectId, uploadStatus',
      syncQueue: 'id, status, [status+nextRetryAt]'
    });
  }
}

export const db = new AppDatabase();
```

### Zustand Persist
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useChatStore = create(
  persist(
    (set, get) => ({ /* store logic */ }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        sessions: state.sessions.slice(0, 10) // Only last 10
      })
    }
  )
);
```

## 🔧 Retry Logic

### Exponential Backoff
```typescript
const backoffMs = Math.pow(2, attempts) * 1000;
// attempts=0: 1s
// attempts=1: 2s
// attempts=2: 4s
// attempts=3: 8s
// attempts=4: 16s
// attempts=5: 32s (max)
```

### Sync Worker
```typescript
setInterval(async () => {
  const pending = await db.syncQueue
    .where('status').equals('pending')
    .and(item => item.nextRetryAt <= new Date())
    .toArray();
  
  for (const item of pending) {
    await processUpload(item.assetId);
  }
}, 30000); // Check every 30 seconds
```

## 📊 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Login sync | <2s | Metadata only, no assets |
| Message send | <100ms | Optimistic update |
| Message sync | <500ms | Batch of 15 messages |
| Asset upload start | <200ms | Save to IndexedDB |
| Presigned URL generation | <100ms | Server-side |
| Asset download | Varies | Depends on file size |

## 🚨 Error Handling

### Upload Failures
```typescript
if (attempts >= 5) {
  // Max retries reached
  await db.assets.update(assetId, {
    uploadStatus: 'failed',
    error: 'Upload failed after 5 attempts. Please try again manually.'
  });
  
  // Show UI notification
  toast.error('Upload failed. Click to retry.');
}
```

### Offline Detection
```typescript
window.addEventListener('online', () => {
  // Resume sync
  syncService.startSyncWorker();
});

window.addEventListener('offline', () => {
  // Pause sync, show offline indicator
  syncService.stopSyncWorker();
  toast.info('You are offline. Changes will sync when online.');
});
```

## 🧹 Cleanup

### Remove Uploaded Blobs
```typescript
// After successful upload, remove blob to save space
await db.assets.update(assetId, {
  file: undefined, // Remove blob
  uploadStatus: 'completed',
  storageUrl: cloudUrl // Keep URL for re-download
});
```

### Evict Old Assets
```typescript
// When quota is near limit
const oldAssets = await db.assets
  .orderBy('syncedAt')
  .limit(10)
  .toArray();

for (const asset of oldAssets) {
  await db.assets.update(asset.id, { file: undefined });
}
```

## 📚 References

- **Dexie.js Docs:** https://dexie.org/docs/
- **Zustand Persist:** https://docs.pmnd.rs/zustand/integrations/persisting-store-data
- **AWS S3 Presigned URLs:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- **IndexedDB Best Practices:** https://web.dev/indexeddb-best-practices/

## ✅ Implementation Checklist

- [ ] Set up Dexie.js database schema
- [ ] Create Next.js API routes for chat, assets, sync
- [ ] Implement AssetSyncService with retry logic
- [ ] Create Zustand store with persist middleware
- [ ] Add background sync worker
- [ ] Implement presigned URL generation
- [ ] Add offline/online event listeners
- [ ] Create UI indicators for sync status
- [ ] Test with slow network conditions
- [ ] Test offline functionality
- [ ] Monitor IndexedDB quota usage
- [ ] Add Sentry error tracking
- [ ] Add Langfuse tracing for sync operations


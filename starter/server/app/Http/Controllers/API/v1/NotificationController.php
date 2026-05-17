<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\StudySyncNotification;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $paginated = StudySyncNotification::where('user_id', $request->user()->id)
            ->latest()
            ->paginate(max(1, min((int) $request->input('limit', 20), 100)));

        return $this->success('Notifications retrieved successfully', [
            'notifications' => NotificationResource::collection($paginated->items()),
            'unread_count' => StudySyncNotification::where('user_id', $request->user()->id)->whereNull('read_at')->count(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = StudySyncNotification::where('user_id', $request->user()->id)->findOrFail($id);
        $notification->update(['read_at' => now()]);

        return $this->success('Notification marked as read', [
            'notification' => new NotificationResource($notification),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        StudySyncNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->success('Notifications marked as read', null);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $notification = StudySyncNotification::where('user_id', $request->user()->id)
            ->whereNotNull('read_at')
            ->findOrFail($id);
        $notification->delete();

        return $this->success('Notification cleared', null);
    }

    public function clearRead(Request $request): JsonResponse
    {
        StudySyncNotification::where('user_id', $request->user()->id)
            ->whereNotNull('read_at')
            ->delete();

        return $this->success('Read notifications cleared', null);
    }
}

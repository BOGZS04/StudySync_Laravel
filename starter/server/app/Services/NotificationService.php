<?php

namespace App\Services;

use App\Events\NewNotification;
use App\Models\StudySyncNotification;

class NotificationService
{
    public function create(int $userId, string $type, string $title, string $message, ?array $data = null): StudySyncNotification
    {
        $notification = StudySyncNotification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
        ]);

        broadcast(new NewNotification($notification))->toOthers();

        return $notification;
    }
}

<?php

namespace App\Http\Controllers\API\v1;

use App\Events\NewMessage;
use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\MessageRequest;
use App\Http\Resources\MessageResource;
use App\Http\Resources\UserResource;
use App\Models\ClassRoom;
use App\Models\Message;
use App\Models\User;
use App\Services\NotificationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    use ApiResponse;

    public function conversations(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $messages = Message::query()
            ->with(['sender', 'receiver'])
            ->where('sender_id', $userId)
            ->orWhere('receiver_id', $userId)
            ->latest()
            ->get()
            ->unique(fn (Message $message) => $message->sender_id === $userId ? $message->receiver_id : $message->sender_id)
            ->values();

        return $this->success('Conversations retrieved successfully', [
            'conversations' => MessageResource::collection($messages),
        ]);
    }

    public function contacts(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role->value === 'student') {
            $contacts = User::query()
                ->whereHas('teachingClasses.students', fn ($q) => $q
                    ->where('users.id', $user->id)
                    ->where('class_student.status', EnrollmentStatus::ACTIVE->value))
                ->orderBy('name')
                ->get();
        } elseif ($user->role->value === 'teacher') {
            $classIds = ClassRoom::where('teacher_id', $user->id)->pluck('id');

            $contacts = User::query()
                ->whereHas('enrolledClasses', fn ($q) => $q
                    ->whereIn('classes.id', $classIds)
                    ->where('class_student.status', EnrollmentStatus::ACTIVE->value))
                ->orderBy('name')
                ->get();
        } else {
            $contacts = collect();
        }

        return $this->success('Message contacts retrieved successfully', [
            'contacts' => UserResource::collection($contacts),
        ]);
    }

    public function thread(Request $request, string $userId): JsonResponse
    {
        $currentUserId = $request->user()->id;

        if (!$this->canMessage($request->user(), (int) $userId)) {
            return $this->error('You are not allowed to message this user.', 403);
        }

        $messages = Message::query()
            ->with(['sender', 'receiver'])
            ->where(fn ($q) => $q->where('sender_id', $currentUserId)->where('receiver_id', $userId))
            ->orWhere(fn ($q) => $q->where('sender_id', $userId)->where('receiver_id', $currentUserId))
            ->orderBy('created_at')
            ->get();

        Message::where('sender_id', $userId)
            ->where('receiver_id', $currentUserId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->success('Messages retrieved successfully', [
            'messages' => MessageResource::collection($messages),
        ]);
    }

    public function send(MessageRequest $request, NotificationService $notifications): JsonResponse
    {
        if (!$this->canMessage($request->user(), (int) $request->validated('receiver_id'))) {
            return $this->error('You are not allowed to message this user.', 403);
        }

        $message = Message::create([
            ...$request->validated(),
            'sender_id' => $request->user()->id,
        ]);
        $message->load(['sender', 'receiver']);

        $notifications->create(
            $message->receiver_id,
            'message.received',
            'New message received',
            "{$message->sender->name} sent you a message.",
            ['message_id' => $message->id, 'sender_id' => $message->sender_id]
        );

        broadcast(new NewMessage($message))->toOthers();

        return $this->success('Message sent successfully', [
            'message' => new MessageResource($message),
        ], 201);
    }

    private function canMessage(User $sender, int $receiverId): bool
    {
        if ($sender->id === $receiverId) {
            return false;
        }

        if ($sender->role->value === 'student') {
            return User::whereKey($receiverId)
                ->whereHas('teachingClasses.students', fn ($q) => $q
                    ->where('users.id', $sender->id)
                    ->where('class_student.status', EnrollmentStatus::ACTIVE->value))
                ->exists();
        }

        if ($sender->role->value === 'teacher') {
            $classIds = ClassRoom::where('teacher_id', $sender->id)->pluck('id');

            return User::whereKey($receiverId)
                ->whereHas('enrolledClasses', fn ($q) => $q
                    ->whereIn('classes.id', $classIds)
                    ->where('class_student.status', EnrollmentStatus::ACTIVE->value))
                ->exists();
        }

        return false;
    }
}

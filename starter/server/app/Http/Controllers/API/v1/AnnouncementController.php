<?php

namespace App\Http\Controllers\API\v1;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\AnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Jobs\NotifyStudentsAnnouncementJob;
use App\Models\Announcement;
use App\Models\ClassRoom;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Announcement::query()->with(['classRoom', 'teacher']);

        if ($user->role->value === 'teacher') {
            $query->where('teacher_id', $user->id);
        } elseif ($user->role->value === 'student') {
            $query->whereHas('classRoom.students', fn ($q) => $q
                ->where('users.id', $user->id)
                ->where('class_student.status', EnrollmentStatus::ACTIVE->value));
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }

        $paginated = $query->latest()->paginate($this->perPage($request));

        return $this->success('Announcements retrieved successfully', [
            'announcements' => AnnouncementResource::collection($paginated->items()),
            'meta' => $this->meta($paginated),
        ]);
    }

    public function store(AnnouncementRequest $request): JsonResponse
    {
        $classRoom = ClassRoom::where('teacher_id', $request->user()->id)->findOrFail($request->validated('class_id'));
        $validated = $request->validated();
        $validated['teacher_id'] = $request->user()->id;
        $validated['class_id'] = $classRoom->id;
        $validated['content'] = strip_tags($validated['content'], '<p><br><strong><em><ul><ol><li><a>');

        if ($request->hasFile('file')) {
            $validated['file_path'] = $request->file('file')->store('announcements', 'public');
        }
        unset($validated['file']);

        $announcement = Announcement::create($validated);
        NotifyStudentsAnnouncementJob::dispatchSync($announcement->id);

        return $this->success('Announcement created successfully', [
            'announcement' => new AnnouncementResource($announcement->load(['classRoom', 'teacher'])),
        ], 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        Announcement::where('teacher_id', $request->user()->id)->findOrFail($id)->delete();

        return $this->success('Announcement deleted successfully', null);
    }

    private function perPage(Request $request): int
    {
        return max(1, min((int) $request->input('limit', 10), 100));
    }

    private function meta($paginated): array
    {
        return [
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ];
    }
}

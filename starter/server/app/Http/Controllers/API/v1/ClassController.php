<?php

namespace App\Http\Controllers\API\v1;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ClassRoomRequest;
use App\Http\Resources\ClassRoomResource;
use App\Http\Resources\UserResource;
use App\Models\ClassRoom;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = ClassRoom::query()
            ->with('teacher')
            ->withCount([
                'students' => fn ($q) => $q->where('class_student.status', EnrollmentStatus::ACTIVE->value),
                'assignments',
            ]);

        if ($user->role->value === 'teacher') {
            $query->where('teacher_id', $user->id);
        } elseif ($user->role->value === 'student') {
            $query->whereHas('students', fn ($q) => $q
                ->where('users.id', $user->id)
                ->where('class_student.status', EnrollmentStatus::ACTIVE->value));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('subject', 'like', "%{$search}%")
                ->orWhere('section', 'like', "%{$search}%"));
        }

        $paginated = $query->latest()->paginate($this->perPage($request));

        return $this->success('Classes retrieved successfully', [
            'classes' => ClassRoomResource::collection($paginated->items()),
            'meta' => $this->meta($paginated),
        ]);
    }

    public function store(ClassRoomRequest $request): JsonResponse
    {
        $classRoom = ClassRoom::create([
            ...$request->validated(),
            'teacher_id' => $request->user()->id,
        ]);

        return $this->success('Class created successfully', [
            'class' => new ClassRoomResource($classRoom->load('teacher')),
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $classRoom = $this->visibleClass($request, $id);

        return $this->success('Class retrieved successfully', [
            'class' => new ClassRoomResource($classRoom
                ->load('teacher')
                ->loadCount([
                    'students' => fn ($q) => $q->where('class_student.status', EnrollmentStatus::ACTIVE->value),
                    'assignments',
                ])),
        ]);
    }

    public function update(ClassRoomRequest $request, string $id): JsonResponse
    {
        $classRoom = ClassRoom::where('teacher_id', $request->user()->id)->findOrFail($id);
        $classRoom->update($request->validated());

        return $this->success('Class updated successfully', [
            'class' => new ClassRoomResource($classRoom->load('teacher')),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $classRoom = ClassRoom::where('teacher_id', $request->user()->id)->findOrFail($id);
        $classRoom->delete();

        return $this->success('Class deleted successfully', null);
    }

    public function join(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'class_code' => ['required', 'string', 'size:6'],
        ]);

        $classRoom = ClassRoom::where('class_code', strtoupper($validated['class_code']))
            ->where('is_active', true)
            ->firstOrFail();

        $classRoom->students()->syncWithoutDetaching([
            $request->user()->id => [
                'joined_at' => now(),
                'status' => EnrollmentStatus::ACTIVE->value,
            ],
        ]);

        return $this->success('Class joined successfully', [
            'class' => new ClassRoomResource($classRoom->load('teacher')),
        ]);
    }

    public function students(Request $request, string $classId): JsonResponse
    {
        $classRoom = ClassRoom::where('teacher_id', $request->user()->id)->findOrFail($classId);
        $students = $classRoom->students()
            ->wherePivot('status', EnrollmentStatus::ACTIVE->value)
            ->latest('class_student.joined_at')
            ->paginate($this->perPage($request));

        return $this->success('Students retrieved successfully', [
            'students' => UserResource::collection($students->items()),
            'meta' => $this->meta($students),
        ]);
    }

    public function removeStudent(Request $request, string $classId, string $studentId): JsonResponse
    {
        $classRoom = ClassRoom::where('teacher_id', $request->user()->id)->findOrFail($classId);
        $classRoom->students()->updateExistingPivot($studentId, [
            'status' => EnrollmentStatus::REMOVED->value,
        ]);

        return $this->success('Student removed successfully', null);
    }

    private function visibleClass(Request $request, string $id): ClassRoom
    {
        $user = $request->user();

        return ClassRoom::query()
            ->when($user->role->value === 'teacher', fn ($q) => $q->where('teacher_id', $user->id))
            ->when($user->role->value === 'student', fn ($q) => $q->whereHas('students', fn ($studentQuery) => $studentQuery
                ->where('users.id', $user->id)
                ->where('class_student.status', EnrollmentStatus::ACTIVE->value)))
            ->findOrFail($id);
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

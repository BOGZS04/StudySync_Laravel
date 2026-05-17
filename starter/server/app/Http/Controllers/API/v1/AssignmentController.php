<?php

namespace App\Http\Controllers\API\v1;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\AssignmentRequest;
use App\Http\Resources\AssignmentResource;
use App\Jobs\NotifyStudentsAssignmentJob;
use App\Models\Assignment;
use App\Models\ClassRoom;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = $this->visibleAssignments($request)
            ->with([
                'classRoom',
                'submissions' => fn ($q) => $q->where('student_id', $request->user()->id),
            ])
            ->withCount('submissions');

        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->input('search') . '%');
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }

        $paginated = $query->latest('due_date')->paginate($this->perPage($request));

        return $this->success('Assignments retrieved successfully', [
            'assignments' => AssignmentResource::collection($paginated->items()),
            'meta' => $this->meta($paginated),
        ]);
    }

    public function byClass(Request $request, string $classId): JsonResponse
    {
        $request->merge(['class_id' => $classId]);

        return $this->index($request);
    }

    public function store(AssignmentRequest $request): JsonResponse
    {
        $classRoom = ClassRoom::where('teacher_id', $request->user()->id)->findOrFail($request->validated('class_id'));
        $validated = $request->validated();
        $validated['teacher_id'] = $request->user()->id;
        $validated['class_id'] = $classRoom->id;

        if ($request->hasFile('file')) {
            $validated['file_path'] = $request->file('file')->store('assignments', 'public');
        }

        unset($validated['file']);

        $assignment = Assignment::create($validated);
        NotifyStudentsAssignmentJob::dispatchSync($assignment->id);

        return $this->success('Assignment created successfully', [
            'assignment' => new AssignmentResource($assignment->load('classRoom')),
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $assignment = $this->visibleAssignments($request)
            ->with(['classRoom', 'submissions' => fn ($q) => $q->where('student_id', $request->user()->id)])
            ->findOrFail($id);

        return $this->success('Assignment retrieved successfully', [
            'assignment' => new AssignmentResource($assignment),
        ]);
    }

    public function update(AssignmentRequest $request, string $id): JsonResponse
    {
        $assignment = Assignment::where('teacher_id', $request->user()->id)->findOrFail($id);
        ClassRoom::where('teacher_id', $request->user()->id)->findOrFail($request->validated('class_id'));

        $validated = $request->validated();
        if ($request->hasFile('file')) {
            $validated['file_path'] = $request->file('file')->store('assignments', 'public');
        }
        unset($validated['file']);

        $assignment->update($validated);

        return $this->success('Assignment updated successfully', [
            'assignment' => new AssignmentResource($assignment->load('classRoom')),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $assignment = Assignment::where('teacher_id', $request->user()->id)->findOrFail($id);
        $assignment->delete();

        return $this->success('Assignment deleted successfully', null);
    }

    private function visibleAssignments(Request $request)
    {
        $user = $request->user();

        return Assignment::query()
            ->when($user->role->value === 'teacher', fn ($q) => $q->where('teacher_id', $user->id))
            ->when($user->role->value === 'student', fn ($q) => $q->whereHas('classRoom.students', fn ($studentQuery) => $studentQuery
                ->where('users.id', $user->id)
                ->where('class_student.status', EnrollmentStatus::ACTIVE->value)));
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

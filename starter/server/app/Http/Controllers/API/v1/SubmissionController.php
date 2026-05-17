<?php

namespace App\Http\Controllers\API\v1;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewSubmissionRequest;
use App\Http\Requests\SubmissionRequest;
use App\Http\Resources\SubmissionResource;
use App\Jobs\NotifyStudentReviewJob;
use App\Jobs\NotifyTeacherSubmissionJob;
use App\Models\Assignment;
use App\Models\Submission;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SubmissionController extends Controller
{
    use ApiResponse;

    public function index(Request $request, string $id): JsonResponse
    {
        $assignment = Assignment::where('teacher_id', $request->user()->id)->findOrFail($id);
        $paginated = $assignment->submissions()
            ->with(['student', 'assignment'])
            ->latest('submitted_at')
            ->paginate($this->perPage($request));

        return $this->success('Submissions retrieved successfully', [
            'submissions' => SubmissionResource::collection($paginated->items()),
            'meta' => $this->meta($paginated),
        ]);
    }

    public function mySubmissions(Request $request): JsonResponse
    {
        $paginated = Submission::query()
            ->with(['assignment'])
            ->where('student_id', $request->user()->id)
            ->latest('submitted_at')
            ->paginate($this->perPage($request));

        return $this->success('Submissions retrieved successfully', [
            'submissions' => SubmissionResource::collection($paginated->items()),
            'meta' => $this->meta($paginated),
        ]);
    }

    public function store(SubmissionRequest $request, string $id): JsonResponse
    {
        $assignment = Assignment::whereHas('classRoom.students', fn ($q) => $q
            ->where('users.id', $request->user()->id)
            ->where('class_student.status', EnrollmentStatus::ACTIVE->value))
            ->findOrFail($id);

        if (!$assignment->allow_late_submission && now()->greaterThan($assignment->due_date)) {
            return $this->error('Late submissions are not allowed for this assignment.', 422);
        }

        $validated = $request->validated();
        if ($request->hasFile('file')) {
            $validated['file_path'] = $request->file('file')->store('submissions');
        }
        unset($validated['file']);

        $submission = Submission::updateOrCreate(
            [
                'assignment_id' => $assignment->id,
                'student_id' => $request->user()->id,
            ],
            [
                ...$validated,
                'status' => 'submitted',
                'submitted_at' => now(),
            ]
        );
        NotifyTeacherSubmissionJob::dispatchSync($submission->id);

        return $this->success('Submission saved successfully', [
            'submission' => new SubmissionResource($submission->load(['assignment', 'student'])),
        ], 201);
    }

    public function review(ReviewSubmissionRequest $request, string $id): JsonResponse
    {
        $submission = Submission::whereHas('assignment', fn ($q) => $q->where('teacher_id', $request->user()->id))
            ->with(['assignment', 'student'])
            ->findOrFail($id);

        $submission->update($request->validated());
        NotifyStudentReviewJob::dispatchSync($submission->id);

        return $this->success('Submission reviewed successfully', [
            'submission' => new SubmissionResource($submission),
        ]);
    }

    public function download(Request $request, string $id): StreamedResponse|JsonResponse
    {
        $submission = Submission::with('assignment')->findOrFail($id);
        $user = $request->user();
        $isOwner = $submission->student_id === $user->id;
        $isTeacher = $submission->assignment?->teacher_id === $user->id;

        if (!$isOwner && !$isTeacher) {
            return $this->error('You are not allowed to download this submission.', 403);
        }

        if (!$submission->file_path || !Storage::exists($submission->file_path)) {
            return $this->error('Submission file not found.', 404);
        }

        return Storage::download($submission->file_path);
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

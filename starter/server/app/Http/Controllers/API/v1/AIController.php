<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateProgressSummaryJob;
use App\Jobs\GenerateStudySuggestionsJob;
use App\Models\Assignment;
use App\Models\ClassRoom;
use App\Models\Submission;
use App\Services\AIService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AIController extends Controller
{
    use ApiResponse;

    public function studySuggestions(Request $request, AIService $ai): JsonResponse
    {
        GenerateStudySuggestionsJob::dispatch($request->user()->id);

        return $this->success('Study suggestions generated successfully', [
            'suggestions' => $ai->studySuggestions($request->user()),
            'refresh_queued' => true,
        ]);
    }

    public function progressSummary(Request $request, AIService $ai): JsonResponse
    {
        $validated = $request->validate([
            'class_id' => ['required', 'integer', 'exists:classes,id'],
        ]);

        $classRoom = ClassRoom::where('teacher_id', $request->user()->id)->findOrFail($validated['class_id']);
        $assignmentIds = Assignment::where('class_id', $classRoom->id)->pluck('id');

        $analytics = [
            'class' => [
                'name' => $classRoom->name,
                'subject' => $classRoom->subject,
                'section' => $classRoom->section,
            ],
            'assignment_count' => $assignmentIds->count(),
            'submission_count' => Submission::whereIn('assignment_id', $assignmentIds)->count(),
            'graded_count' => Submission::whereIn('assignment_id', $assignmentIds)->where('status', 'graded')->count(),
            'late_submission_count' => Submission::whereIn('assignment_id', $assignmentIds)
                ->with('assignment:id,due_date')
                ->get(['id', 'assignment_id', 'submitted_at'])
                ->filter(fn (Submission $submission) => $submission->submitted_at && $submission->assignment && $submission->submitted_at->greaterThan($submission->assignment->due_date))
                ->count(),
        ];

        GenerateProgressSummaryJob::dispatch($classRoom->id, $analytics);

        return $this->success('Progress summary generated successfully', [
            'summary' => $ai->progressSummary($classRoom->id, $analytics),
            'analytics' => $analytics,
            'refresh_queued' => true,
        ]);
    }
}

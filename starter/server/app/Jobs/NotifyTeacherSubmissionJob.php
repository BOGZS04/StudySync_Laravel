<?php

namespace App\Jobs;

use App\Models\Submission;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyTeacherSubmissionJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $submissionId)
    {
    }

    public function handle(NotificationService $notifications): void
    {
        $submission = Submission::with(['assignment.teacher', 'student'])->find($this->submissionId);
        if (!$submission) {
            return;
        }

        $notifications->create(
            $submission->assignment->teacher_id,
            'submission.received',
            'New submission received',
            "{$submission->student->name} submitted {$submission->assignment->title}.",
            ['submission_id' => $submission->id, 'assignment_id' => $submission->assignment_id]
        );
    }
}

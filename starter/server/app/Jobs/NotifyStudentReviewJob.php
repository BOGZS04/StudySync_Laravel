<?php

namespace App\Jobs;

use App\Models\Submission;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyStudentReviewJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $submissionId)
    {
    }

    public function handle(NotificationService $notifications): void
    {
        $submission = Submission::with(['assignment', 'student'])->find($this->submissionId);
        if (!$submission) {
            return;
        }

        $notifications->create(
            $submission->student_id,
            'submission.reviewed',
            'Submission reviewed',
            "Your submission for {$submission->assignment->title} is now {$submission->status->value}.",
            ['submission_id' => $submission->id, 'assignment_id' => $submission->assignment_id]
        );
    }
}

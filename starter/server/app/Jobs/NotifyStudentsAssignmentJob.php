<?php

namespace App\Jobs;

use App\Enums\EnrollmentStatus;
use App\Models\Assignment;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyStudentsAssignmentJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $assignmentId)
    {
    }

    public function handle(NotificationService $notifications): void
    {
        $assignment = Assignment::with('classRoom.students')->find($this->assignmentId);
        if (!$assignment) {
            return;
        }

        $assignment->classRoom->students()
            ->wherePivot('status', EnrollmentStatus::ACTIVE->value)
            ->each(fn ($student) => $notifications->create(
                $student->id,
                'assignment.created',
                'New assignment posted',
                "{$assignment->title} is now available in {$assignment->classRoom->name}.",
                ['assignment_id' => $assignment->id, 'class_id' => $assignment->class_id]
            ));
    }
}

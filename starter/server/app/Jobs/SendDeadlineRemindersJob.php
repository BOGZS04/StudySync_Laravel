<?php

namespace App\Jobs;

use App\Enums\EnrollmentStatus;
use App\Mail\DeadlineReminderMail;
use App\Models\Assignment;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendDeadlineRemindersJob implements ShouldQueue
{
    use Queueable;

    public function handle(NotificationService $notifications): void
    {
        Assignment::with('classRoom.students')
            ->whereBetween('due_date', [now(), now()->addDay()])
            ->chunkById(50, function ($assignments) use ($notifications): void {
                foreach ($assignments as $assignment) {
                    $assignment->classRoom->students()
                        ->wherePivot('status', EnrollmentStatus::ACTIVE->value)
                        ->each(function ($student) use ($assignment, $notifications): void {
                            $notifications->create(
                                $student->id,
                                'deadline.reminder',
                                'Deadline coming up',
                                "{$assignment->title} is due soon.",
                                ['assignment_id' => $assignment->id]
                            );
                            Mail::to($student->email)->queue(new DeadlineReminderMail($student, $assignment));
                        });
                }
            });
    }
}

<?php

namespace App\Jobs;

use App\Enums\EnrollmentStatus;
use App\Models\Announcement;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyStudentsAnnouncementJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $announcementId)
    {
    }

    public function handle(NotificationService $notifications): void
    {
        $announcement = Announcement::with('classRoom.students')->find($this->announcementId);
        if (!$announcement) {
            return;
        }

        $announcement->classRoom->students()
            ->wherePivot('status', EnrollmentStatus::ACTIVE->value)
            ->each(fn ($student) => $notifications->create(
                $student->id,
                'announcement.created',
                'New class announcement',
                "{$announcement->title} was posted in {$announcement->classRoom->name}.",
                ['announcement_id' => $announcement->id, 'class_id' => $announcement->class_id]
            ));
    }
}

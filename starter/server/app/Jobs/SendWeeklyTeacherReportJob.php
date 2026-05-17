<?php

namespace App\Jobs;

use App\Enums\UserRole;
use App\Mail\WeeklyTeacherReportMail;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendWeeklyTeacherReportJob implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        User::where('role', UserRole::TEACHER->value)->chunkById(50, function ($teachers): void {
            foreach ($teachers as $teacher) {
                $submissionCount = Submission::whereHas('assignment', fn ($q) => $q->where('teacher_id', $teacher->id))
                    ->where('created_at', '>=', now()->subWeek())
                    ->count();

                Mail::to($teacher->email)->queue(new WeeklyTeacherReportMail($teacher, [
                    "{$submissionCount} submissions received this week.",
                ]));
            }
        });
    }
}

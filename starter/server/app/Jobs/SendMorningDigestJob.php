<?php

namespace App\Jobs;

use App\Enums\UserRole;
use App\Mail\MorningDigestMail;
use App\Models\Assignment;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendMorningDigestJob implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        User::where('role', UserRole::STUDENT->value)->chunkById(50, function ($students): void {
            foreach ($students as $student) {
                $dueCount = Assignment::whereHas('classRoom.students', fn ($q) => $q->where('users.id', $student->id))
                    ->whereBetween('due_date', [now(), now()->addDays(7)])
                    ->count();

                Mail::to($student->email)->queue(new MorningDigestMail($student, [
                    "{$dueCount} assignments due in the next 7 days.",
                ]));
            }
        });
    }
}

<?php

namespace App\Jobs;

use App\Models\StudySchedule;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AutoArchiveOldSchedulesJob implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        StudySchedule::whereDate('date', '<', now()->subMonth()->toDateString())
            ->where('is_completed', false)
            ->update(['is_completed' => true]);
    }
}

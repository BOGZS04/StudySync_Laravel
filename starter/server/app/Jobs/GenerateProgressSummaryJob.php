<?php

namespace App\Jobs;

use App\Services\AIService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GenerateProgressSummaryJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $classId, public array $analytics)
    {
    }

    public function handle(AIService $ai): void
    {
        $ai->refreshProgressSummary($this->classId, $this->analytics);
    }
}

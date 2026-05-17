<?php

use App\Jobs\AutoArchiveOldSchedulesJob;
use App\Jobs\SendDeadlineRemindersJob;
use App\Jobs\SendMorningDigestJob;
use App\Jobs\SendWeeklyTeacherReportJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new SendDeadlineRemindersJob())->dailyAt('06:00');
Schedule::job(new SendMorningDigestJob())->dailyAt('07:00');
Schedule::job(new SendWeeklyTeacherReportJob())->weeklyOn(1, '08:00');
Schedule::job(new AutoArchiveOldSchedulesJob())->daily();

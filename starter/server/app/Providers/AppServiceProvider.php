<?php

namespace App\Providers;

use App\Models\Announcement;
use App\Models\Assignment;
use App\Models\ClassRoom;
use App\Models\Submission;
use App\Models\User;
use App\Observers\AuditLogObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        User::observe(AuditLogObserver::class);
        ClassRoom::observe(AuditLogObserver::class);
        Assignment::observe(AuditLogObserver::class);
        Submission::observe(AuditLogObserver::class);
        Announcement::observe(AuditLogObserver::class);
    }
}
